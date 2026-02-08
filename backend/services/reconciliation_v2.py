"""
Reconciliation Service V2 - Optimized
Enforces:
1. Centralized status logic (uses status_service)
2. Status updates only (quantities handled by triggers)
"""

import logging
import sqlite3

from backend.core.intelligence import LedgerLogger

from .status_service import calculate_entity_status

logger = logging.getLogger(__name__)

# Tolerance for float comparison
TOLERANCE = 0.001


class ReconciliationServiceV2:
    """Pure reconciliation service with batch optimizations."""

    @staticmethod
    def sync_po(db: sqlite3.Connection, po_number: str):
        """
        Full PO Reconciliation & Status Update.
        
        Recalculates all items from document-level truth:
        - dsp_qty: Sum from delivery_challan_items
        - rcd_qty/rej_qty: Sum from srv_items
        """
        logger.info(f"🛡 [Hardening] Full reconciliation for PO {po_number}")
        
        try:
            # 1. Update Dispatched Quantities (Source: Delivery Challans)
            # Only updates if at least one matching DC item exists to preserve manual overrides.
            db.execute(
                """
                UPDATE purchase_order_items
                SET dsp_qty = (
                    SELECT ROUND(SUM(dci.dsp_qty), 3)
                    FROM delivery_challan_items dci
                    WHERE dci.po_item_id = purchase_order_items.id
                ),
                updated_at = CURRENT_TIMESTAMP
                WHERE po_number = ?
                AND EXISTS (
                    SELECT 1 FROM delivery_challan_items dci 
                    WHERE dci.po_item_id = purchase_order_items.id
                )
                """,
                (po_number,)
            )

            # 1b. Update Lot-wise Dispatched Quantities (Source: Delivery Challan Items)
            # This is critical for the Delivery Tracker to show accurate dispatched quantities by lot.
            db.execute(
                """
                UPDATE purchase_order_deliveries
                SET dsp_qty = (
                    SELECT ROUND(SUM(dci.dsp_qty), 3)
                    FROM delivery_challan_items dci
                    WHERE dci.po_item_id = purchase_order_deliveries.po_item_id
                    AND dci.lot_no = purchase_order_deliveries.lot_no
                ),
                updated_at = CURRENT_TIMESTAMP
                WHERE po_item_id IN (
                    SELECT id FROM purchase_order_items WHERE po_number = ?
                )
                AND EXISTS (
                    SELECT 1 FROM delivery_challan_items dci 
                    WHERE dci.po_item_id = purchase_order_deliveries.po_item_id
                    AND dci.lot_no = purchase_order_deliveries.lot_no
                )
                """,
                (po_number,)
            )

            # 2. Update Received Quantities (Source: Store Receipt Vouchers)
            db.execute(
                """
                UPDATE purchase_order_items
                SET rcd_qty = COALESCE((
                    SELECT ROUND(SUM(si.rcd_qty), 3)
                    FROM srv_items si 
                    WHERE si.po_number = purchase_order_items.po_number 
                    AND si.po_item_no = purchase_order_items.po_item_no
                ), 0),
                rej_qty = COALESCE((
                    SELECT ROUND(SUM(si.rej_qty), 3)
                    FROM srv_items si 
                    WHERE si.po_number = purchase_order_items.po_number 
                    AND si.po_item_no = purchase_order_items.po_item_no
                ), 0)
                WHERE po_number = ?
                """,
                (po_number,)
            )

            # 3. Update Pending Balance (Standardized calculation)
            db.execute(
                """
                UPDATE purchase_order_items
                SET pending_qty = ROUND(MAX(0, ord_qty - COALESCE(dsp_qty, 0)), 3)
                WHERE po_number = ?
                """,
                (po_number,)
            )

            # 4. Final Status Calculation (Python-side Decimal math)
            original_row_factory = db.row_factory
            db.row_factory = sqlite3.Row
            try:
                items = db.execute(
                    "SELECT id, ord_qty, dsp_qty, rcd_qty, rej_qty FROM purchase_order_items WHERE po_number = ?",
                    (po_number,)
                ).fetchall()
                
                if not items:
                    return

                item_status_updates = []
                total_ord, total_dsp, total_rcd = 0.0, 0.0, 0.0

                for item in items:
                    o, d, r, _rej = item['ord_qty'] or 0, item['dsp_qty'] or 0, item['rcd_qty'] or 0, item['rej_qty'] or 0
                    total_ord += o
                    total_dsp += d
                    total_rcd += r
                    
                    # status_service use Decimal internally now
                    istatus = calculate_entity_status(o, d, r)
                    item_status_updates.append((istatus, item['id']))

                # Update Item Statuses
                db.executemany(
                    "UPDATE purchase_order_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    item_status_updates
                )

                # Update Header Status
                po_status = calculate_entity_status(total_ord, total_dsp, total_rcd)
                db.execute(
                    "UPDATE purchase_orders SET po_status = ?, updated_at = CURRENT_TIMESTAMP WHERE po_number = ?",
                    (po_status, po_number)
                )

                # Record in LedgerLogger
                LedgerLogger.record(
                    db,
                    event_class="TRANSACTION_COMMIT",
                    module_path="backend.services.reconciliation_v2",
                    entity_type="PO",
                    entity_id=po_number,
                    payload={
                        "status": po_status,
                        "total_ord": total_ord,
                        "total_dsp": total_dsp,
                        "total_rcd": total_rcd
                    },
                    actor="SYSTEM"
                )

            finally:
                db.row_factory = original_row_factory

        except Exception as e:
            logger.error(f"Failed reconciliation for PO {po_number}: {e}")
            raise

    # -------------------------------------------------------------------------
    # Legacy / Passthrough Methods
    # -------------------------------------------------------------------------

    @staticmethod
    def reconcile_po(db: sqlite3.Connection, po_number: str):
        ReconciliationServiceV2.sync_po(db, po_number)

    @staticmethod
    def reconcile_dc(db: sqlite3.Connection, dc_number: str):
        po = db.execute("SELECT po_number FROM delivery_challans WHERE dc_number = ?", (dc_number,)).fetchone()
        if po:
            # Note: po can be a dict/Row or tuple depending on current factory
            pnum = po['po_number'] if isinstance(po, (sqlite3.Row, dict)) else po[0]
            ReconciliationServiceV2.sync_po(db, pnum)

    @staticmethod
    def reconcile_srv(db: sqlite3.Connection, srv_number: str):
        po = db.execute("SELECT po_number FROM srvs WHERE srv_number = ?", (srv_number,)).fetchone()
        if po:
            pnum = po['po_number'] if isinstance(po, (sqlite3.Row, dict)) else po[0]
            ReconciliationServiceV2.sync_po(db, pnum)

    @staticmethod
    def srv_has_invoice(db: sqlite3.Connection, srv_number: str) -> bool:
        row = db.execute("SELECT invoice_no FROM srv_items WHERE srv_number = ? AND invoice_no IS NOT NULL LIMIT 1", (srv_number,)).fetchone()
        return row is not None


# Alias
ReconciliationService = ReconciliationServiceV2
