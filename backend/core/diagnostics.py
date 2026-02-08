import contextlib
import datetime
import json
import logging
import os
import sqlite3
import sys
import time
import traceback
import uuid
from enum import Enum
from typing import Any

# Dedicated AI-Visible Log Stream
logger = logging.getLogger(__name__)
AI_LOGGER = logging.getLogger("diagnostics_ai")
AI_LOGGER.setLevel(logging.INFO)

if not os.path.exists("logs"):
    os.makedirs("logs")

if not AI_LOGGER.handlers:
    fh = logging.FileHandler("logs/diagnostics.log")
    fh.setFormatter(logging.Formatter('%(asctime)s | %(levelname)s | %(message)s'))
    AI_LOGGER.addHandler(fh)

class ErrorSeverity(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ErrorType(Enum):
    DATA = "DATA"
    VALIDATION = "VALIDATION"
    NETWORK = "NETWORK"
    DB = "DB"
    IO = "IO"
    AGENT = "AGENT"
    LOGIC = "LOGIC"
    INFRA = "INFRA"
    RUNTIME = "RUNTIME"

class EventClass(str, Enum):
    # Documents
    DOCUMENT_CREATE = "DOCUMENT_CREATE"
    DOCUMENT_UPDATE = "DOCUMENT_UPDATE"
    DOCUMENT_DELETE = "DOCUMENT_DELETE"
    
    # Specific Documents
    PO_INGESTED = "PO_INGESTED"
    PO_CREATED = "PO_CREATED"
    PO_UPDATED = "PO_UPDATED"
    DC_GENERATED = "DC_GENERATED"
    DC_CREATED = "DC_CREATED"
    DC_UPDATED = "DC_UPDATED"
    DC_DELETED = "DC_DELETED"
    INVOICE_GENERATED = "INVOICE_GENERATED"
    INVOICE_CREATED = "INVOICE_CREATED"
    INVOICE_UPDATED = "INVOICE_UPDATED"
    INVOICE_DELETED = "INVOICE_DELETED"
    SRV_BATCH_INGESTED = "SRV_BATCH_INGESTED"
    SRV_INGESTED = "SRV_INGESTED"
    SRV_CREATED = "SRV_CREATED"
    SRV_DELETED = "SRV_DELETED"
    
    # Quantities & Inventory
    QUANTITY_UPDATE = "QUANTITY_UPDATE"
    BATCH_OPERATION_START = "BATCH_OPERATION_START"
    BATCH_OPERATION_END = "BATCH_OPERATION_END"
    
    # Validation & Logic
    VALIDATION_PASSED = "VALIDATION_PASSED"
    VALIDATION_FAILED = "VALIDATION_FAILED"
    DEVIATION_DETECTED = "DEVIATION_DETECTED"
    GUARDRAIL_TRIGGERED = "GUARDRAIL_TRIGGERED"
    
    # Workflow
    STATUS_TRANSITION = "STATUS_TRANSITION"
    WORKFLOW_STEP = "WORKFLOW_STEP"
    
    # System
    SYSTEM_BOOT = "SYSTEM_BOOT"
    SYSTEM_ERROR = "SYSTEM_ERROR"
    SYSTEM_RESET = "SYSTEM_RESET"
    SYSTEM_RECONCILED = "SYSTEM_RECONCILED"
    DOC_DELETED = "DOC_DELETED"
    
    # Downloads
    INVOICE_DOWNLOADED = "INVOICE_DOWNLOADED"
    DC_DOWNLOAD_GC = "DC_DOWNLOAD_GC"
    DC_DOWNLOAD_EXCEL = "DC_DOWNLOAD_EXCEL"
    
    # Performance
    PERFORMANCE_METRIC = "PERFORMANCE_METRIC"
    TRANSACTION_START = "TRANSACTION_START"
    TRANSACTION_COMMIT = "TRANSACTION_COMMIT"

class Diagnostics:
    """
    Unified Fail-Safe Diagnostics & Event Ledger.
    Single, non-raising interface for all system logging.
    """
    
    ERROR_RULES = [
        {"match": "KeyError: 'header'", "human_summary": "Missing invoice header data.", "cause": "Frontend/Service sent incomplete payload.", "fix": "Check payload in Request Context."},
        {"match": "IntegrityError: UNIQUE constraint failed", "human_summary": "Duplicate Document Conflict", "cause": "Document number already exists.", "fix": "Use a unique number."},
        {"match": "OperationalError: database is locked", "human_summary": "Database Contention", "cause": "Too many concurrent writes.", "fix": "System will retry; reduce batch sizes if persistent."},
        {"match": "FileNotFoundError", "human_summary": "Resource Not Found", "cause": "Missing external file (PO/SRV).", "fix": "Verify file existence in download path."}
    ]

    @staticmethod
    def get_module_categories() -> list[str]:
        """Returns the canonical list of user-facing module categories."""
        return [
            "Orders (PO)",
            "Dispatch (DC)", 
            "Invoicing",
            "Receipts (SRV)",
            "Settings",
            "System Errors",
            "Other"
        ]

    @staticmethod
    def map_to_category(event_class: str, module_path: str) -> str:
        """Maps an internal event class and module path to a human-readable module category."""
        ec = event_class.upper()
        mp = (module_path or "").lower()
        
        # 1. Errors & Crashes
        if "ERROR" in ec or "CRASH" in ec or "failed" in ec or "detection" in ec:
            return "System Errors"
        
        # 2. Orders (PO)
        if "PO_" in ec or "po" in mp:
            return "Orders (PO)"
            
        # 3. Dispatch (DC)
        if "DC_" in ec or "dc" in mp:
            return "Dispatch (DC)"
            
        # 4. Invoicing
        if "INVOICE_" in ec or "invoice" in mp:
            return "Invoicing"
            
        # 5. Receipts (SRV)
        if "SRV_" in ec or "srv" in mp:
            return "Receipts (SRV)"
            
        # 6. Settings & Config
        if "CONFIG" in ec or "setting" in mp:
            return "Settings"
            
        return "Other"

    @staticmethod
    def record(
        db: sqlite3.Connection,
        event_class: str,
        module_path: str,
        entity_id: str,
        payload: dict[str, Any],
        entity_type: str = "SYSTEM",
        actor: str = "SYSTEM",
        severity: str = "INFO",
        task_id: str | None = None
    ) -> str:
        """Records an event to the instance ledger. Fail-safe."""
        if task_id:
            payload["task_id"] = task_id

        try:
            from backend.core.intelligence.context_provider import ContextProvider
            event_uuid = str(uuid.uuid4())
            context = ContextProvider.get_context(module=module_path, user_id=actor)
            
            db.execute(
                """
                INSERT INTO instance_ledger (
                    event_uuid, event_class, module_path, entity_type, 
                    entity_id, payload_json, metadata_json, actor, 
                    source, severity, task_id, source_version, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_uuid, event_class, module_path, entity_type,
                    entity_id, json.dumps(payload), json.dumps(context),
                    actor, ContextProvider.get_source(), severity, 
                    task_id, ContextProvider.VERSION, datetime.datetime.now().isoformat()
                )
            )
            
            AI_LOGGER.info(f"[{event_class}] {module_path} | {entity_type}/{entity_id} | {actor}")
            return event_uuid
        except Exception as e:
            logger.error(f"Diagnostics.record FAIL: {e}")
            return ""

    @staticmethod
    def capture_error(
        db: sqlite3.Connection,
        error: Exception,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        error_type: ErrorType = ErrorType.LOGIC,
        module: str = "UNKNOWN",
        entity_id: str = "GLOBAL",
        request_context: dict[str, Any] | None = None
    ) -> str:
        """Captures error and records to ledger/runtime_errors. Fail-safe."""
        try:
            tb = sys.exc_info()[2]
            stack = traceback.format_exc()
            summary = Diagnostics.summarize_exception(error, tb, stack)
            
            payload = {
                "error": str(error),
                "type": error_type.value,
                "stack": stack,
                "summary": summary,
                "request_context": request_context
            }
            
            # 1. Primary Ledger
            event_uuid = Diagnostics.record(
                db=db,
                event_class="SYSTEM_ERROR",
                module_path=module,
                entity_id=entity_id,
                payload=payload,
                entity_type="ERROR",
                severity=severity.value
            )
            
            # 2. Dedicated Error Table
            db.execute(
                """
                INSERT INTO runtime_errors (
                    severity, source, module, message, stack, 
                    summary_json, request_context_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    severity.value, error_type.value, module, str(error), stack,
                    json.dumps(summary), json.dumps(request_context)
                )
            )
            return event_uuid
        except Exception as e:
            logger.error(f"Diagnostics.capture_error FAIL: {e}")
            return ""

    @staticmethod
    def summarize_exception(exc: Exception, tb: Any, stack: str) -> dict[str, Any]:
        """Simple exception summarizer."""
        try:
            frames = traceback.extract_tb(tb)
            app_frames = [f for f in frames if "backend" in f.filename.lower() and "site-packages" not in f.filename.lower()]
            root = app_frames[-1] if app_frames else (frames[-1] if frames else None)
            
            analysis = None
            for rule in Diagnostics.ERROR_RULES:
                if rule["match"] in stack:
                    analysis = rule
                    break

            return {
                "type": type(exc).__name__,
                "file": os.path.basename(root.filename) if root else "unknown",
                "line": root.lineno if root else 0,
                "function": root.name if root else "unknown",
                "message": str(exc),
                "analysis": analysis
            }
        except Exception:
            return {"type": type(exc).__name__, "message": str(exc)}

    @staticmethod
    async def capture_request_context(request: Any) -> dict[str, Any]:
        """Captures request context with masking. Fail-safe."""
        try:
            headers = dict(request.headers)
            for s in ["authorization", "password", "token", "cookie"]:
                if s in headers: headers[s] = "[MASKED]"
            
            body = "[REDACTED]"
            try:
                raw = await request.body()
                if raw: body = raw.decode("utf-8")[:500]
            except Exception:
                pass  # Body read failure is expected for some request types

            return {
                "path": request.url.path,
                "method": request.method,
                "headers": headers,
                "body": body
            }
        except Exception:
            return {"error": "capture_failed"}
    @staticmethod
    def record_document_create(
        db: sqlite3.Connection,
        entity_type: str,
        entity_id: str,
        module_path: str,
        payload: dict[str, Any],
        actor: str = "SYSTEM"
    ) -> str:
        """Helper to record a document creation event."""
        return Diagnostics.record(
            db=db,
            event_class=EventClass.DOCUMENT_CREATE,
            module_path=module_path,
            entity_id=entity_id,
            payload=payload,
            entity_type=entity_type,
            actor=actor
        )

    @staticmethod
    def record_quantity_change(
        db: sqlite3.Connection,
        entity_type: str,
        entity_id: str,
        module_path: str,
        field_name: str,
        old_value: Any,
        new_value: Any,
        po_item_id: str | None = None,
        source: str | None = None,
        payload: dict[str, Any] | None = None,
        actor: str = "SYSTEM"
    ) -> str:
        """Helper to record a quantity change event."""
        final_payload = payload or {}
        final_payload.update({
            "field_name": field_name,
            "old_value": old_value,
            "new_value": new_value,
            "po_item_id": po_item_id,
            "source": source
        })
        
        return Diagnostics.record(
            db=db,
            event_class=EventClass.QUANTITY_UPDATE,
            module_path=module_path,
            entity_id=entity_id,
            payload=final_payload,
            entity_type=entity_type,
            actor=actor
        )

    @staticmethod
    def record_deviation(
        db: sqlite3.Connection,
        entity_type: str,
        entity_id: str,
        module_path: str,
        deviation_type: str,
        expected_value: Any,
        actual_value: Any,
        severity: str = "WARNING",
        payload: dict[str, Any] | None = None,
        actor: str = "SYSTEM"
    ) -> str:
        """Helper to record a non-blocking deviation."""
        final_payload = payload or {}
        final_payload.update({
            "deviation_type": deviation_type,
            "expected_value": expected_value,
            "actual_value": actual_value
        })

        return Diagnostics.record(
            db=db,
            event_class=EventClass.DEVIATION_DETECTED,
            module_path=module_path,
            entity_id=entity_id,
            payload=final_payload,
            entity_type=entity_type,
            actor=actor,
            severity=severity
        )

    @staticmethod
    def record_status_transition(
        db: sqlite3.Connection,
        entity_type: str,
        entity_id: str,
        module_path: str,
        old_status: str,
        new_status: str,
        trigger: str | None = "UNKNOWN",
        payload: dict[str, Any] | None = None,
        actor: str = "SYSTEM"
    ) -> str:
        """Helper to record a status transition."""
        final_payload = payload or {}
        final_payload.update({
            "old_status": old_status,
            "new_status": new_status,
            "trigger": trigger
        })

        return Diagnostics.record(
            db=db,
            event_class=EventClass.STATUS_TRANSITION,
            module_path=module_path,
            entity_id=entity_id,
            payload=final_payload,
            entity_type=entity_type,
            actor=actor
        )

    @staticmethod
    @contextlib.contextmanager
    def timer(operation: str, entity_id: str, db: sqlite3.Connection):
        """Context manager to time flow execution."""
        start_ts = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_ts
            try:
                Diagnostics.record(
                    db=db,
                    event_class=EventClass.PERFORMANCE_METRIC,
                    module_path="backend.core.diagnostics",
                    entity_id=entity_id,
                    payload={
                        "operation": operation,
                        "duration_sec": round(duration, 4)
                    }
                )
            except Exception as e:
                logger.error(f"Failed to record timer metric: {e}")

    @staticmethod
    def list_paginated_logs(
        db: sqlite3.Connection,
        limit: int = 100,
        offset: int = 0,
        event_class: str | None = None,
        actor: str | None = None,
        module: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        search_query: str | None = None,
        sort_by: str | None = "timestamp",
        order: str | None = "desc",
        business_only: bool = False,
        category: str | None = None
    ) -> tuple[list, int]:
        """Queries the ledger with filters. Fail-safe."""
        try:
            original_factory = db.row_factory
            db.row_factory = sqlite3.Row
            try:
                query = "FROM instance_ledger WHERE 1=1"
                params = []
                
                if business_only:
                    exclude_tech = ["intelligence", "nexus", "health", "system"]
                    for kw in exclude_tech:
                        query += " AND module_path NOT LIKE ?"
                        params.append(f"%{kw}%")

                if category:
                    if category == "System Errors":
                        query += " AND (event_class LIKE '%ERROR%' OR event_class LIKE '%CRASH%' OR severity = 'HIGH' OR severity = 'CRITICAL')"
                    elif category == "Orders (PO)":
                        query += " AND (event_class LIKE 'PO_%' OR module_path LIKE '%po%')"
                    elif category == "Dispatch (DC)":
                        query += " AND (event_class LIKE 'DC_%' OR module_path LIKE '%dc%')"
                    elif category == "Invoicing":
                        query += " AND (event_class LIKE 'INVOICE_%' OR module_path LIKE '%invoice%')"
                    elif category == "Receipts (SRV)":
                        query += " AND (event_class LIKE 'SRV_%' OR module_path LIKE '%srv%')"
                    elif category == "Settings":
                        query += " AND (event_class LIKE 'CONFIG%' OR module_path LIKE '%setting%')"

                if event_class:
                    query += " AND event_class = ?"
                    params.append(event_class)
                if actor:
                    query += " AND actor = ?"
                    params.append(actor)
                if module:
                    query += " AND module_path LIKE ?"
                    params.append(f"%{module}%")
                if start_date:
                    query += " AND created_at >= ?"
                    params.append(start_date)
                if end_date:
                    query += " AND created_at <= ?"
                    params.append(end_date)
                if search_query:
                    query += " AND (payload_json LIKE ? OR entity_id LIKE ?)"
                    params.extend([f"%{search_query}%", f"%{search_query}%"])

                db_order = "DESC" if (order or "desc").lower() == "desc" else "ASC"

                total = db.execute(f"SELECT COUNT(*) as total {query}", params).fetchone()["total"]
                logs = db.execute(f"SELECT *, created_at {query} ORDER BY created_at {db_order} LIMIT ? OFFSET ?", [*params, limit, offset]).fetchall()
                return [dict(log) for log in logs], total
            finally:
                db.row_factory = original_factory
        except Exception as e:
            logger.error(f"Diagnostics.list_paginated_logs FAIL: {e}")
            return [], 0

    @staticmethod
    def get_forensics(db: sqlite3.Connection, entity_id: str) -> list[dict[str, Any]]:
        """History for a specific document."""
        original_factory = db.row_factory
        db.row_factory = sqlite3.Row
        try:
            logs = db.execute(
                "SELECT * FROM instance_ledger WHERE entity_id = ? ORDER BY created_at ASC",
                (entity_id,)
            ).fetchall()
            return [dict(log) for log in logs]
        finally:
            db.row_factory = original_factory

    @staticmethod
    def justify(
        db: sqlite3.Connection,
        problem_context: str,
        chosen_action: str,
        evidence: dict[str, Any],
        module: str,
        entity_id: str
    ) -> str:
        """Justify a deviation or decision."""
        payload = {
            "problem": problem_context,
            "action": chosen_action,
            "evidence": evidence
        }
        return Diagnostics.record(
            db=db,
            event_class=EventClass.DEVIATION_DETECTED,
            module_path=module,
            entity_id=entity_id,
            payload=payload,
            severity="WARNING"
        )

    @staticmethod
    def scan_orphaned_transactions(db: sqlite3.Connection) -> list[dict[str, Any]]:
        """Finds transactions that started but never committed."""
        query = """
        SELECT s.* 
        FROM instance_ledger s
        WHERE s.event_class = 'TRANSACTION_START'
        AND NOT EXISTS (
            SELECT 1 FROM instance_ledger c 
            WHERE c.entity_id = s.entity_id 
            AND c.event_class = 'TRANSACTION_COMMIT'
        )
        ORDER BY s.created_at DESC
        Limit 20
        """
        original_factory = db.row_factory
        db.row_factory = sqlite3.Row
        try:
            logs = list(db.execute(query).fetchall())
            return [dict(log) for log in logs]
        finally:
            db.row_factory = original_factory
