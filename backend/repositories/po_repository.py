"""
PO Repository Layer
Handles all Purchase Order (PO) database operations.
"""

import logging
import sqlite3
from typing import Any

logger = logging.getLogger(__name__)

class PORepository:
    def __init__(self, db: sqlite3.Connection):
        self.db = db

    def get_stats(self) -> dict[str, Any]:
        """Calculate PO Dashboard Statistics"""
        # Open Orders (Active)
        open_count = self.db.execute("SELECT COUNT(*) FROM purchase_orders WHERE po_status = 'Active'").fetchone()[0]

        # Pending Approval (Based on 'New' status)
        pending_count = self.db.execute("SELECT COUNT(*) FROM purchase_orders WHERE po_status = 'New' OR po_status IS NULL").fetchone()[0]

        # Total Value YTD
        value_row = self.db.execute("SELECT SUM(po_value) FROM purchase_orders").fetchone()
        total_value = value_row[0] if value_row and value_row[0] else 0.0

        # Aggregates from items
        aggregates = self.db.execute("""
            SELECT 
                SUM(dsp_qty) as total_dsp,
                SUM(rej_qty) as total_rej
            FROM purchase_order_items
        """).fetchone()
        
        return {
            "open_count": open_count,
            "pending_count": pending_count,
            "total_value": total_value,
            "total_dsp": aggregates[0] if aggregates and aggregates[0] else 0.0,
            "total_rej": aggregates[1] if aggregates and aggregates[1] else 0.0,
        }

    def list_paginated(
        self,
        limit: int = 10,
        offset: int = 0,
        sort_by: str = "po.created_at",
        order: str = "DESC",
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        """List POs with pagination and optional search"""
        where_clause = ""
        params = []
        if search:
            where_clause = " WHERE po.po_number LIKE ? OR po.supplier_name LIKE ?"
            params.extend([f"%{search}%", f"%{search}%"])

        # Sanitize order to prevent SQL injection
        order = order.upper() if order.upper() in ("ASC", "DESC") else "DESC"
        
        # Note: sort_by and order must be interpolated directly (SQLite doesn't support
        # parameters for column names or sort direction in ORDER BY)
        query = f"""
            SELECT 
                po.po_number, po.po_date, po.supplier_name, po.po_value, 
                po.amend_no, po.po_status, po.financial_year, po.created_at,
                COALESCE(SUM(poi.ord_qty), 0) as total_ord,
                COALESCE(SUM(poi.dsp_qty), 0) as total_dsp,
                COALESCE(SUM(poi.rcd_qty), 0) as total_rcd,
                COALESCE(SUM(poi.rej_qty), 0) as total_rej,
                COALESCE(SUM(poi.pending_qty), 0) as total_pending,
                COUNT(poi.id) as total_items,
                (SELECT COUNT(DISTINCT dc_number) FROM delivery_challans WHERE CAST(po_number AS TEXT) = CAST(po.po_number AS TEXT)) as linked_dc_count,
                (SELECT COUNT(DISTINCT srv_number) FROM srvs WHERE CAST(po_number AS TEXT) = CAST(po.po_number AS TEXT)) as linked_srv_count,
                (
                    SELECT COUNT(DISTINCT inv.invoice_number) 
                    FROM gst_invoices inv 
                    JOIN delivery_challans dc ON inv.dc_number = dc.dc_number 
                    WHERE CAST(dc.po_number AS TEXT) = CAST(po.po_number AS TEXT)
                ) as linked_invoice_count
            FROM purchase_orders po
            LEFT JOIN purchase_order_items poi ON po.po_number = poi.po_number
            {where_clause}
            GROUP BY po.po_number
            ORDER BY {sort_by} {order}
            LIMIT ? OFFSET ?
        """
        rows = self.db.execute(query, [*params, limit, offset]).fetchall()
        return [dict(row) for row in rows]

    def get_count_paginated(self, search: str | None = None) -> int:
        """Get total count of POs for pagination"""
        where_clause = ""
        params = []
        if search:
            where_clause = " WHERE po_number LIKE ? OR supplier_name LIKE ?"
            params.extend([f"%{search}%", f"%{search}%"])

        query = f"SELECT COUNT(*) FROM purchase_orders {where_clause}"
        return self.db.execute(query, params).fetchone()[0]

    def get_filtered_stats(self, search: str | None = None) -> dict[str, Any]:
        """Get aggregated stats for filtered POs (for KPI cards)"""
        where_clause = ""
        params = []
        if search:
            where_clause = " WHERE po_number LIKE ? OR supplier_name LIKE ?"
            params.extend([f"%{search}%", f"%{search}%"])

        # Total PO Value (from headers, not items)
        value_query = f"SELECT COALESCE(SUM(po_value), 0) FROM purchase_orders {where_clause}"
        total_value = self.db.execute(value_query, params).fetchone()[0] or 0.0

        # Item-level aggregations (quantities from items of matching POs)
        item_where = ""
        item_params = []
        if search:
            item_where = """WHERE poi.po_number IN (
                SELECT po_number FROM purchase_orders 
                WHERE po_number LIKE ? OR supplier_name LIKE ?
            )"""
            item_params.extend([f"%{search}%", f"%{search}%"])

        query = f"""
            SELECT 
                COALESCE(SUM(poi.dsp_qty), 0) as total_shipped,
                COALESCE(SUM(poi.rej_qty), 0) as total_rejected,
                COALESCE(SUM(poi.rcd_qty), 0) as total_received
            FROM purchase_order_items poi
            {item_where}
        """
        row = self.db.execute(query, item_params).fetchone()
        return {
            "total_value": float(total_value),
            "total_shipped": float(row[0]) if row and row[0] else 0.0,
            "total_rejected": float(row[1]) if row and row[1] else 0.0,
            "total_received": float(row[2]) if row and row[2] else 0.0,
        }

    def get_header(self, po_number: str) -> dict[str, Any] | None:
        """Get PO Header details"""
        query = """
            SELECT 
                po_number, po_date, buyer_id, supplier_name,
                supplier_gstin, supplier_code, supplier_phone,
                supplier_fax, supplier_email, department_no,
                enquiry_no, enquiry_date, quotation_ref,
                quotation_date, rc_no, order_type, po_status,
                tin_no, ecc_no, mpct_no, po_value, fob_value,
                ex_rate, currency, net_po_value, amend_no,
                amend_1_date, amend_2_date, remarks,
                issuer_name, issuer_designation, issuer_phone,
                inspection_by, inspection_at, financial_year,
                our_ref, consignee_name, consignee_address, created_at, updated_at,
                (SELECT COUNT(DISTINCT dc_number) FROM delivery_challans WHERE CAST(po_number AS TEXT) = CAST(? AS TEXT)) as linked_dc_count,
                (SELECT COUNT(DISTINCT srv_number) FROM srvs WHERE CAST(po_number AS TEXT) = CAST(? AS TEXT)) as linked_srv_count,
                (
                    SELECT COUNT(DISTINCT inv.invoice_number) 
                    FROM gst_invoices inv 
                    JOIN delivery_challans dc ON inv.dc_number = dc.dc_number 
                    WHERE CAST(dc.po_number AS TEXT) = CAST(? AS TEXT)
                ) as linked_invoice_count
            FROM purchase_orders 
            WHERE po_number = ?
        """
        row = self.db.execute(query, (po_number, po_number, po_number, po_number)).fetchone()
        return dict(row) if row else None

    def get_aggregate_data(self, po_number: str) -> dict[str, Any] | None:
        """Get aggregated live quantities for status calculation"""
        query = """
            SELECT 
                SUM(poi.ord_qty) as total_ord,
                (
                    SELECT SUM(dci.dsp_qty) 
                    FROM delivery_challan_items dci 
                    JOIN purchase_order_items poi2 ON dci.po_item_id = poi2.id 
                    WHERE poi2.po_number = ?
                ) as total_dsp,
                (
                    SELECT SUM(si.rcd_qty) 
                    FROM srv_items si 
                    WHERE si.po_number = ?
                ) as total_rcd,
                (
                    SELECT SUM(si.rej_qty) 
                    FROM srv_items si 
                    WHERE si.po_number = ?
                ) as total_rej
            FROM purchase_order_items poi
            WHERE poi.po_number = ?
        """
        row = self.db.execute(query, (po_number, po_number, po_number, po_number)).fetchone()
        return dict(row) if row else None

    def get_items(self, po_number: str) -> list[dict[str, Any]]:
        """Get items for a PO"""
        query = """
            SELECT id, po_item_no, material_code, material_description, drg_no, mtrl_cat,
                   unit, po_rate, ord_qty, dsp_qty, rcd_qty, rej_qty, hsn_code
            FROM purchase_order_items
            WHERE po_number = ?
            ORDER BY po_item_no
        """
        rows = self.db.execute(query, (po_number,)).fetchall()
        return [dict(row) for row in rows]

    def get_deliveries_for_items(self, item_ids: list[str]) -> list[dict[str, Any]]:
        """Batch fetch delivery schedules for multiple items"""
        if not item_ids:
            return []
        placeholders = ",".join(["?"] * len(item_ids))
        query = f"""
            SELECT 
                id, po_item_id, lot_no, ord_qty, dsp_qty, rcd_qty, 
                dest_code, dely_date, entry_allow_date, remarks
            FROM purchase_order_deliveries 
            WHERE po_item_id IN ({placeholders}) 
            ORDER BY lot_no
        """
        rows = self.db.execute(query, item_ids).fetchall()
        return [dict(row) for row in rows]

    def get_po_context(self, po_number: str) -> dict[str, Any] | None:
        """Fetch PO Context for auto-fill"""
        query = """
            SELECT po.po_number, po.po_date, po.supplier_name, po.supplier_gstin,
                   b.name as buyer_name, b.gstin as buyer_gstin, b.address as buyer_address
            FROM purchase_orders po
            LEFT JOIN buyers b ON po.buyer_id = b.id
            WHERE po.po_number = ?
        """
        row = self.db.execute(query, (po_number,)).fetchone()
        return dict(row) if row else None

    def check_has_dc(self, po_number: str) -> dict[str, Any] | None:
        """Check if PO has linked DCs"""
        query = "SELECT dc_number, dc_date FROM delivery_challans WHERE po_number = ? LIMIT 1"
        row = self.db.execute(query, (po_number,)).fetchone()
        return dict(row) if row else None
