"""
SRV Repository Layer
Handles all Store Receipt Voucher (SRV) database operations.
"""

import logging
import sqlite3
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

class SRVRepository:
    def __init__(self, db: sqlite3.Connection):
        self.db = db

    def get_stats(self) -> dict[str, Any]:
        """Get SRV Statistics"""
        query = """
            SELECT 
                (SELECT COUNT(*) FROM srvs) as total_srvs,
                (SELECT COALESCE(SUM(rcd_qty), 0) FROM srv_items) as total_received,
                (SELECT COALESCE(SUM(rej_qty), 0) FROM srv_items) as total_rejected,
                (SELECT COUNT(DISTINCT s.srv_number) 
                 FROM srvs s 
                 LEFT JOIN purchase_orders po ON s.po_number = po.po_number 
                 WHERE po.po_number IS NULL) as missing_po_count
        """
        result = self.db.execute(query).fetchone()
        return dict(result)

    def list_paginated(
        self,
        po_number: str | None = None,
        limit: int = 100,
        offset: int = 0,
        sort_by: str = "s.srv_date",
        order: str = "DESC",
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        """List SRVs with pagination and optional filters"""
        where_clauses = ["1=1"]
        params = []

        if po_number:
            where_clauses.append("CAST(s.po_number AS TEXT) = CAST(? AS TEXT)")
            params.append(str(po_number))
        
        if search:
            where_clauses.append("(s.srv_number LIKE ? OR s.po_number LIKE ? OR s.invoice_number LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        # Sanitize order to prevent SQL injection
        order = order.upper() if order.upper() in ("ASC", "DESC") else "DESC"
        
        # Note: sort_by and order must be interpolated directly (SQLite doesn't support
        # parameters for column names or sort direction in ORDER BY)
        query = f"""
            SELECT 
                s.srv_number,
                s.srv_date,
                s.po_number,
                CASE WHEN po.po_number IS NOT NULL THEN 1 ELSE 0 END as po_found,
                COALESCE(SUM(si.rcd_qty), 0) as total_received_qty,
                COALESCE(SUM(si.rej_qty), 0) as total_rejected_qty,
                COALESCE(SUM(si.accepted_qty), 0) as total_accepted_qty,
                COALESCE(SUM(si.ord_qty), 0) as total_ord_qty,
                COALESCE(SUM(si.challan_qty), 0) as total_challan_qty,
                s.created_at
            FROM srvs s
            LEFT JOIN srv_items si ON s.srv_number = si.srv_number
            LEFT JOIN purchase_orders po ON s.po_number = po.po_number
            WHERE {" AND ".join(where_clauses)}
            GROUP BY s.srv_number
            ORDER BY {sort_by} {order}
            LIMIT ? OFFSET ?
        """
        rows = self.db.execute(query, [*params, limit, offset]).fetchall()
        return [dict(row) for row in rows]

    def get_count_paginated(
        self,
        po_number: str | None = None,
        search: str | None = None,
    ) -> int:
        """Get total count of SRVs for pagination"""
        where_clauses = ["1=1"]
        params = []

        if po_number:
            where_clauses.append("po_number = ?")
            params.append(po_number)
        
        if search:
            where_clauses.append("(srv_number LIKE ? OR po_number LIKE ? OR invoice_number LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        where_clause = " AND ".join(where_clauses)
        query = f"SELECT COUNT(DISTINCT srv_number) FROM srvs WHERE {where_clause}"
        return self.db.execute(query, params).fetchone()[0]

    def get_filtered_stats(
        self,
        po_number: str | None = None,
        search: str | None = None,
    ) -> dict[str, Any]:
        """Get aggregated stats for filtered SRVs (for KPI cards)"""
        where_clauses = ["1=1"]
        params = []

        if po_number:
            where_clauses.append("CAST(po_number AS TEXT) = CAST(? AS TEXT)")
            params.append(str(po_number))
        
        if search:
            where_clauses.append("(srv_number LIKE ? OR po_number LIKE ? OR invoice_number LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        where_clause = " AND ".join(where_clauses)
        
        # Get matching SRV numbers first, then aggregate items
        query = f"""
            SELECT 
                COALESCE(SUM(si.rcd_qty), 0) as total_received,
                COALESCE(SUM(si.rej_qty), 0) as total_rejected,
                COALESCE(SUM(si.accepted_qty), 0) as total_accepted
            FROM srv_items si
            WHERE si.srv_number IN (
                SELECT srv_number FROM srvs WHERE {where_clause}
            )
        """
        row = self.db.execute(query, params).fetchone()
        return {
            "total_received": float(row[0]) if row and row[0] else 0.0,
            "total_rejected": float(row[1]) if row and row[1] else 0.0,
            "total_accepted": float(row[2]) if row and row[2] else 0.0,
        }

    def get_header(self, srv_number: str) -> dict[str, Any] | None:
        """Get SRV Header details"""
        query = """
            SELECT 
                srv_number, srv_date, po_number, invoice_number,
                srv_status, po_found, warning_message, is_active,
                created_at, updated_at
            FROM srvs 
            WHERE srv_number = ?
        """
        row = self.db.execute(query, (srv_number,)).fetchone()
        return dict(row) if row else None

    def get_items(self, srv_number: str) -> list[dict[str, Any]]:
        """Get all items for an SRV"""
        query = """
            SELECT si.*, poi.material_description, poi.material_code, poi.mtrl_cat, poi.drg_no, poi.po_rate
            FROM srv_items si
            LEFT JOIN purchase_order_items poi ON si.po_number = poi.po_number AND si.po_item_no = poi.po_item_no
            WHERE si.srv_number = ? 
            ORDER BY si.po_item_no, si.lot_no
        """
        rows = self.db.execute(query, (srv_number,)).fetchall()
        return [dict(row) for row in rows]

    def check_exists(self, srv_number: str) -> bool:
        """Check if SRV exists"""
        row = self.db.execute("SELECT 1 FROM srvs WHERE srv_number = ?", (srv_number,)).fetchone()
        return row is not None

    def delete(self, srv_number: str):
        """Delete SRV and its items"""
        self.db.execute("DELETE FROM srv_items WHERE srv_number = ?", (srv_number,))
        self.db.execute("DELETE FROM srvs WHERE srv_number = ?", (srv_number,))

    def insert_header(self, srv_data: dict[str, Any]):
        """Insert SRV Header"""
        query = """
            INSERT INTO srvs (
                srv_number, srv_date, po_number, invoice_number,
                is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 1, ?, ?)
        """
        self.db.execute(query, (
            srv_data["srv_number"],
            srv_data["srv_date"],
            srv_data["po_number"],
            srv_data.get("invoice_number"),
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))

    def insert_items(self, items: list[tuple]):
        """Batch insert SRV items"""
        query = """
            INSERT INTO srv_items (
                id, srv_number, po_number, po_item_no, lot_no,
                srv_item_no, rev_no,
                rcd_qty, rej_qty, accepted_qty, ord_qty, challan_qty, unit,
                challan_no, challan_date, invoice_no, invoice_date,
                div_code, pmir_no, finance_date, cnote_no, cnote_date, remarks, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        self.db.executemany(query, items)

    def get_dc_by_number(self, dc_number: str) -> dict[str, Any] | None:
        """Fetch DC details for FY validation"""
        query = "SELECT dc_number, dc_date FROM delivery_challans WHERE dc_number = ?"
        row = self.db.execute(query, (dc_number,)).fetchone()
        return dict(row) if row else None
