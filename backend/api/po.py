"""
Purchase Order Router (Controller)
Delegates all business logic and data access to PO Service and Ingestion Service.
"""

import asyncio
import logging
import sqlite3

from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, File, Query, UploadFile

from backend.core.errors import bad_request, not_found
from backend.core.exceptions import ResourceNotFoundError, ValidationError
from backend.core.intelligence import LedgerLogger
from backend.core.parsers.po_parser import extract_po_header, extract_po_items
from backend.db.models import (
    PaginatedMetadata,
    PaginatedResponse,
    PODetail,
    POListItem,
    POStats,
)
from backend.db.session import db_transaction, get_db, transactional
from backend.services.ingest_po import POIngestionService
from backend.services.po_service import po_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/stats/", response_model=POStats)
def get_po_stats(db: sqlite3.Connection = Depends(get_db)):
    """Get aggregated PO statistics"""
    return po_service.get_stats(db)


@router.get("/", response_model=PaginatedResponse[POListItem])
def list_pos(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    sort_by: str = "created_at",
    order: str = "desc",
    search: str | None = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """List all Purchase Orders with pagination and filtered stats"""
    items, total_count, filtered_stats = po_service.list_pos(
        db, limit=limit, offset=offset, sort_by=sort_by, order=order, search=search
    )
    
    return PaginatedResponse(
        items=items,
        metadata=PaginatedMetadata(
            total_count=total_count,
            page=(offset // limit) + 1,
            limit=limit,
            total_value=filtered_stats.get("total_value"),
            total_shipped=filtered_stats.get("total_shipped"),
            total_rejected=filtered_stats.get("total_rejected"),
            total_received=filtered_stats.get("total_received")
        )
    )


@router.get("/{po_number:path}/context/")
def get_po_context(po_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Fetch PO context (Supplier/Buyer info) for DC/Invoice auto-fill"""
    try:
        return po_service.get_po_context(db, po_number)
    except ResourceNotFoundError as e:
        raise not_found(str(e))


@router.get("/{po_number:path}/dc/")
def check_po_has_dc(po_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Check if PO has an associated Delivery Challan"""
    return po_service.check_po_has_dc(db, po_number)




@router.get("/{po_number:path}/", response_model=PODetail)
def get_po_detail(po_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Get Purchase Order detail with items and deliveries"""
    try:
        return po_service.get_po_detail(db, po_number)
    except ResourceNotFoundError as e:
        raise not_found(str(e))


def _record_po_creation(db: sqlite3.Connection, po_number: str, supplier_name: str, po_value: float):
    """Records the creation of a PO."""
    LedgerLogger.record(
        db,
        event_class="PO_CREATED",
        module_path="backend.api.po",
        entity_type="PURCHASE_ORDER",
        entity_id=po_number,
        payload={"value": po_value, "supplier": supplier_name},
        actor="USER"
    )

@router.post("/", response_model=PODetail)
@transactional
async def create_po_manual(po_data: PODetail, db: sqlite3.Connection = Depends(get_db)):
    """Manually create a Purchase Order"""
    try:
        result = po_service.process_po_update(po_data, db)
        _record_po_creation(db, result.header.po_number, result.header.supplier_name, result.header.po_value)
        return result
    except ValidationError as e:
        raise bad_request(str(e))


def _record_po_update(db: sqlite3.Connection, po_number: str, amend_no: int, po_value: float):
    """Records the update of a PO."""
    LedgerLogger.record(
        db,
        event_class="PO_UPDATED",
        module_path="backend.api.po",
        entity_type="PURCHASE_ORDER",
        entity_id=po_number,
        payload={"amend_no": amend_no, "value": po_value},
        actor="USER"
    )

@router.put("/{po_number:path}/", response_model=PODetail)
@transactional
async def update_po(po_number: str, po_data: PODetail, db: sqlite3.Connection = Depends(get_db)):
    """Update an existing Purchase Order"""
    try:
        po_data.header.po_number = po_number
        result = po_service.process_po_update(po_data, db)
        _record_po_update(db, po_number, result.header.amend_no, result.header.po_value)
        return result
    except ValidationError as e:
        raise bad_request(str(e))


def parse_po_html_content(content: bytes):
    """CPU-bound parsing for offloading to thread"""
    soup = BeautifulSoup(content, "lxml")
    po_header = extract_po_header(soup)
    po_items = extract_po_items(soup)
    return po_header, po_items


async def _parse_and_ingest_single_po(
    db: sqlite3.Connection, file: UploadFile
) -> tuple[bool, list[str], str | None, str | None]:
    """
    Helper to parse and ingest a single PO HTML file.
    Returns (success, warnings, po_number, status_type).
    """
    content = await file.read()
    po_header, po_items = await asyncio.to_thread(parse_po_html_content, content)

    po_number = po_header.get("PURCHASE ORDER")
    if not po_number:
        return False, ["Could not extract PO number from HTML"], None, None

    ingestion_service = POIngestionService()
    success, warnings, status_type = ingestion_service.ingest_po(db, po_header, po_items)

    return success, warnings, po_number, status_type


@router.post("/upload/")
@transactional
async def upload_po_html(file: UploadFile = File(...), db: sqlite3.Connection = Depends(get_db)):
    """Upload and parse PO HTML file (Async Offloaded)"""
    if not file.filename.endswith(".html"):
        raise bad_request("Only HTML files are supported")

    success, warnings, po_number, _ = await _parse_and_ingest_single_po(db, file)

    if not success:
        raise bad_request(f"Ingestion failed: {', '.join(warnings)}")

    return {
        "success": True,
        "po_number": po_number,
        "warnings": warnings,
    }


@router.post("/upload/batch/")
async def upload_po_batch(files: list[UploadFile] = File(...), db: sqlite3.Connection = Depends(get_db)):
    """Batch upload POs - processes files in parallel"""
    
    async def process_single_file(file: UploadFile) -> dict:
        """Process a single file and return result"""
        try:
            if not file.filename.endswith(".html"):
                return {
                    "filename": file.filename,
                    "success": False,
                    "po_number": None,
                    "message": "Only HTML files are supported"
                }

            # Use the existing db_transaction context for each file
            with db_transaction(db):
                success, warnings, po_number, status_type = await _parse_and_ingest_single_po(db, file)
                
                if not success:
                    return {
                        "filename": file.filename,
                        "success": False,
                        "po_number": None,
                        "message": f"Ingestion failed: {', '.join(warnings)}"
                    }
                
                return {
                    "filename": file.filename,
                    "success": True,
                    "po_number": po_number,
                    "status_type": status_type,
                    "message": ", ".join(warnings) if warnings else "Success"
                }
        except Exception as e:
            return {
                "filename": file.filename,
                "success": False,
                "po_number": None,
                "message": str(e)
            }

    # Process all files in parallel
    results = await asyncio.gather(*[process_single_file(file) for file in files])

    successful = sum(1 for r in results if r["success"])
    failed = len(results) - successful
    return {"total": len(files), "successful": successful, "failed": failed, "results": results}