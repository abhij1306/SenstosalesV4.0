import logging
import sqlite3
from typing import Any

logger = logging.getLogger(__name__)

class DCRepository:
    def __init__(self, db: sqlite3.Connection):
        self.db = db

    def get_dispatchable_items(self, po_number: str) -> list[dict[str, Any]]:
        """Fetch dispatchable items for a PO."""
        query = """
            SELECT 
                poi.id as po_item_id,
                poi.po_item_no,
                poi.material_code,
                poi.material_description as description,
                poi.drg_no,
                poi.mtrl_cat,
                poi.unit,
                poi.po_rate,
                poi.ord_qty,
                poi.dsp_qty,
                poi.rcd_qty
            FROM purchase_order_items poi
            WHERE poi.po_number = ?
            ORDER BY poi.po_item_no
        """
        return [dict(row) for row in self.db.execute(query, (po_number,)).fetchall()]

    def get_po_header(self, po_number: str) -> dict[str, Any] | None:
        """Fetch PO header information."""
        query = """
            SELECT po_number, po_date, amend_no, department_no, our_ref, supplier_name, supplier_gstin, supplier_phone
            FROM purchase_orders WHERE po_number = ?
        """
        row = self.db.execute(query, (po_number,)).fetchone()
        return dict(row) if row else None

    def get_settings(self, keys: list[str]) -> dict[str, str]:
        """Fetch multiple settings by keys."""
        if not keys:
            return {}
        placeholders = ", ".join(["?"] * len(keys))
        query = f"SELECT key, value FROM settings WHERE key IN ({placeholders})"
        rows = self.db.execute(query, keys).fetchall()
        return {row["key"]: row["value"] for row in rows}

    def get_dc_stats(self) -> dict[str, Any]:
        """Fetch summary statistics for Delivery Challans."""
        total_challans = self.db.execute("SELECT COUNT(*) FROM delivery_challans").fetchone()[0]
        completed = self.db.execute("""
            SELECT COUNT(DISTINCT dc_number) FROM gst_invoices WHERE dc_number IS NOT NULL
        """).fetchone()[0]
        total_value = self.db.execute("""
            SELECT COALESCE(SUM(dci.dsp_qty * poi.po_rate), 0)
            FROM delivery_challan_items dci
            JOIN purchase_order_items poi ON dci.po_item_id = poi.id
        """).fetchone()[0]
        
        return {
            "total_challans": total_challans,
            "completed": completed,
            "total_value": total_value
        }

    def count_dcs(self, where_stmt: str, params: list[Any]) -> int:
        """Count DCs matching criteria."""
        query = f"SELECT COUNT(DISTINCT dc.dc_number) FROM delivery_challans dc {where_stmt}"
        return self.db.execute(query, params).fetchone()[0]

    def get_filtered_stats(self, where_stmt: str, params: list[Any]) -> dict[str, Any]:
        """Get aggregated stats for filtered DCs (for KPI cards)"""
        # Build the FROM/JOIN part to match list query
        query = f"""
            SELECT 
                COALESCE(SUM(dc_values.total_value), 0) as total_value,
                COALESCE(SUM(dc_values.total_dsp_qty), 0) as total_dispatched,
                COALESCE(SUM(dc_values.total_rcd_qty), 0) as total_received
            FROM (
                SELECT 
                    dc.dc_number,
                    COALESCE((
                        SELECT SUM(dci.dsp_qty * poi.po_rate)
                        FROM delivery_challan_items dci
                        JOIN purchase_order_items poi ON dci.po_item_id = poi.id
                        WHERE dci.dc_number = dc.dc_number
                    ), 0) as total_value,
                    COALESCE((
                        SELECT SUM(dci.dsp_qty)
                        FROM delivery_challan_items dci
                        WHERE dci.dc_number = dc.dc_number
                    ), 0) as total_dsp_qty,
                    COALESCE((
                        SELECT SUM(si.rcd_qty)
                        FROM srv_items si
                        WHERE si.challan_no = dc.dc_number
                    ), 0) as total_rcd_qty
                FROM delivery_challans dc
                {where_stmt}
            ) as dc_values
        """
        row = self.db.execute(query, params).fetchone()
        return {
            "total_value": float(row[0]) if row and row[0] else 0.0,
            "total_dispatched": float(row[1]) if row and row[1] else 0.0,
            "total_received": float(row[2]) if row and row[2] else 0.0,
        }

    def list_dcs_paginated(
        self, 
        where_stmt: str, 
        params: list[Any], 
        sort_col: str, 
        order: str, 
        limit: int, 
        offset: int
    ) -> list[dict[str, Any]]:
        """List DCs with complex aggregation and pagination."""
        query = f"""
            SELECT 
                dc.dc_number, 
                dc.dc_date, 
                dc.po_number, 
                dc.consignee_name, 
                dc.created_at,
                (SELECT i.invoice_number FROM gst_invoices i WHERE i.dc_number = dc.dc_number LIMIT 1) as invoice_number,
                COALESCE((
                    SELECT SUM(dci.dsp_qty * poi.po_rate)
                    FROM delivery_challan_items dci
                    JOIN purchase_order_items poi ON dci.po_item_id = poi.id
                    WHERE dci.dc_number = dc.dc_number
                ), 0) as total_value,
                COALESCE((
                    SELECT SUM(poi.ord_qty)
                    FROM delivery_challan_items dci
                    JOIN purchase_order_items poi ON dci.po_item_id = poi.id
                    WHERE dci.dc_number = dc.dc_number
                ), 0) as total_ord_qty,
                COALESCE((
                    SELECT SUM(dci.dsp_qty)
                    FROM delivery_challan_items dci
                    WHERE dci.dc_number = dc.dc_number
                ), 0) as total_dsp_qty,
                (
                    SELECT COALESCE(SUM(si.rcd_qty), 0)
                    FROM srv_items si
                    WHERE si.challan_no = dc.dc_number
                ) as total_rcd_qty,
                (
                    SELECT COALESCE(SUM(all_dci.dsp_qty), 0)
                    FROM delivery_challan_items all_dci
                    JOIN delivery_challan_items sub_dci ON all_dci.po_item_id = sub_dci.po_item_id
                    WHERE sub_dci.dc_number = dc.dc_number
                ) as global_dsp_qty,
                (SELECT COUNT(*) FROM delivery_challan_items dci WHERE dci.dc_number = dc.dc_number) as total_items
            FROM delivery_challans dc
            {where_stmt}
            ORDER BY {sort_col} {order}
            LIMIT ? OFFSET ?
        """
        return [dict(row) for row in self.db.execute(query, [*params, limit, offset]).fetchall()]

    def get_dc_row(self, dc_number: str) -> dict[str, Any] | None:
        """Fetch a single DC header with basic PO info and total value."""
        query = """
            SELECT 
                dc.*, 
                po.po_date, 
                po.department_no,
                COALESCE((
                    SELECT SUM(dci.dsp_qty * poi.po_rate)
                    FROM delivery_challan_items dci
                    JOIN purchase_order_items poi ON dci.po_item_id = poi.id
                    WHERE dci.dc_number = dc.dc_number
                ), 0) as total_value
            FROM delivery_challans dc
            LEFT JOIN purchase_orders po ON dc.po_number = po.po_number
            WHERE dc.dc_number = ?
        """
        row = self.db.execute(query, (dc_number,)).fetchone()
        return dict(row) if row else None

    def get_default_buyer_address(self) -> str | None:
        """Fetch the address of the default buyer."""
        query = "SELECT address FROM buyers WHERE is_default = 1"
        row = self.db.execute(query).fetchone()
        return row["address"] if row else None

    def get_dc_aggregation(self, dc_number: str) -> dict[str, Any] | None:
        """Fetch aggregated quantities for a specific DC."""
        query = """
            SELECT 
                (SELECT SUM(poi.ord_qty) FROM delivery_challan_items dci JOIN purchase_order_items poi ON dci.po_item_id = poi.id WHERE dci.dc_number = ?) as total_ord,
                (SELECT SUM(dsp_qty) FROM delivery_challan_items WHERE dc_number = ?) as total_del,
                (
                    SELECT COALESCE(SUM(si.rcd_qty), 0)
                    FROM srv_items si
                    JOIN srvs s ON si.srv_number = s.srv_number
                    WHERE s.is_active = 1 
                      AND si.challan_no = ?
                ) as total_recd
        """
        row = self.db.execute(query, (dc_number, dc_number, dc_number)).fetchone()
        return dict(row) if row else None

    def get_dc_items(self, dc_number: str) -> list[dict[str, Any]]:
        """Fetch all items related to a specific DC."""
        query = """
            SELECT 
                dci.id,
                dci.dsp_qty as dsp_qty,
                dci.hsn_code,
                dci.hsn_rate,
                dci.lot_no,
                dci.po_item_id,
                poi.po_item_no,
                poi.material_code,
                poi.material_description,
                poi.drg_no,
                poi.mtrl_cat,
                poi.unit,
                poi.po_rate,
                poi.ord_qty,
                COALESCE(pod.ord_qty, poi.ord_qty) as lot_ordered_qty,
                COALESCE(pod.dsp_qty, 0) as lot_delivered_qty,
                COALESCE(pod.rcd_qty, 0) as rcd_qty,
                poi.dsp_qty as item_total_dispatched
            FROM delivery_challan_items dci
            JOIN purchase_order_items poi ON dci.po_item_id = poi.id
            LEFT JOIN purchase_order_deliveries pod ON dci.po_item_id = pod.po_item_id AND dci.lot_no = pod.lot_no
            WHERE dci.dc_number = ?
            ORDER BY poi.po_item_no ASC
        """
        return [dict(row) for row in self.db.execute(query, (dc_number,)).fetchall()]
