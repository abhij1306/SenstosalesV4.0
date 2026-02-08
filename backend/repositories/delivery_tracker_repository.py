"""
Delivery Tracker Repository Layer
Handles database queries for tracking deliveries by date ranges and overdue status.
Uses FIFO (First-In-First-Out) logic to allocate SRV received quantities to lots.
"""

import datetime
import logging
import sqlite3
from typing import Any

logger = logging.getLogger(__name__)


class DeliveryTrackerRepository:
    def __init__(self, db: sqlite3.Connection):
        self.db = db

    def _get_fifo_ctes(self) -> str:
        """Common CTEs for item-level SRV totals and lot-wise running totals."""
        return """
            WITH item_srv AS (
                SELECT po_number, po_item_no, SUM(rcd_qty) as total_srv_rcd
                FROM srv_items
                GROUP BY po_number, po_item_no
            ),
            lot_ranked AS (
                SELECT 
                    pod.id as lot_id,
                    pod.po_item_id,
                    pod.ord_qty,
                    pod.rcd_qty as pod_rcd,
                    pod.dsp_qty,
                    pod.dely_date,
                    SUM(pod.ord_qty) OVER (
                        PARTITION BY pod.po_item_id 
                        ORDER BY pod.dely_date, pod.id
                    ) as cum_ord,
                    SUM(pod.ord_qty) OVER (
                        PARTITION BY pod.po_item_id 
                        ORDER BY pod.dely_date, pod.id
                        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
                    ) as prev_cum_ord
                FROM purchase_order_deliveries pod
            )
        """

    def _get_effective_rcd_sql(self) -> str:
        """CASE expression to calculate effective received quantity for a lot."""
        return """
            CASE 
                WHEN srv.total_srv_rcd IS NULL THEN COALESCE(pod.rcd_qty, 0)
                ELSE MAX(
                    COALESCE(pod.rcd_qty, 0),
                    CASE 
                        WHEN srv.total_srv_rcd >= ranked.cum_ord THEN pod.ord_qty
                        WHEN srv.total_srv_rcd <= COALESCE(ranked.prev_cum_ord, 0) THEN 0
                        ELSE srv.total_srv_rcd - COALESCE(ranked.prev_cum_ord, 0)
                    END
                )
            END
        """

    def get_alert_counts(self) -> dict[str, Any]:
        """Get counts for top-bar alerts badge: overdue + due within 7 days."""
        today = self._get_today()
        
        query = f"""
            {self._get_fifo_ctes()}
            SELECT 
                SUM(CASE WHEN date(pod.dely_date) < '{today}' AND (COALESCE(pod.dsp_qty, 0) < pod.ord_qty) AND ({self._get_effective_rcd_sql()} < pod.ord_qty) THEN 1 ELSE 0 END) as overdue_count,
                SUM(CASE WHEN date(pod.dely_date) >= '{today}' AND date(pod.dely_date) <= date('{today}', '+7 days') AND (COALESCE(pod.dsp_qty, 0) < pod.ord_qty) AND ({self._get_effective_rcd_sql()} < pod.ord_qty) THEN 1 ELSE 0 END) as due_soon_count
            FROM purchase_order_deliveries pod
            JOIN purchase_order_items poi ON pod.po_item_id = poi.id
            JOIN purchase_orders po ON poi.po_number = po.po_number
            JOIN lot_ranked ranked ON pod.id = ranked.lot_id
            LEFT JOIN item_srv srv ON srv.po_number = po.po_number AND srv.po_item_no = poi.po_item_no
            WHERE pod.dely_date IS NOT NULL
        """
        row = self.db.execute(query).fetchone()
        overdue_count = row[0] or 0
        due_soon_count = row[1] or 0
        
        return {
            "overdue_count": overdue_count,
            "due_soon_count": due_soon_count,
            "total_alerts": overdue_count + due_soon_count,
        }

    def get_overdue_stats(self) -> dict[str, Any]:
        """Get overdue delivery stats for dashboard KPI card."""
        today = self._get_today()
        
        query = f"""
            {self._get_fifo_ctes()}
            SELECT 
                COUNT(*) as overdue_count,
                COALESCE(SUM(pod.ord_qty * poi.po_rate), 0) as overdue_value
            FROM purchase_order_deliveries pod
            JOIN purchase_order_items poi ON pod.po_item_id = poi.id
            JOIN purchase_orders po ON poi.po_number = po.po_number
            JOIN lot_ranked ranked ON pod.id = ranked.lot_id
            LEFT JOIN item_srv srv ON srv.po_number = po.po_number AND srv.po_item_no = poi.po_item_no
            WHERE pod.dely_date IS NOT NULL 
              AND date(pod.dely_date) < '{today}'
              AND (COALESCE(pod.dsp_qty, 0) < pod.ord_qty)
              AND ({self._get_effective_rcd_sql()} < pod.ord_qty)
        """
        row = self.db.execute(query).fetchone()
        return {
            "overdue_count": row[0] if row else 0,
            "overdue_value": float(row[1]) if row and row[1] else 0.0,
        }

    def get_tracker_stats(
        self,
        due_date_from: str | None = None,
        due_date_to: str | None = None,
        entry_date_from: str | None = None,
        entry_date_to: str | None = None,
        status: str = "all",
    ) -> dict[str, Any]:
        """Get KPIs for tracker page."""
        today = self._get_today()
        
        where_clauses = ["pod.dely_date IS NOT NULL"]
        params = []
        
        if due_date_from:
            where_clauses.append("date(pod.dely_date) >= ?")
            params.append(due_date_from)
        if due_date_to:
            where_clauses.append("date(pod.dely_date) <= ?")
            params.append(due_date_to)
        if entry_date_from:
            where_clauses.append("date(pod.entry_allow_date) >= ?")
            params.append(entry_date_from)
        if entry_date_to:
            where_clauses.append("date(pod.entry_allow_date) <= ?")
            params.append(entry_date_to)
        
        where_stmt = " AND ".join(where_clauses)
        effective_rcd = self._get_effective_rcd_sql()

        # Dynamic Value Query based on status
        value_case = "1=1"
        if status == "overdue":
            value_case = f"date(pod.dely_date) < '{today}' AND (COALESCE(pod.dsp_qty, 0) < pod.ord_qty) AND ({effective_rcd} < pod.ord_qty)"
        elif status == "due_soon":
            value_case = f"date(pod.dely_date) >= '{today}' AND date(pod.dely_date) <= date('{today}', '+7 days') AND ({effective_rcd} < pod.ord_qty)"
        elif status == "due_this_month":
            value_case = f"strftime('%Y-%m', pod.dely_date) = strftime('%Y-%m', '{today}') AND ({effective_rcd} < pod.ord_qty)"
        elif status == "pending":
            value_case = f"(COALESCE(pod.dsp_qty, 0) < pod.ord_qty) AND ({effective_rcd} < pod.ord_qty)"
        elif status == "dispatched":
            value_case = f"(COALESCE(pod.dsp_qty, 0) >= pod.ord_qty) OR ({effective_rcd} >= pod.ord_qty)"
        elif status == "all":
            value_case = f"({effective_rcd} < pod.ord_qty)"

        query = f"""
            {self._get_fifo_ctes()}
            SELECT 
                SUM(CASE WHEN {effective_rcd} < pod.ord_qty THEN 1 ELSE 0 END) as total_count,
                SUM(CASE WHEN date(pod.dely_date) < '{today}' AND (COALESCE(pod.dsp_qty, 0) < pod.ord_qty) AND ({effective_rcd} < pod.ord_qty) THEN 1 ELSE 0 END) as overdue_count,
                SUM(CASE WHEN date(pod.dely_date) >= '{today}' AND date(pod.dely_date) <= date('{today}', '+7 days') AND ({effective_rcd} < pod.ord_qty) THEN 1 ELSE 0 END) as due_soon_count,
                SUM(CASE WHEN strftime('%Y-%m', pod.dely_date) = strftime('%Y-%m', '{today}') AND ({effective_rcd} < pod.ord_qty) THEN 1 ELSE 0 END) as due_this_month_count,
                SUM(CASE WHEN (COALESCE(pod.dsp_qty, 0) < pod.ord_qty) AND ({effective_rcd} < pod.ord_qty) THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN (COALESCE(pod.dsp_qty, 0) >= pod.ord_qty) OR ({effective_rcd} >= pod.ord_qty) THEN 1 ELSE 0 END) as dispatched_count,
                COALESCE(SUM(CASE WHEN {value_case} THEN MAX(0, pod.ord_qty - MAX(COALESCE(pod.dsp_qty, 0), {effective_rcd})) * poi.po_rate ELSE 0 END), 0) as filtered_value,
                COALESCE(SUM(MAX(0, pod.ord_qty - MAX(COALESCE(pod.dsp_qty, 0), {effective_rcd})) * poi.po_rate), 0) as total_value
            FROM purchase_order_deliveries pod
            JOIN purchase_order_items poi ON pod.po_item_id = poi.id
            JOIN purchase_orders po ON poi.po_number = po.po_number
            JOIN lot_ranked ranked ON pod.id = ranked.lot_id
            LEFT JOIN item_srv srv ON srv.po_number = po.po_number AND srv.po_item_no = poi.po_item_no
            WHERE {where_stmt}
        """
        logger.info(f"Tracker Stats Query: {query} Params: {params}")
        row = self.db.execute(query, params).fetchone()
        logger.info(f"Tracker Stats Result: {row}")
        return {
            "total_count": row[0] or 0,
            "overdue_count": row[1] or 0,
            "due_soon_count": row[2] or 0,
            "due_this_month_count": row[3] or 0,
            "pending_count": row[4] or 0,
            "dispatched_count": row[5] or 0,
            "filtered_value": float(row[6]) if row[6] else 0.0,
            "total_value": float(row[7]) if row[7] else 0.0,
        }

    def list_deliveries(
        self,
        limit: int = 20,
        offset: int = 0,
        sort_by: str = "dely_date",
        order: str = "ASC",
        due_date_from: str | None = None,
        due_date_to: str | None = None,
        entry_date_from: str | None = None,
        entry_date_to: str | None = None,
        value_min: float | None = None,
        value_max: float | None = None,
        status: str = "all",
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        """List delivery schedules with filters and pagination."""
        today = self._get_today()
        
        where_clauses = ["pod.dely_date IS NOT NULL"]
        params = []
        
        # Filters
        if due_date_from:
            where_clauses.append("date(pod.dely_date) >= ?")
            params.append(due_date_from)
        if due_date_to:
            where_clauses.append("date(pod.dely_date) <= ?")
            params.append(due_date_to)
        if entry_date_from:
            where_clauses.append("date(pod.entry_allow_date) >= ?")
            params.append(entry_date_from)
        if entry_date_to:
            where_clauses.append("date(pod.entry_allow_date) <= ?")
            params.append(entry_date_to)
        if value_min is not None:
            where_clauses.append("(pod.ord_qty * poi.po_rate) >= ?")
            params.append(value_min)
        if value_max is not None:
            where_clauses.append("(pod.ord_qty * poi.po_rate) <= ?")
            params.append(value_max)

        if search:
            where_clauses.append("(po.po_number LIKE ? OR poi.material_code LIKE ? OR poi.material_description LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        where_stmt = " AND ".join(where_clauses)

        # Base query with effective_rcd
        query = f"""
            {self._get_fifo_ctes()}
            SELECT * FROM (
                SELECT 
                    pod.id,
                    po.po_number,
                    poi.po_item_no,
                    poi.material_code,
                    poi.material_description,
                    poi.mtrl_cat,
                    poi.drg_no,
                    poi.unit,
                    poi.po_rate,
                    pod.lot_no,
                    pod.ord_qty,
                    pod.dsp_qty,
                    pod.dely_date,
                    pod.entry_allow_date,
                    pod.dest_code,
                    (pod.ord_qty * poi.po_rate) as item_value,
                    {self._get_effective_rcd_sql()} as rcd_qty
                FROM purchase_order_deliveries pod
                JOIN purchase_order_items poi ON pod.po_item_id = poi.id
                JOIN purchase_orders po ON poi.po_number = po.po_number
                JOIN lot_ranked ranked ON pod.id = ranked.lot_id
                LEFT JOIN item_srv srv ON srv.po_number = po.po_number AND srv.po_item_no = poi.po_item_no
                WHERE {where_stmt}
            ) t
            WHERE 1=1
        """

        # Status filtering
        if status == "overdue":
            query += f" AND date(t.dely_date) < '{today}' AND (COALESCE(t.dsp_qty, 0) < t.ord_qty) AND t.rcd_qty < t.ord_qty"
        elif status == "due_soon":
            query += f" AND date(t.dely_date) >= '{today}' AND date(t.dely_date) <= date('{today}', '+7 days') AND (COALESCE(t.dsp_qty, 0) < t.ord_qty) AND t.rcd_qty < t.ord_qty"
        elif status == "due_this_month":
            query += f" AND strftime('%Y-%m', t.dely_date) = strftime('%Y-%m', '{today}') AND t.rcd_qty < t.ord_qty"
        elif status == "pending":
            query += " AND (COALESCE(t.dsp_qty, 0) < t.ord_qty) AND t.rcd_qty < t.ord_qty"
        elif status == "dispatched":
            query += " AND (COALESCE(t.dsp_qty, 0) >= t.ord_qty OR t.rcd_qty >= t.ord_qty)"
        elif status == "all":
            query += " AND t.rcd_qty < t.ord_qty"

        # Sorting
        valid_sorts = {
            "dely_date": "t.dely_date",
            "entry_date": "t.entry_allow_date",
            "entry_allow_date": "t.entry_allow_date",
            "value": "t.item_value",
            "item_value": "t.item_value",
            "po_number": "t.po_number",
            "material": "t.material_code",
            "lot_no": "t.lot_no",
            "ord_qty": "t.ord_qty",
            "dsp_qty": "t.dsp_qty",
            "rcd_qty": "t.rcd_qty",
            "balance_qty": "(t.ord_qty - t.rcd_qty)",
            "days_overdue": "t.dely_date",
            "days_diff": "t.dely_date",
        }
        sort_col = valid_sorts.get(sort_by, "t.dely_date")
        order_dir = "DESC" if order.upper() == "DESC" else "ASC"

        if sort_by == 'dely_date':
            query += f"""
                ORDER BY 
                    CASE WHEN date(t.dely_date) < '{today}' AND t.rcd_qty < t.ord_qty THEN 0 ELSE 1 END,
                    {sort_col} {order_dir}
                LIMIT ? OFFSET ?
            """
        else:
            query += f"""
                ORDER BY {sort_col} {order_dir}
                LIMIT ? OFFSET ?
            """
        
        rows = self.db.execute(query, params + [limit, offset]).fetchall()
        
        results = []
        for r in rows:
            item = dict(r)
            item['balance_qty'] = max(0, item['ord_qty'] - max(item['dsp_qty'] or 0, item['rcd_qty']))
            
            # Status
            if item['rcd_qty'] >= item['ord_qty'] or (item['dsp_qty'] and item['dsp_qty'] >= item['ord_qty']):
                item['delivery_status'] = 'dispatched'
            elif item['dely_date'] and item['dely_date'] < today:
                item['delivery_status'] = 'overdue'
            elif item['dely_date'] and item['dely_date'] <= self.db.execute(f"SELECT date('{today}', '+7 days')").fetchone()[0]:
                item['delivery_status'] = 'due_soon'
            else:
                item['delivery_status'] = 'pending'
            
            # days_diff
            try:
                dely = datetime.datetime.strptime(item['dely_date'], '%Y-%m-%d').date()
                today_obj = datetime.datetime.strptime(today, '%Y-%m-%d').date()
                item['days_diff'] = (dely - today_obj).days
            except:
                item['days_diff'] = 0

            results.append(item)
        return results

    def count_deliveries(
        self,
        due_date_from: str | None = None,
        due_date_to: str | None = None,
        entry_date_from: str | None = None,
        entry_date_to: str | None = None,
        value_min: float | None = None,
        value_max: float | None = None,
        status: str = "all",
        search: str | None = None,
    ) -> int:
        """Count delivery rows matching filters."""
        today = self._get_today()
        
        where_clauses = ["pod.dely_date IS NOT NULL"]
        params = []
        
        if due_date_from:
            where_clauses.append("date(pod.dely_date) >= ?")
            params.append(due_date_from)
        if due_date_to:
            where_clauses.append("date(pod.dely_date) <= ?")
            params.append(due_date_to)
        if entry_date_from:
            where_clauses.append("date(pod.entry_allow_date) >= ?")
            params.append(entry_date_from)
        if entry_date_to:
            where_clauses.append("date(pod.entry_allow_date) <= ?")
            params.append(entry_date_to)
        if value_min is not None:
            where_clauses.append("(pod.ord_qty * poi.po_rate) >= ?")
            params.append(value_min)
        if value_max is not None:
            where_clauses.append("(pod.ord_qty * poi.po_rate) <= ?")
            params.append(value_max)

        if search:
            where_clauses.append("(po.po_number LIKE ? OR poi.material_code LIKE ? OR poi.material_description LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        where_stmt = " AND ".join(where_clauses)
        effective_rcd = self._get_effective_rcd_sql()
        
        query = f"""
            {self._get_fifo_ctes()}
            SELECT COUNT(*) FROM (
                SELECT 
                    pod.id,
                    pod.ord_qty,
                    pod.dsp_qty,
                    pod.dely_date,
                    {effective_rcd} as rcd_qty
                FROM purchase_order_deliveries pod
                JOIN purchase_order_items poi ON pod.po_item_id = poi.id
                JOIN purchase_orders po ON poi.po_number = po.po_number
                JOIN lot_ranked ranked ON pod.id = ranked.lot_id
                LEFT JOIN item_srv srv ON srv.po_number = po.po_number AND srv.po_item_no = poi.po_item_no
                WHERE {where_stmt}
            ) t
            WHERE 1=1
        """

        if status == "overdue":
            query += f" AND date(t.dely_date) < '{today}' AND (COALESCE(t.dsp_qty, 0) < t.ord_qty) AND t.rcd_qty < t.ord_qty"
        elif status == "due_soon":
            query += f" AND date(t.dely_date) >= '{today}' AND date(t.dely_date) <= date('{today}', '+7 days') AND (COALESCE(t.dsp_qty, 0) < t.ord_qty) AND t.rcd_qty < t.ord_qty"
        elif status == "due_this_month":
            query += f" AND strftime('%Y-%m', t.dely_date) = strftime('%Y-%m', '{today}') AND t.rcd_qty < t.ord_qty"
        elif status == "pending":
            query += " AND (COALESCE(t.dsp_qty, 0) < t.ord_qty) AND t.rcd_qty < t.ord_qty"
        elif status == "dispatched":
            query += " AND (COALESCE(t.dsp_qty, 0) >= t.ord_qty OR t.rcd_qty >= t.ord_qty)"
        elif status == "all":
            query += " AND t.rcd_qty < t.ord_qty"

        return self.db.execute(query, params).fetchone()[0] or 0

    def _get_today(self) -> str:
        """Get today's date in YYYY-MM-DD format."""
        # Using Python date to be consistent, but SQLite date('now') is also fine.
        # We fetch it once to ensure all calculations in a request use the same 'today'.
        return self.db.execute("SELECT date('now')").fetchone()[0]
