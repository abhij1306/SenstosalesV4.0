"""
Optimized SRV Ingestion Service
Fixes: Async processing, batch operations, memory efficiency.
Now utilizes SRVRepository for data access.
"""

import asyncio
import logging
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from backend.core.constants import DEFAULT_BATCH_SIZE
from backend.core.exceptions import ResourceNotFoundError
from backend.core.intelligence import ErrorSeverity, ErrorType, EventClass, LedgerLogger
from backend.core.number_utils import to_qty
from backend.core.parsers.srv_parser import scrape_srv_html
from backend.core.utils import get_financial_year
from backend.repositories.srv_repository import SRVRepository
from backend.services.deviation_service import DeviationService
from backend.services.reconciliation_v2 import ReconciliationService
from backend.services.validation_service import ValidationService

logger = logging.getLogger(__name__)


async def process_srv_file_async(
    contents: bytes,
    filename: str,
    db: sqlite3.Connection,
    po_from_filename: str | None = None,
) -> tuple[bool, list[dict], int, int]:
    """
    Async SRV processing with batch operations and memory optimization.
    """
    try:
        # Step 1: Async HTML parsing to prevent blocking
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=2) as executor:
            html_content = await loop.run_in_executor(executor, lambda: contents.decode("utf-8"))
            srv_list = await loop.run_in_executor(executor, scrape_srv_html, html_content)

        if not srv_list:
            return False, ["No valid SRVs found in file"], 0, 1

        # Record start of transaction with LedgerLogger
        with LedgerLogger.timer("process_srv_file", filename, db):
            pass
        
        # Record start of processing with a single comprehensive event
        LedgerLogger.record(
            db=db,
            event_class=EventClass.BATCH_OPERATION_START,
            module_path="backend.services.srv_ingestion",
            entity_type="SRV_FILE",
            entity_id=filename,
            payload={
                "file_size": len(contents),
                "srv_count": len(srv_list),
                "timestamp": datetime.now().isoformat()
            },
            actor="SYSTEM"
        )
        db.commit() # Commit start log immediately

        # Step 2: Batch validation and processing
        results = []
        success_count = 0
        failed_count = 0

        batch_size = DEFAULT_BATCH_SIZE
        for i in range(0, len(srv_list), batch_size):
            batch = srv_list[i : i + batch_size]
            batch_results = await process_srv_batch(batch, db, po_from_filename)

            for result in batch_results:
                results.append(result)
                if result["success"]:
                    success_count += 1
                else:
                    failed_count += 1

        return success_count > 0, results, success_count, failed_count

    except Exception as e:
        logger.exception("SRV extraction failed")
        
        # Consolidate error capture
        LedgerLogger.capture_error(
            db=db,
            error=e,
            severity=ErrorSeverity.HIGH,
            error_type=ErrorType.IO,
            module="backend.services.srv_ingestion",
            entity_id=filename
        )
        db.commit() # Commit error log since this is the outer wrapper
        
        return False, [f"Processing error: {e!s}"], 0, 1


async def process_srv_batch(srv_batch: list[dict], db: sqlite3.Connection, po_from_filename: str | None) -> list[dict]:
    """Process a batch of SRVs with single transaction"""
    results = []
    repo = SRVRepository(db)

    try:
        # Transaction is handled outside if called from API @transactional, 
        # but ingestion uses its own manual transaction for batching control.
        db.execute("BEGIN TRANSACTION")

        for srv_data in srv_batch:
            header = srv_data.get("header", {})

            if not header.get("po_number") and po_from_filename:
                header["po_number"] = str(po_from_filename)

            if not header.get("srv_number") or not header.get("po_number"):
                results.append({"success": False, "srv_number": header.get("srv_number", "Unknown"), "message": "Missing SRV or PO number"})
                continue

            try:
                ValidationService.validate_po_exists(db, header["po_number"])
            except ResourceNotFoundError:
                results.append({
                    "success": False,
                    "srv_number": header["srv_number"],
                    "message": f"PO {header['po_number']} not found. Please upload PO first.",
                })
                continue

            status_type = "OVERWRITE" if repo.check_exists(header["srv_number"]) else "NEW"
            if status_type == "OVERWRITE":
                repo.delete(header["srv_number"])

            success = ingest_srv_internal(srv_data, repo, db)
            item_count = len(srv_data.get("items", []))

            results.append({
                "success": success,
                "srv_number": header["srv_number"],
                "item_count": item_count,
                "status_type": status_type if success else "FAILED",
                "message": "Processed successfully" if success else "Database insertion failed"
            })

        # Reconcile POs
        po_numbers = {srv["header"]["po_number"] for srv in srv_batch if srv.get("header", {}).get("po_number")}
        for po_number in po_numbers:
            ReconciliationService.sync_po(db, po_number)
            
            # Record SRV batch ingested event as a single record
            srv_count = len([s for s in srv_batch if s["header"].get("po_number") == po_number])
            LedgerLogger.record(
                db=db,
                event_class=EventClass.SRV_BATCH_INGESTED,
                module_path="backend.services.srv_ingestion",
                entity_type="SRV_BATCH",
                entity_id=f"PO_{po_number}",
                payload={
                    "po_number": po_number,
                    "srv_count": srv_count,
                    "status": "SUCCESS",
                    "srv_numbers": [s["header"]["srv_number"] for s in srv_batch if s["header"].get("po_number") == po_number]
                },
                actor="SYSTEM"
            )

        db.commit()

    except Exception as e:
        db.rollback()
        logger.error(f"Batch processing error: {e}")
        
        # Consolidate batch error capture
        LedgerLogger.capture_error(
            db=db,
            error=e,
            severity=ErrorSeverity.HIGH,
            error_type=ErrorType.LOGIC,
            module="backend.services.srv_ingestion",
            entity_id="BATCH_PROCESS"
        )
        db.commit() # Commit the error log
        
        for srv_data in srv_batch:
            results.append({"success": False, "srv_number": srv_data.get("header", {}).get("srv_number", "Unknown"), "message": f"Batch error: {e!s}"})

    return results


def ingest_srv_internal(srv_data: dict, repo: SRVRepository, db: sqlite3.Connection) -> bool:
    """Internal ingestion logic using repository"""
    header = srv_data["header"]
    items = srv_data["items"]

    try:
        srv_date = header.get("srv_date")
        srv_fy = get_financial_year(srv_date) if srv_date else None
        
        repo.insert_header({
            "srv_number": header["srv_number"],
            "srv_date": header["srv_date"],
            "po_number": header["po_number"],
            "invoice_number": items[0].get("invoice_no") if items else None
        })

        # Record SRV document creation with LedgerLogger
        LedgerLogger.record_document_create(
            db=db,
            entity_type="SRV",
            entity_id=header["srv_number"],
            module_path="backend.services.srv_ingestion",
            payload={
                "srv_date": header["srv_date"],
                "po_number": header["po_number"],
                "invoice_number": items[0].get("invoice_no") if items else None,
                "item_count": len(items)
            },
            actor="SYSTEM"
        )

        item_data = []
        for item in items:
            received_qty = to_qty(item.get("rcd_qty"))
            rejected_qty = to_qty(item.get("rej_qty"))
            accepted_qty = to_qty(item.get("accepted_qty"))

            challan_no = item.get("challan_no")
            validated_challan_no = None
            
            if challan_no and srv_fy:
                dc = repo.get_dc_by_number(str(challan_no))
                if dc:
                    dc_fy = get_financial_year(dc["dc_date"]) if dc["dc_date"] else None
                    if dc_fy == srv_fy:
                        validated_challan_no = challan_no
            
            item_id = f"{header['srv_number']}_{item['po_item_no']}_{item.get('lot_no', 0)}_{item.get('srv_item_no', 0)}"
            
            item_data.append((
                item_id, header["srv_number"], header["po_number"], item["po_item_no"],
                item.get("lot_no"), item.get("srv_item_no", 0), item.get("rev_no", "0"),
                received_qty, rejected_qty, accepted_qty, to_qty(item.get("ord_qty", 0)),
                to_qty(item.get("challan_qty", 0)), item.get("unit"), validated_challan_no,
                item.get("challan_date"), item.get("invoice_no"), item.get("invoice_date"),
                item.get("div_code"), item.get("pmir_no"), item.get("finance_date"),
                item.get("cnote_no"), item.get("cnote_date"), item.get("remarks"),
                datetime.now().isoformat()
            ))
            
            # Deviations
            srv_ord_qty = to_qty(item.get("ord_qty", 0))
            if srv_ord_qty > 0:
                DeviationService.check_qty_mismatch(
                    db=db, srv_item_id=item_id, po_number=header["po_number"],
                    po_item_no=item["po_item_no"], srv_ord_qty=srv_ord_qty
                )
                
                # Record deviation detection with LedgerLogger
                po_qty = to_qty(item.get("ord_qty", 0))
                if received_qty > po_qty:
                    LedgerLogger.record_deviation(
                        db=db,
                        entity_type="SRV",
                        entity_id=header["srv_number"],
                        module_path="backend.services.srv_ingestion",
                        deviation_type="QUANTITY_OVER",
                        expected_value=po_qty,
                        actual_value=received_qty,
                        severity="WARN",
                        actor="SYSTEM"
                    )

        repo.insert_items(item_data)
        return True

    except Exception as e:
        logger.error(f"Ingestion failed for {header.get('srv_number')}: {e}")
        return False


def delete_srv(srv_number: str, db: sqlite3.Connection) -> tuple[bool, str]:
    """Delete an SRV and reconcile PO"""
    repo = SRVRepository(db)
    try:
        header = repo.get_header(srv_number)
        if not header:
            return False, f"SRV {srv_number} not found"
        
        repo.delete(srv_number)
        ReconciliationService.sync_po(db, header["po_number"])
        
        return True, f"SRV {srv_number} deleted and PO {header['po_number']} reconciled"
    except Exception as e:
        logger.error(f"Deletion failed for {srv_number}: {e}")
        return False, str(e)


def get_srv_stats(db: sqlite3.Connection) -> dict:
    """Get SRV Statistics"""
    repo = SRVRepository(db)
    result = repo.get_stats()

    total_received = float(result["total_received"] or 0)
    total_rejected = float(result["total_rejected"] or 0)
    total_qty = total_received + total_rejected
    rejection_rate = (total_rejected / total_qty * 100) if total_qty > 0 else 0.0

    return {
        "total_srvs": result["total_srvs"] or 0,
        "total_rcd_qty": total_received,
        "total_rej_qty": total_rejected,
        "rejection_rate": round(rejection_rate, 2),
        "missing_po_count": int(result["missing_po_count"] or 0),
    }


def list_srvs_paginated(
    db: sqlite3.Connection,
    po_number: str | None = None,
    sort_by: str = "srv_date",
    order: str = "desc",
    offset: int = 0,
    limit: int = 100,
    search: str | None = None,
) -> dict:
    """List SRVs with pagination"""
    repo = SRVRepository(db)
    
    # Map sort keys
    sort_map = {
        "srv_date": "s.srv_date",
        "srv_number": "s.srv_number",
        "po_number": "s.po_number",
        "total_rcd_qty": "total_received_qty",
        "total_rej_qty": "total_rejected_qty",
        "total_accepted_qty": "total_accepted_qty",
        "total_ord_qty": "total_ord_qty",
        "total_challan_qty": "total_challan_qty",
        "created_at": "s.created_at"
    }
    db_sort_col = sort_map.get(sort_by, "s.srv_date")
    db_order = "DESC" if order.lower() == "desc" else "ASC"

    rows = repo.list_paginated(po_number, limit, offset, db_sort_col, db_order, search)
    total_count = repo.get_count_paginated(po_number, search)
    filtered_stats = repo.get_filtered_stats(po_number, search)

    items = []
    for row in rows:
        items.append({
            "srv_number": row["srv_number"],
            "srv_date": row["srv_date"],
            "po_number": row["po_number"],
            "total_rcd_qty": float(row["total_received_qty"]),
            "total_rej_qty": float(row["total_rejected_qty"]),
            "total_accepted_qty": float(row["total_accepted_qty"]),
            "total_ord_qty": float(row["total_ord_qty"]),
            "total_challan_qty": float(row["total_challan_qty"]),
            "po_found": bool(row["po_found"]),
            "warning_message": None if bool(row["po_found"]) else f"PO {row['po_number']} not found",
            "created_at": row["created_at"],
        })

    return {
        "items": items,
        "metadata": {
            "total_count": total_count,
            "page": (offset // limit) + 1,
            "limit": limit,
            "total_received": filtered_stats.get("total_received"),
            "total_rejected": filtered_stats.get("total_rejected"),
            "total_accepted": filtered_stats.get("total_accepted")
        }
    }


def get_srv_detail(srv_number: str, db: sqlite3.Connection) -> dict:
    """Get SRV detail with items"""
    repo = SRVRepository(db)
    header = repo.get_header(srv_number)
    if not header:
        raise ResourceNotFoundError("SRV", srv_number)
    
    items = repo.get_items(srv_number)
    return {
        "header": header,
        "items": items
    }
