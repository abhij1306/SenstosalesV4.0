import json
import logging
import sqlite3

from fastapi import APIRouter, Depends, Query

from backend.core.intelligence import LedgerLogger
from backend.db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Intelligence"])

@router.get("/recovery-notifications")
def get_recovery_notifications(db: sqlite3.Connection = Depends(get_db)):
    """
    Scans for orphaned transactions (e.g., from power cuts) and returns notifications.
    """
    try:
        orphans = LedgerLogger.scan_orphaned_transactions(db)
        notifications = []
        
        for row in orphans:
            json.loads(row["payload_json"])
            notifications.append({
                "type": "RECOVERY_ALERT",
                "severity": "HIGH",
                "message": f"Critical operation ({row['entity_type']} {row['entity_id']}) was interrupted.",
                "details": f"The {row['entity_type']} creation process started at {row['created_at']} but did not complete. Check for duplicate or partial data.",
                "timestamp": row["created_at"],
                "entity_type": row["entity_type"],
                "entity_id": row["entity_id"]
            })
            
        return {"notifications": notifications, "count": len(notifications)}
    except Exception as e:
        logger.error(f"Failed to fetch recovery notifications: {e}")
        return {"notifications": [], "count": 0, "error": str(e)}

@router.get("/logs")
async def list_logs(
    limit: int = 50,
    offset: int = 0,
    event_class: str | None = None,
    actor: str | None = None,
    module: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    search_query: str | None = None,
    sort_by: str = "timestamp",
    order: str = "desc",
    business_only: bool = False,
    category: str | None = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """List system logs with pagination and filters."""
    try:
        logs, total = LedgerLogger.list_paginated_logs(
            db, limit, offset, event_class, actor, module, 
            start_date, end_date, search_query, sort_by, order, business_only,
            category=category
        )
        results = []
        for row in logs:
            results.append({
                "uuid": row["event_uuid"],
                "class": row["event_class"],
                "event_class": row["event_class"],  # Native for frontend
                "module": row["module_path"],
                "module_path": row["module_path"],  # Native for frontend
                "entity_type": row["entity_type"],
                "entity_id": row["entity_id"],
                "actor": row["actor"],
                "severity": row["severity"],
                "timestamp": row["created_at"],
                "payload": json.loads(row["payload_json"]) if row["payload_json"] else {},
                "metadata": json.loads(row["metadata_json"]) if row["metadata_json"] else {},
                "is_simulated": bool(row["is_simulated"]),
                "category": LedgerLogger.map_to_category(row["event_class"], row["module_path"])
            })
        
        return {
            "items": results,
            "metadata": {
                "total_count": total,
                "limit": limit,
                "offset": offset,
                "page": (offset // limit) + 1
            }
        }
    except Exception as e:
        logger.error(f"Failed to list system logs: {e}")
        return {"items": [], "metadata": {"total_count": 0}, "error": str(e)}

@router.get("/logs/classes")
def get_log_classes():
    """Returns canonical module categories for filtering."""
    return LedgerLogger.get_module_categories()

@router.get("/forensics/{entity_id}")
def get_entity_forensics(entity_id: str, db: sqlite3.Connection = Depends(get_db)):
    """
    Returns the full immutable history for a document.
    """
    try:
        history = LedgerLogger.get_forensics(db, entity_id)
        results = []
        for row in history:
            results.append({
                "uuid": row["event_uuid"],
                "class": row["event_class"],
                "module": row["module_path"],
                "actor": row["actor"],
                "timestamp": row["created_at"],
                "payload": json.loads(row["payload_json"]) if row["payload_json"] else {}
            })
        return {"history": results, "entity_id": entity_id}
    except Exception as e:
        logger.error(f"Forensics lookup failed: {e}")
        return {"history": [], "error": str(e)}


@router.get("/errors")
def list_errors(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    severity: str | None = None,
    status: str | None = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Returns a list of structured system errors."""
    try:
        where = "WHERE 1=1"
        params = []
        if severity:
            where += " AND severity = ?"
            params.append(severity)
        
        if status:
            where += " AND status = ?"
            params.append(status)
        else:
            # Default: Show OPEN and RESOLVED, hide ARCHIVED
            where += " AND (status IS NULL OR status != 'ARCHIVED')"
            
        rows = db.execute(f"""
            SELECT e.*, i.module_path, i.created_at, i.payload_json, i.is_simulated
            FROM error_index e
            JOIN instance_ledger i ON e.ledger_uuid = i.event_uuid
            {where}
            ORDER BY i.created_at DESC
            LIMIT ? OFFSET ?
        """, [*params, limit, offset]).fetchall()
        
        items = []
        for row in rows:
            d = dict(row)
            payload = json.loads(d["payload_json"]) if d.get("payload_json") else {}
            
            # Map fields for frontend
            d["module"] = d.get("module_path", "UNKNOWN")
            
            # Extract message from various payload formats
            d["message"] = (
                payload.get("message") or 
                payload.get("error_msg") or 
                payload.get("error") or 
                d.get("error_type") or 
                "Unknown Error"
            )
            
            # Ensure proper boolean
            d["is_simulated"] = bool(d["is_simulated"])
            items.append(d)
        
        return {
            "items": items,
            "metadata": {"total_count": len(rows), "limit": limit, "offset": offset}
        }
    except Exception as e:
        logger.error(f"Failed to list system errors: {e}")
        return {"items": [], "error": str(e)}

@router.post("/errors/{uuid}/resolve")
def resolve_error(uuid: str, db: sqlite3.Connection = Depends(get_db)):
    try:
        db.execute("UPDATE error_index SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP WHERE ledger_uuid = ?", [uuid])
        db.commit()
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to resolve error {uuid}: {e}")
        return {"success": False, "error": str(e)}

@router.post("/errors/{uuid}/archive")
def archive_error(uuid: str, db: sqlite3.Connection = Depends(get_db)):
    try:
        db.execute("UPDATE error_index SET status = 'ARCHIVED' WHERE ledger_uuid = ?", [uuid])
        db.commit()
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to archive error {uuid}: {e}")
        return {"success": False, "error": str(e)}

from pydantic import BaseModel


class FrontendError(BaseModel):
    error_msg: str
    stack_trace: str | None = None
    component_stack: str | None = None
    source: str = "FRONTEND_CLIENT"
    url: str | None = None

@router.post("/errors")
def report_frontend_error(error: FrontendError, db: sqlite3.Connection = Depends(get_db)):
    """
    Receives frontend crashes and logs them to the Nexus.
    """
    try:
        LedgerLogger.record(
            db,
            event_class="FRONTEND_CRASH",
            module_path=f"frontend.{error.url or 'unknown'}",
            entity_type="CLIENT",
            entity_id="BROWSER",
            payload={
                "error_msg": error.error_msg,
                "stack_trace": error.stack_trace,
                "component_stack": error.component_stack,
                "source": error.source
            },
            actor="USER",
            severity="HIGH"
        )
        db.commit()
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to record frontend error: {e}")
        return {"success": False, "error": str(e)}

@router.get("/decisions")
def list_decisions(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    actor: str | None = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Returns a list of structured agent decisions."""
    try:
        rows = db.execute("""
            SELECT d.*, i.module_path, i.actor, i.created_at, i.is_simulated
            FROM decision_index d
            JOIN instance_ledger i ON d.ledger_uuid = i.event_uuid
            ORDER BY i.created_at DESC
            LIMIT ? OFFSET ?
        """, [limit, offset]).fetchall()
        
        return {
            "items": [
                {**dict(row), "is_simulated": bool(row["is_simulated"])} for row in rows
            ],
            "metadata": {"total_count": len(rows), "limit": limit, "offset": offset}
        }
    except Exception as e:
        logger.error(f"Failed to list system decisions: {e}")
        return {"items": [], "error": str(e)}

