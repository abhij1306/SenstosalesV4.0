import json
import logging
import sqlite3

from fastapi import APIRouter, Depends

from backend.api.settings import get_supplier_info
from backend.core.errors import internal_error
from backend.core.intelligence import LedgerLogger
from backend.db.session import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/reset-db")
async def reset_database(db: sqlite3.Connection = Depends(get_db)):
    """
    Nuclear Reset: Clears all business transaction data.
    Preserves: Settings, Buyers (Identity), Suppliers.
    """
    try:
        # List of tables to purge (Order matters for FKs if regular delete, but we turn FKs off)
        # Using correct schema names from ingest_po.py and dc.py
        tables_to_purge = [
            # Invoices
            "gst_invoice_items",
            "gst_invoices",
            # SRVs
            "srv_items",
            "srvs",
            # Delivery Challans
            "delivery_challan_items",
            "delivery_challans",
            # "reconciliation_ledger", # VIEW - Cannot delete from it
            # POs
            "purchase_order_deliveries",
            "purchase_order_items",
            "purchase_orders",
        ]

        logger.info("Initiating Nuclear Database Reset...")

        # SQLite specific reset
        # 1. Disable Foreign Keys to allow dropping in any order
        db.execute("PRAGMA foreign_keys = OFF")

        for table in tables_to_purge:
            try:
                # Check if table exists first to avoid errors
                db.execute(f"DELETE FROM {table}")
                logger.info(f"Cleared table: {table}")
            except sqlite3.OperationalError as e:
                if "no such table" in str(e):
                    logger.warning(f"Table {table} not found, skipping.")
                else:
                    raise e

        # 2. Re-enable Foreign Keys
        db.execute("PRAGMA foreign_keys = ON")

        # 3. Re-seed Defaults (Self-healing system)
        # Check if settings already exist before seeding defaults
        existing_settings = db.execute("SELECT COUNT(*) as count FROM settings").fetchone()
        
        if existing_settings["count"] == 0:
            # First run - seed all defaults (placeholder values - user should configure these)
            default_settings = [
                ('supplier_name', 'YOUR COMPANY NAME'),
                ('supplier_gstin', 'XXAAAAX0000A0X0'),
                ('supplier_address', 'Your Company Address, City, State - PINCODE'),
                ('supplier_contact', 'Phone Number, Email'),
                ('supplier_state', 'Your State'),
                ('supplier_state_code', 'XX'),
                ('cgst_rate', '9.0'),
                ('sgst_rate', '9.0'),
                ('payment_terms', '45')
            ]
            db.executemany(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
                default_settings
            )
            logger.info("Seeded default settings (first run)")
        else:
            # Settings already exist - fetch supplier info from DB
            supplier_info = get_supplier_info(db)
            logger.info(f"Loaded supplier settings from DB: supplier_name={supplier_info.get('supplier_name')}")
        
        # Ensure download preferences exist with proper defaults
        db.execute("""
            INSERT OR IGNORE INTO user_download_prefs (
                id, po_html, srv_html, challan, invoice, 
                challan_summary, invoice_summary, items_summary, gc
            ) VALUES (
                1, 'Downloads/PO_HTML', 'Downloads/SRV_HTML', 
                'Downloads/Challan', 'Downloads/Invoice',
                'Downloads/Challan_Summary', 'Downloads/Invoice_Summary', 
                'Downloads/Items_Summary', 'Downloads/GC'
            )
        """)

        db.commit()

        logger.info("Database reset completed successfully.")

        LedgerLogger.record(
            db,
            event_class="SYSTEM_RESET",
            module_path="backend.api.system",
            entity_type="CORE",
            entity_id="DATABASE",
            payload={"tables_cleared": tables_to_purge},
            actor="USER",
            severity="HIGH"
        )

        return {
            "message": "System reset successful",
            "tables_cleared": tables_to_purge,
            "preserved": ["settings", "buyers", "users"],
        }

    except Exception as e:
        logger.error(f"System reset failed: {e}", exc_info=True)
        db.rollback()
        
        db.commit() # Commit error log
        
        raise internal_error(str(e), e)


@router.post("/reconcile-all")
async def reconcile_all(db: sqlite3.Connection = Depends(get_db)):
    """
    Trigger a global reconciliation sync for all POs.
    Useful for fixing data after logic updates (Triangle of Truth).
    """
    try:
        from backend.services.reconciliation_v2 import ReconciliationServiceV2

        # Get all unique PO numbers from purchase_orders
        po_numbers = [row[0] for row in db.execute("SELECT po_number FROM purchase_orders").fetchall()]

        logger.info(f"Initiating Global Reconciliation for {len(po_numbers)} POs...")

        for po_num in po_numbers:
            try:
                ReconciliationServiceV2.reconcile_po(db, str(po_num))
            except Exception as sync_err:
                logger.error(f"Failed to reconcile PO {po_num}: {sync_err}")
                # Continue with others

        db.commit()

        logger.info("Global reconciliation completed.")

        LedgerLogger.record(
            db,
            event_class="GLOBAL_RECONCILE",
            module_path="backend.api.system",
            entity_type="CORE",
            entity_id="ALL_POS",
            payload={"po_count": len(po_numbers)},
            actor="USER",
            severity="MEDIUM"
        )

        return {
            "success": True,
            "POs_synced": len(po_numbers),
            "message": f"Successfully resynced all {len(po_numbers)} Purchase Orders.",
        }

    except Exception as e:
        logger.error(f"Global reconciliation failed: {e}", exc_info=True)
        db.rollback()
        
        db.commit()
        
        raise internal_error(str(e), e)
@router.get("/errors")
async def get_system_errors(limit: int = 50, offset: int = 0, db: sqlite3.Connection = Depends(get_db)):
    """
    Retrieves the latest system runtime errors for the forensic feed.
    """
    cursor = db.execute("""
        SELECT 
            id, severity, source, module, message, stack, 
            context, summary_json, request_context_json, created_at
        FROM runtime_errors
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    """, (limit, offset))
    
    # Process rows into list of dicts with JSON parsing
    columns = [col[0] for col in cursor.description]
    rows = []
    for row in cursor.fetchall():
        d = dict(zip(columns, row, strict=False))
        try:
            d["summary"] = json.loads(d["summary_json"]) if d["summary_json"] else None
            d["request_context"] = json.loads(d["request_context_json"]) if d["request_context_json"] else None
            d["context"] = json.loads(d["context"]) if isinstance(d.get("context"), str) else d.get("context")
        except (json.JSONDecodeError, TypeError):
            d["summary"] = None
            d["request_context"] = None
        rows.append(d)
    
    # Get total count
    total = db.execute("SELECT COUNT(*) FROM runtime_errors").fetchone()[0]
    
    return {
        "success": True,
        "items": rows,
        "metadata": {
            "total_count": total,
            "limit": limit,
            "offset": offset
        }
    }
