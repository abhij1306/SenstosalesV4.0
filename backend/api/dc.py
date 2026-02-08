"""
Delivery Challan Router (Controller Layer)
Responsible for routing, delegation, and formatting responses.
"""

import logging
import re
import sqlite3

from fastapi import APIRouter, Depends, Query

from backend.core.errors import bad_request, internal_error, not_found
from backend.core.intelligence import LedgerLogger
from backend.db.models import (
    DCCreate,
    DCListItem,
    DCStats,
    PaginatedResponse,
)
from backend.db.session import get_db, transactional
from backend.services.dc import (
    check_dc_has_invoice,
    get_dispatchable_items_for_po,
)
from backend.services.dc import (
    create_dc as service_create_dc,
)
from backend.services.dc import (
    delete_dc as service_delete_dc,
)
from backend.services.dc import (
    get_dc_detail as service_get_dc_detail,
)
from backend.services.dc import (
    get_dc_stats as service_get_dc_stats,
)
from backend.services.dc import (
    list_dcs_paginated as service_list_dcs,
)
from backend.services.dc import (
    update_dc as service_update_dc,
)
from backend.services.dc import (
    update_dc_header as service_update_dc_header,
)
from backend.utils.csv_utils import generate_csv_from_objects
from backend.utils.file_utils import get_save_path

logger = logging.getLogger(__name__)
router = APIRouter()

# Security: Simple alphanumeric pattern for filename sanitization
_SIMPLE_FILENAME_PATTERN = re.compile(r"^[\w\-]+$")


def _sanitize_filename(filename: str, max_length: int = 100) -> str:
    """Sanitize filename to prevent path traversal attacks."""
    filename = filename.replace("..", "_").replace("/", "_").replace("\\", "_")
    if not _SIMPLE_FILENAME_PATTERN.match(filename):
        return "export"
    return filename[:max_length]


def _sanitize_po_or_dc_param(param: str | None, default: str = "All") -> str:
    """Sanitize PO or DC parameter for filename."""
    if not param:
        return default
    sanitized = param.replace("..", "_").replace("/", "_").replace("\\", "_")
    return sanitized[:50]


@router.get("/po/{po_number:path}/dispatchable-items/")
def get_dispatchable_items(po_number: str, db: sqlite3.Connection = Depends(get_db)):
    """
    Fetch dispatchable items and PO header for DC creation.
    Delegates to service layer.
    """
    result = get_dispatchable_items_for_po(po_number, db)
    if result.success:
        return result.data
    raise internal_error(result.message)


@router.get("/stats/", response_model=DCStats)
def get_dc_stats(db: sqlite3.Connection = Depends(get_db)):
    """Get DC Page Statistics"""
    result = service_get_dc_stats(db)
    if result.success:
        return result.data
    raise internal_error(result.message)


@router.get("/", response_model=PaginatedResponse[DCListItem])
def list_dcs(
    po: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    sort_by: str = "created_at",
    order: str = "desc",
    search: str | None = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """List all Delivery Challans (Paginated)"""
    result = service_list_dcs(db, po, limit, offset, sort_by, order, search)
    if result.success:
        return result.data
    raise internal_error(result.message)


def _generate_dcs_csv(data: list[DCListItem]) -> bytes:
    """Generate CSV bytes from a list of DCs."""
    headers = [
        "Record", "Date", "Contract", "Consignee", "Status",
        "Value", "Ord Qty", "Delivered Qty", "Pending Qty", "Received Qty"
    ]
    
    attr_map = {
        "Record": "dc_number",
        "Date": "dc_date",
        "Contract": "po_number",
        "Consignee": "consignee_name",
        "Status": "status",
        "Value": "total_value",
        "Ord Qty": "total_ord_qty",
        "Delivered Qty": "total_dsp_qty",
        "Pending Qty": "total_pending_qty",
        "Received Qty": "total_rcd_qty"
    }
    
    csv_io = generate_csv_from_objects(headers, data, attr_map)
    return csv_io.getvalue()


from backend.services.excel_writer import ExcelWriter  # noqa: E402


@router.get("/export-list/")
def export_dcs_list(po: str | None = None, db: sqlite3.Connection = Depends(get_db)):
    """Export DC List as simple CSV (Matches UI List View)"""
    result = service_list_dcs(db, po, limit=10000)
    if not result.success:
        raise internal_error(result.message)
        
    csv_bytes = _generate_dcs_csv(result.data.items)
    safe_po = _sanitize_po_or_dc_param(po)
    filename = f"DC_List_Export_{safe_po}.csv"
    
    save_path = get_save_path(db, "challan_summary")
    return ExcelWriter._save_or_stream(csv_bytes, filename, save_path, media_type="text/csv")


@router.get("/{dc_number:path}/invoice/")
def check_dc_has_invoice_endpoint(dc_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Check if DC has an associated GST Invoice"""
    invoice_number = check_dc_has_invoice(dc_number, db)
    return {"has_invoice": bool(invoice_number), "invoice_number": invoice_number}


from backend.services.dc_excel import DCExcel  # noqa: E402
from backend.services.guarantee_certificate_excel import GuaranteeCertificateExcel  # noqa: E402


def _generate_and_stream_gc_excel(dc_number: str, data: dict, db: sqlite3.Connection):
    """Generate and stream the Guarantee Certificate Excel file."""
    save_path = get_save_path(db, "gc")
    data["save_path"] = save_path
    safe_dc = _sanitize_filename(dc_number)
    LedgerLogger.record(
        db,
        event_class="DC_DOWNLOAD_GC",
        entity_type="DELIVERY_CHALLAN",
        entity_id=dc_number,
        module_path="backend.api.dc",
        payload={"filename": f"GC_{safe_dc}.xlsx"}
    )
    return GuaranteeCertificateExcel(data["header"], data["items"], db, save_path=save_path).generate_excel(f"GC_{safe_dc}.xlsx")

@router.get("/{dc_number:path}/download-gc/")
def download_gc_excel(dc_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Download Guarantee Certificate (GC) as Excel"""
    result = service_get_dc_detail(dc_number, db)
    if not result.success:
        if result.error_code == "RESOURCE_NOT_FOUND":
            raise not_found(result.message, "DC")
        raise internal_error(result.message)
    
    return _generate_and_stream_gc_excel(dc_number, result.data, db)

def _generate_and_stream_dc_excel(dc_number: str, data: dict, db: sqlite3.Connection):
    """Generate and stream the DC Excel file."""
    save_path = get_save_path(db, "challan")
    data["save_path"] = save_path
    header_dc = data.get('header', {}).get('dc_number', 'Draft')
    safe_filename = _sanitize_filename(header_dc if header_dc else 'Draft')
    LedgerLogger.record(
        db,
        event_class="DC_DOWNLOAD_EXCEL",
        entity_type="DELIVERY_CHALLAN",
        entity_id=dc_number,
        module_path="backend.api.dc",
        payload={"filename": f"DC_{safe_filename}.xlsx"}
    )
    filename = f"DC_{safe_filename}.xlsx"
    return DCExcel(data, db).generate_excel(filename)

@router.get("/{dc_number:path}/download/")
def download_dc_excel(dc_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Download DC as Excel"""
    result = service_get_dc_detail(dc_number, db)
    if not result.success:
        if result.error_code == "RESOURCE_NOT_FOUND":
            raise not_found(result.message, "DC")
        raise internal_error(result.message)

    return _generate_and_stream_dc_excel(dc_number, result.data, db)


@router.get("/{dc_number:path}/")
def get_dc_detail(dc_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Get Delivery Challan detail with items"""
    result = service_get_dc_detail(dc_number, db)
    if result.success:
        return result.data
    if result.error_code == "RESOURCE_NOT_FOUND":
        raise not_found(result.message, "DC")
    raise internal_error(result.message)


@router.post("/")
@transactional
def create_dc(dc: DCCreate, items: list[dict], db: sqlite3.Connection = Depends(get_db)):
    """Create new Delivery Challan with items"""
    if not items:
        raise bad_request("At least one item is required")
    if len(items) > 500:
        raise bad_request("Too many items in a single DC (max 500)")

    result = service_create_dc(dc, items, db)
    if result.success:
        return result.data
    raise internal_error(result.message)


@router.put("/{dc_number:path}/")
@transactional
def update_dc(
    dc_number: str,
    dc: DCCreate,
    items: list[dict],
    db: sqlite3.Connection = Depends(get_db),
):
    """Update existing Delivery Challan"""
    if not items:
        raise bad_request("At least one item is required")
    if len(items) > 500:
        raise bad_request("Too many items in a single DC (max 500)")

    result = service_update_dc(dc_number, dc, items, db)
    if result.success:
        return result.data
    raise internal_error(result.message)


@router.put("/{dc_number:path}/metadata/")
@transactional
def update_dc_metadata(
    dc_number: str,
    update_data: dict,
    db: sqlite3.Connection = Depends(get_db),
):
    """Update DC Metadata (Restricted)"""
    result = service_update_dc_header(dc_number, update_data, db)
    if result.success:
        return result.data
    raise internal_error(result.message)



@router.delete("/{dc_number:path}/")
@transactional
def delete_dc(dc_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Delete a Delivery Challan"""
    result = service_delete_dc(dc_number, db)
    if result.success:
        return result.data
    raise internal_error(result.message)