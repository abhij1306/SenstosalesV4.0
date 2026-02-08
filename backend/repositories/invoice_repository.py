import sqlite3
from typing import Any


class InvoiceRepository:
    def __init__(self, db: sqlite3.Connection):
        self.db = db

    def get_stats(self) -> dict[str, Any]:
        """Get Invoice Page Statistics"""
        total_row = self.db.execute("SELECT SUM(total_invoice_value) FROM gst_invoices").fetchone()
        total_invoiced = total_row[0] if total_row and total_row[0] else 0.0

        gst_row = self.db.execute("SELECT SUM(cgst + sgst + igst) FROM gst_invoices").fetchone()
        gst_collected = gst_row[0] if gst_row and gst_row[0] else 0.0

        return {
            "total_invoiced": total_invoiced,
            "gst_collected": gst_collected,
        }

    def list_paginated(
        self,
        po: str | None = None,
        dc: str | None = None,
        limit: int = 100,
        offset: int = 0,
        sort_by: str = "created_at",
        order: str = "desc",
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        """List all Invoices (Paginated) with joined status data"""
        
        # Map frontend keys to DB columns
        sort_map = {
            "invoice_number": "inv.invoice_number",
            "invoice_date": "inv.invoice_date",
            "po_numbers": "inv.po_numbers",
            "dc_number": "inv.dc_number",
            "total_invoice_value": "inv.total_invoice_value",
            "created_at": "inv.created_at",
            "total_items": "total_items",
            "total_ord_qty": "total_ord_qty",
            "total_dsp_qty": "total_dsp_qty",
            "total_rcd_qty": "total_rcd_qty"
        }
        
        db_sort_col = sort_map.get(sort_by, "inv.created_at")
        db_order = "DESC" if order.lower() == "desc" else "ASC"

        # Base query components
        base_query = """
            FROM gst_invoices inv
            LEFT JOIN (
                SELECT dc_number, SUM(dsp_qty) as total_dsp_qty
                FROM delivery_challan_items
                GROUP BY dc_number
            ) dci_agg ON inv.dc_number = dci_agg.dc_number
            LEFT JOIN (
                SELECT challan_no, SUM(rcd_qty) as total_rcd_qty
                FROM srv_items
                GROUP BY challan_no
            ) srv_agg ON inv.dc_number = srv_agg.challan_no
        """
        
        where_clauses = ["1=1"]
        params = []
        
        if po:
            # Note: po_numbers is a comma-separated string in gst_invoices
            where_clauses.append("inv.po_numbers LIKE ?")
            params.append(f"%{po}%")

        if dc:
            where_clauses.append("inv.dc_number = ?")
            params.append(dc)
            
        if search:
            where_clauses.append("(inv.invoice_number LIKE ? OR inv.po_numbers LIKE ? OR inv.dc_number LIKE ? OR inv.buyer_name LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%"])
            
        where_stmt = " WHERE " + " AND ".join(where_clauses)

        query = f"""
            SELECT 
                inv.invoice_number, inv.invoice_date, inv.po_numbers, inv.dc_number,
                inv.buyer_gstin as customer_gstin, inv.taxable_value, inv.total_invoice_value, inv.created_at,
                (SELECT COUNT(*) FROM gst_invoice_items WHERE invoice_number = inv.invoice_number) as total_items,
                (SELECT COALESCE(SUM(quantity), 0) FROM gst_invoice_items WHERE invoice_number = inv.invoice_number) as total_ord_qty,
                COALESCE(dci_agg.total_dsp_qty, 0) as total_dsp_qty,
                COALESCE(srv_agg.total_rcd_qty, 0) as total_rcd_qty
            {base_query}
            {where_stmt}
            GROUP BY inv.invoice_number
            ORDER BY {db_sort_col} {db_order}
            LIMIT ? OFFSET ?
        """
        
        rows = self.db.execute(query, [*params, limit, offset]).fetchall()
        return [dict(row) for row in rows]

    def get_count_paginated(
        self,
        po: str | None = None,
        dc: str | None = None,
        search: str | None = None,
    ) -> int:
        """Get total count for pagination"""
        where_clauses = ["1=1"]
        params = []
        
        if po:
            where_clauses.append("po_numbers LIKE ?")
            params.append(f"%{po}%")
        if dc:
            where_clauses.append("dc_number = ?")
            params.append(dc)
        if search:
            where_clauses.append("(invoice_number LIKE ? OR po_numbers LIKE ? OR dc_number LIKE ? OR buyer_name LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%"])
            
        where_stmt = " WHERE " + " AND ".join(where_clauses)
        count_query = f"SELECT COUNT(DISTINCT invoice_number) FROM gst_invoices {where_stmt}"
        return self.db.execute(count_query, params).fetchone()[0]

    def get_filtered_stats(
        self,
        po: str | None = None,
        dc: str | None = None,
        search: str | None = None,
    ) -> dict[str, Any]:
        """Get aggregated stats for filtered Invoices (for KPI cards)"""
        where_clauses = ["1=1"]
        params = []
        
        if po:
            where_clauses.append("po_numbers LIKE ?")
            params.append(f"%{po}%")
        if dc:
            where_clauses.append("dc_number = ?")
            params.append(dc)
        if search:
            where_clauses.append("(invoice_number LIKE ? OR po_numbers LIKE ? OR dc_number LIKE ? OR buyer_name LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%"])
            
        where_stmt = " WHERE " + " AND ".join(where_clauses)
        
        query = f"""
            SELECT 
                COALESCE(SUM(total_invoice_value), 0) as total_value,
                COALESCE(SUM(taxable_value), 0) as total_taxable
            FROM gst_invoices
            {where_stmt}
        """
        row = self.db.execute(query, params).fetchone()
        return {
            "total_value": float(row[0]) if row and row[0] else 0.0,
            "total_taxable": float(row[1]) if row and row[1] else 0.0,
        }

    def get_detail(self, invoice_number: str) -> dict[str, Any] | None:
        """Get Invoice Header Details"""
        row = self.db.execute(
            """
            SELECT 
                invoice_number, invoice_date, financial_year, dc_number,
                po_numbers, buyer_name, buyer_gstin, buyer_address,
                buyer_state, buyer_state_code, place_of_supply,
                buyers_order_date, taxable_value, cgst, sgst, igst,
                total_invoice_value, gemc_number, gemc_date,
                mode_of_payment, payment_terms, despatch_doc_no,
                srv_no, srv_date, vehicle_no, lr_no, transporter,
                destination, terms_of_delivery, remarks,
                supplier_name, supplier_address, supplier_gstin, supplier_contact,
                created_at, updated_at
            FROM gst_invoices 
            WHERE invoice_number = ?
            """,
            (invoice_number,),
        ).fetchone()
        return dict(row) if row else None

    def get_items(self, invoice_number: str) -> list[dict[str, Any]]:
        """Get Invoice Items"""
        rows = self.db.execute(
            """
            SELECT 
                po_item_no, description, material_code, drg_no, mtrl_cat,
                hsn_sac, unit, rate, quantity, taxable_value,
                cgst_amount, sgst_amount, igst_amount, total_amount
            FROM gst_invoice_items
            WHERE invoice_number = ?
            ORDER BY id
            """,
            (invoice_number,),
        ).fetchall()
        return [dict(row) for row in rows]

    def check_exists(self, invoice_number: str, fy: str | None = None) -> bool:
        """Check if invoice number exists (optionally within FY)"""
        query = "SELECT 1 FROM gst_invoices WHERE invoice_number = ?"
        params = [invoice_number]
        if fy:
            query += " AND financial_year = ?"
            params.append(fy)
            
        return self.db.execute(query, params).fetchone() is not None

    def insert_header(self, data: dict[str, Any]):
        """Insert Invoice Header"""
        cols = ", ".join(data.keys())
        placeholders = ", ".join(["?" for _ in data])
        query = f"INSERT INTO gst_invoices ({cols}) VALUES ({placeholders})"
        self.db.execute(query, list(data.values()))

    def insert_items(self, items: list[dict[str, Any]]):
        """Insert Invoice Items"""
        if not items:
            return
        cols = ", ".join(items[0].keys())
        placeholders = ", ".join(["?" for _ in items[0]])
        query = f"INSERT INTO gst_invoice_items ({cols}) VALUES ({placeholders})"
        self.db.executemany(query, [list(i.values()) for i in items])

    def update_header(self, invoice_number: str, data: dict[str, Any]):
        """Update Invoice Header (Metadata)"""
        if not data:
            return
        set_clause = ", ".join([f"{k} = ?" for k in data])
        params = list(data.values())
        params.append(invoice_number)
        query = f"UPDATE gst_invoices SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE invoice_number = ?"
        self.db.execute(query, params)

    def delete(self, invoice_number: str):
        """Delete Invoice and its items"""
        self.db.execute("DELETE FROM gst_invoice_items WHERE invoice_number = ?", (invoice_number,))
        self.db.execute("DELETE FROM gst_invoices WHERE invoice_number = ?", (invoice_number,))

    def get_dc_items_for_invoice(self, dc_number: str) -> list[dict[str, Any]]:
        """Fetch DC items and associated PO info for invoicing"""
        rows = self.db.execute(
            """
            SELECT 
                dci.po_item_id,
                dci.lot_no,
                dci.dsp_qty,
                poi.po_rate,
                poi.material_description as description,
                poi.material_code,
                poi.drg_no,
                poi.mtrl_cat,
                poi.hsn_code,
                poi.po_item_no,
                poi.unit
            FROM delivery_challan_items dci
            JOIN purchase_order_items poi ON dci.po_item_id = poi.id
            WHERE dci.dc_number = ?
            """,
            (dc_number,),
        ).fetchall()
        return [dict(row) for row in rows]

    def get_dc_header_for_invoice(self, dc_number: str) -> dict[str, Any] | None:
        """Fetch DC header for invoicing"""
        row = self.db.execute(
            """
            SELECT 
                consignee_name, consignee_gstin, consignee_address, vehicle_no, 
                transporter, lr_no, po_number, dc_date, remarks,
                supplier_name, supplier_address, supplier_gstin, supplier_contact
            FROM delivery_challans 
            WHERE dc_number = ?
            """,
            (dc_number,),
        ).fetchone()
        return dict(row) if row else None

    def get_po_date(self, po_number: str) -> str | None:
        """Fetch PO Date"""
        row = self.db.execute("SELECT po_date FROM purchase_orders WHERE po_number = ?", (po_number,)).fetchone()
        return row[0] if row else None

    def check_dc_received(self, dc_number: str) -> str | None:
        """Check if any SRV items reference this DC"""
        row = self.db.execute(
            "SELECT srv_number FROM srv_items WHERE challan_no = ? LIMIT 1",
            (dc_number,)
        ).fetchone()
        return row[0] if row else None

    def get_item_reconciliation(self, po_item_id: str) -> dict[str, Any]:
        """Fetch reconciliation metrics for a PO item"""
        row = self.db.execute(
            "SELECT ord_qty, dsp_qty, rcd_qty FROM purchase_order_items WHERE id = ?",
            (po_item_id,)
        ).fetchone()
        return dict(row) if row else {}

    def get_aggregate_status_data(self, invoice_number: str) -> dict[str, Any]:
        """Fetch aggregate quantities for status calculation"""
        row = self.db.execute(
            """
            SELECT 
                COALESCE(SUM(inv_item.quantity), 0) as total_ord,
                (SELECT COALESCE(SUM(dsp_qty), 0) FROM delivery_challan_items WHERE dc_number = i.dc_number) as total_del,
                (
                    SELECT COALESCE(SUM(si.rcd_qty), 0)
                    FROM srv_items si
                    WHERE si.challan_no = i.dc_number
                ) as total_recd
            FROM gst_invoices i
            LEFT JOIN gst_invoice_items inv_item ON i.invoice_number = inv_item.invoice_number
            WHERE i.invoice_number = ?
            GROUP BY i.invoice_number
            """,
            (invoice_number,),
        ).fetchone()
        return dict(row) if row else {}
