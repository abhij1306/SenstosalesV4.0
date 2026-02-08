"""
SRV API Router (Controller)
Delegates all business logic and data access to SRV Service.
"""

import logging
import re
import sqlite3

from fastapi import APIRouter, Depends, File, UploadFile

from backend.core.errors import bad_request, internal_error, not_found
from backend.core.intelligence import LedgerLogger
from backend.db.models import (
    PaginatedResponse,
    SRVDetail,
    SRVListItemOptimized,
    SRVStats,
)
from backend.db.session import get_db, transactional
from backend.services.srv_ingestion_optimized import (
    delete_srv as service_delete_srv,
)
from backend.services.srv_ingestion_optimized import (
    get_srv_detail as service_get_srv_detail,
)
from backend.services.srv_ingestion_optimized import (
    get_srv_stats as service_get_srv_stats,
)
from backend.services.srv_ingestion_optimized import (
    list_srvs_paginated,
    process_srv_file_async,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload/batch/")
async def upload_batch_srvs(files: list[UploadFile] = File(...), db: sqlite3.Connection = Depends(get_db)):
    """
    Upload multiple SRV HTML files.
    """
    results = []
    successful_count = 0
    failed_count = 0

    for file in files:
        try:
            if not file.filename.endswith(".html"):
                results.append({"filename": file.filename, "success": False, "message": "Invalid file type. Only HTML allowed."})
                failed_count += 1
                continue

            po_match = re.search(r"PO_?(\d+)", file.filename, re.IGNORECASE) or \
                       re.search(r"SRV_(\d+)", file.filename, re.IGNORECASE) or \
                       re.search(r"^(\d+)", file.filename)
            
            po_from_filename = po_match.group(1) if po_match else None
            content = await file.read()
            
            success, detailed_results, s_count, f_count = await process_srv_file_async(content, file.filename, db, po_from_filename)

            msg_list = [res.get("message", "") for res in detailed_results]
            status_type = detailed_results[0].get("status_type") if detailed_results else None
            
            results.append({
                "filename": file.filename,
                "success": success,
                "message": "; ".join(msg_list),
                "successful": s_count,
                "failed": f_count,
                "status_type": status_type
            })
            successful_count += s_count
            failed_count += f_count

        except Exception as e:
            logger.error(f"Failed to process {file.filename}: {e}")
            results.append({"filename": file.filename, "success": False, "message": str(e)})
            failed_count += 1

    return {
        "total": len(files),
        "successful": successful_count,
        "failed": failed_count,
        "results": results,
    }


@router.get("/", response_model=PaginatedResponse[SRVListItemOptimized])
def get_srv_list(
    po_number: str = None,
    sort_by: str = "srv_date",
    order: str = "desc",
    offset: int = 0,
    limit: int = 100,
    search: str | None = None,
    db: sqlite3.Connection = Depends(get_db),
):
    """
    Get list of SRVs with pagination.
    """
    try:
        data = list_srvs_paginated(db, po_number, sort_by, order, offset, limit, search)
        return PaginatedResponse(**data)
    except Exception as e:
        logger.error(f"Failed to list SRVs: {e}")
        raise internal_error(str(e))


@router.get("/po/{po_number:path}/srvs/")
def get_srvs_by_po(po_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Get list of SRVs for a specific PO."""
    try:
        # We can reuse the list logic or a simple query if it's very specific
        result = list_srvs_paginated(db, po_number=po_number, limit=100) # Simple enough
        return result
    except Exception as e:
        logger.error(f"Failed to get SRVs for PO {po_number}: {e}")
        raise internal_error(str(e))


@router.get("/stats/", response_model=SRVStats)
def get_srv_stats(db: sqlite3.Connection = Depends(get_db)):
    """Get SRV Statistics"""
    try:
        return service_get_srv_stats(db)
    except Exception as e:
        logger.error(f"Failed to get SRV stats: {e}")
        raise internal_error(str(e))


@router.get("/{srv_number:path}/", response_model=SRVDetail)
def get_srv_detail(srv_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Get SRV Details"""
    try:
        return service_get_srv_detail(srv_number, db)
    except Exception as e:
        from backend.core.exceptions import ResourceNotFoundError
        if isinstance(e, ResourceNotFoundError):
            raise not_found(str(e))
        logger.error(f"Failed to get SRV {srv_number}: {e}")
        raise internal_error(str(e))


@router.delete("/{srv_number:path}/")
@transactional
def delete_srv_endpoint(srv_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Delete an SRV"""
    success, message = service_delete_srv(srv_number, db)
    if not success:
        raise bad_request(message)
    
    LedgerLogger.record(
        db,
        event_class="SRV_DELETED",
        module_path="backend.api.srv",
        entity_type="SRV",
        entity_id=srv_number,
        payload={},
        actor="USER"
    )
    return {"message": message}
