"""
Reports Router - Unified Deterministic Reporting
Routes requests to report_service and handles file exports.
"""

import logging
import re
import sqlite3

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

import backend.services.report_service as report_service
from backend.core.errors import internal_error
from backend.db.models import PaginatedMetadata, PaginatedResponse
from backend.db.session import get_db
from backend.services.dispatch_summary_excel import DispatchSummaryExcel
from backend.services.excel_service import ExcelService
from backend.services.excel_writer import ExcelWriter
from backend.services.guarantee_certificate_excel import GuaranteeCertificateExcel
from backend.services.standard_summary_excel import StandardSummaryExcel

logger = logging.getLogger(__name__)

router = APIRouter()

# Security: Whitelist patterns for filename parameters
_FILENAME_WHITELIST_PATTERN = re.compile(r"^[\w\-]+\.[\w\-]+\.xlsx$|^[\w\-]+\.xlsx$|^[\w\-]+$")
_SIMPLE_FILENAME_PATTERN = re.compile(r"^[\w\-]+$")


def _sanitize_filename_for_export(filename: str, max_length: int = 100) -> str:
    """
    Sanitize filename to prevent path traversal attacks.
    Only allows alphanumeric characters, hyphens, underscores, and dots (for extension).
    """
    # Remove any path separators or parent directory references
    filename = filename.replace("..", "_").replace("/", "_").replace("\\", "_")
    
    # Validate against whitelist pattern
    if not _SIMPLE_FILENAME_PATTERN.match(filename):
        # Default to safe filename if invalid
        return "export"
    
    # Truncate to prevent extremely long filenames
    return filename[:max_length]


def _sanitize_po_number(po: str) -> str:
    """Sanitize PO number parameter for filename."""
    # PO numbers typically have format like "PO/12345/2024" or similar
    # Remove any path traversal characters
    sanitized = po.replace("..", "_").replace("/", "_").replace("\\", "_")
    # Limit length
    return sanitized[:50]


def _sanitize_dc_number(dc: str) -> str:
    """Sanitize DC number parameter for filename."""
    sanitized = dc.replace("..", "_").replace("/", "_").replace("\\", "_")
    return sanitized[:50]


def _sanitize_date_param(date: str) -> str:
    """Sanitize date parameter for filename."""
    # Date should be YYYY-MM-DD format
    sanitized = re.sub(r"[^0-9\-]", "_", date)
    return sanitized[:20]

class ExportSelectedRequest(BaseModel):
    item_ids: list[str]
    report_type: str | None = "pending"

# Allowed download preference keys (whitelist to prevent SQL injection)
_ALLOWED_DOWNLOAD_KEYS = frozenset(["summary", "items_summary", "challan_summary", "invoice_summary", "challan", "srv", "po", "invoice", "gc"])

def get_save_path(db: sqlite3.Connection, key: str = "summary") -> str | None:
    """Fetch preferred download path"""
    # Whitelist check to prevent SQL injection
    if key not in _ALLOWED_DOWNLOAD_KEYS:
        logger.warning(f"Invalid download key requested: {key}")
        key = "summary"  # Default to safe value
    
    try:
        row = db.execute(f"SELECT {key} FROM user_download_prefs ORDER BY id DESC LIMIT 1").fetchone()
        if row and row[key]:
            return row[key]
    except Exception as e:
        logger.warning(f"Failed to fetch download prefs for {key}: {e}")
    return None

def _get_date_range(start_date, end_date):
    if not start_date or not end_date:
        from datetime import datetime, timedelta
        end = datetime.now()
        start = end - timedelta(days=30)
        return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")
    return start_date, end_date

def _parse_frontend_ids(raw_ids: list[str]) -> list[str]:
    """
    Parses mixed ID formats from frontend.
    Handles 'type-index-UUID' format (e.g., 'pending-0-abc123...'), 
    'Row-X-ID' legacy format, and raw UUIDs.
    """
    real_ids = []
    for raw in raw_ids:
        if len(raw) == 36:
            # Assume valid UUID (full raw ID is the UUID)
            real_ids.append(raw)
        elif raw.count("-") >= 3:
            # Handle 'pending-0-uuid' or 'reconciliation-0-uuid' format
            # The format is: type-index-UUID
            # We need to extract everything after the second '-'
            parts = raw.split("-")
            # Join back everything from index 2 onwards (the UUID part)
            # UUID format: 8-4-4-4-12 chars with dashes
            potential_uuid = "-".join(parts[2:])
            if len(potential_uuid) >= 36:
                real_ids.append(potential_uuid)
            else:
                real_ids.append(raw)
        elif "-" in raw:
            # Handle legacy 'Row-X-ID' format
            parts = raw.rsplit("-", 1)
            if len(parts) > 1:
                real_ids.append(parts[-1])
            else:
                real_ids.append(raw)
        else:
             real_ids.append(raw)
    return real_ids

@router.get("/reconciliation")
def get_reconciliation_report(
    start_date: str | None = None,
    end_date: str | None = None,
    po: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    sort_by: str = "po_date",
    order: str = "desc",
    export: bool = False,
    db: sqlite3.Connection = Depends(get_db),
):
    """PO vs Delivered vs Received vs Rejected"""
    if po:
        data = report_service.get_reconciliation_lots(po, db)
        if export:
            save_path = get_save_path(db, "items_summary")
            safe_po = _sanitize_po_number(po)
            return ExcelWriter.generate_from_list(data, f"PO_Reconciliation_{safe_po}.xlsx", save_path)
        return data

    start_date, end_date = _get_date_range(start_date, end_date)
    if export:
        # Use a very high limit for export to get all data
        data, _ = report_service.get_po_reconciliation_by_date(start_date, end_date, db, limit=10000, offset=0, sort_by=sort_by, order=order)
        # Remove 'id' field from export (UUID internal identifier)
        for row in data:
            row.pop('id', None)
        save_path = get_save_path(db, "items_summary")
        return ExcelWriter.generate_from_list(data, "PO_Reconciliation_Report.xlsx", save_path)

    data, total_count = report_service.get_po_reconciliation_by_date(start_date, end_date, db, limit=limit, offset=offset, sort_by=sort_by, order=order)
    return PaginatedResponse(
        items=data,
        metadata=PaginatedMetadata(total_count=total_count, page=(offset // limit) + 1, limit=limit)
    )

@router.get("/register/dc")
def get_dc_register(
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    sort_by: str = "dc_date",
    order: str = "desc",
    export: bool = False,
    db: sqlite3.Connection = Depends(get_db),
):
    """DC Register"""
    start_date, end_date = _get_date_range(start_date, end_date)
    if export:
        data, _ = report_service.get_dc_register(start_date, end_date, db, limit=10000)
        save_path = get_save_path(db, "challan_summary")
        return ExcelWriter.generate_from_list(data, "DC_Register.xlsx", save_path)
    
    data, total_count = report_service.get_dc_register(start_date, end_date, db, limit, offset, sort_by, order)
    data = [d for d in data if d.get("dc_number")]
    return PaginatedResponse(
        items=data,
        metadata=PaginatedMetadata(total_count=total_count, page=(offset // limit) + 1, limit=limit)
    )

@router.get("/register/invoice")
def get_invoice_register(
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    sort_by: str = "invoice_date",
    order: str = "desc",
    export: bool = False,
    db: sqlite3.Connection = Depends(get_db),
):
    """Invoice Register"""
    start_date, end_date = _get_date_range(start_date, end_date)
    if export:
        data, _ = report_service.get_invoice_register(start_date, end_date, db, limit=10000)
        save_path = get_save_path(db, "invoice_summary")
        return ExcelWriter.generate_from_list(data, "Invoice_Register.xlsx", save_path)
    
    data, total_count = report_service.get_invoice_register(start_date, end_date, db, limit, offset, sort_by, order)
    data = [d for d in data if d.get("invoice_number")]
    return PaginatedResponse(
        items=data,
        metadata=PaginatedMetadata(total_count=total_count, page=(offset // limit) + 1, limit=limit)
    )

@router.get("/register/po")
def download_po_summary(
    start_date: str | None = None,
    end_date: str | None = None,
    db: sqlite3.Connection = Depends(get_db),
):
    """Download PO Register as Excel"""
    try:
        start_date, end_date = _get_date_range(start_date, end_date)
        data = report_service.get_po_register(start_date, end_date, db)
        save_path = get_save_path(db, "items_summary")
        # For register, use generate_from_list instead of specialized summary
        return ExcelWriter.generate_from_list(data, "PO_Register.xlsx", save_path)
    except Exception as e:
        logger.error(f"Failed to generate PO Register: {e}")
        raise internal_error(str(e), e) from e

@router.get("/pending")
def get_pending_items(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    sort_by: str = "po_number",
    order: str = "asc",
    export: bool = False, 
    db: sqlite3.Connection = Depends(get_db)
):
    """Pending PO Items (Shortages) - Items Summary Report"""
    if export:
        data, _ = report_service.get_pending_po_items(db, limit=10000)
        save_path = get_save_path(db, "items_summary")
        # StandardSummaryExcel is for specific format
        writer = StandardSummaryExcel({"items": data, "save_path": save_path}, db)
        return writer.generate_excel("Items_summary.xlsx")
            
    data, total_count = report_service.get_pending_po_items(db, limit, offset, sort_by, order)
    return PaginatedResponse(
        items=data,
        metadata=PaginatedMetadata(total_count=total_count, page=(offset // limit) + 1, limit=limit)
    )

@router.get("/daily-dispatch")
def get_daily_dispatch_report(
    date: str | None = None,
    export: bool = False,
    db: sqlite3.Connection = Depends(get_db),
):
    """Daily Dispatch Summary matching strict template"""
    if not date:
        from datetime import datetime
        date = datetime.now().strftime("%Y-%m-%d")

    # Reuse query logic
    query = """
        SELECT
            COALESCE(poi.material_description, '') as description,
            dci.dsp_qty as quantity,
            poi.unit,
            dci.no_of_packets as packets,
            dc.po_number,
            dc.dc_number,
            COALESCE(i.invoice_number, '') as invoice_number,
            dc.consignee_name as destination,
            COALESCE(i.gemc_number, '') as gemc_number,
            dci.dsp_qty as dispatch_delivered
        FROM delivery_challans dc
        JOIN delivery_challan_items dci ON dc.dc_number = dci.dc_number
        JOIN purchase_order_items poi ON dci.po_item_id = poi.id
        LEFT JOIN gst_invoices i ON dc.dc_number = i.dc_number
        WHERE date(dc.dc_date) = date(?)
        ORDER BY dc.created_at
    """
    rows = db.execute(query, (date,)).fetchall()
    results = [dict(row) for row in rows]

    if export:
        save_path = get_save_path(db, "challan_summary")
        safe_date = _sanitize_date_param(date)
        writer = DispatchSummaryExcel({"date_str": date, "items": results, "save_path": save_path}, db)
        return writer.generate_excel(f"Daily_Dispatch_{safe_date}.xlsx")

    return results

@router.get("/guarantee-certificate")
def get_guarantee_certificate(dc_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Generate Guarantee Certificate for a specific DC"""
    dc_row = db.execute("SELECT * FROM delivery_challans WHERE dc_number = ?", (dc_number,)).fetchone()
    if not dc_row:
        from backend.core.errors import not_found
        raise not_found(f"DC {dc_number} not found", "DC")
    header = dict(dc_row)
    items_rows = db.execute("""
        SELECT poi.po_item_no, poi.material_description as description, dci.dsp_qty as dsp_qty, poi.unit
        FROM delivery_challan_items dci
        JOIN purchase_order_items poi ON dci.po_item_id = poi.id
        WHERE dci.dc_number = ?
    """, (dc_number,)).fetchall()
    items = [dict(row) for row in items_rows]
    po_row = db.execute("SELECT po_date FROM purchase_orders WHERE po_number = ?", (header["po_number"],)).fetchone()
    if po_row: header["po_date"] = po_row[0]

    save_path = get_save_path(db, "challan")
    writer = GuaranteeCertificateExcel(header, items, db, save_path=save_path)
    safe_dc = _sanitize_dc_number(dc_number)
    return writer.generate_excel(f"GC_{safe_dc}.xlsx")

@router.post("/export-selected")
def export_selected_report(
    request: ExportSelectedRequest,
    db: sqlite3.Connection = Depends(get_db)
):
    """Export specifically selected line items to Excel using appropriate format for each report type."""
    logger.info(f"Export Selected Request: {len(request.item_ids)} items, type: {request.report_type}")
    
    # Extract Real DB IDs
    real_ids = _parse_frontend_ids(request.item_ids)
    logger.info(f"Parsed IDs: {real_ids}")

    # Fetch Data based on report type
    if request.report_type == "reconciliation":
        # For reconciliation, fetch full reconciliation details
        data = report_service.get_reconciliation_by_item_ids(real_ids, db)
        logger.info(f"Fetched Reconciliation Data Rows: {len(data)}")
        # Remove 'id' field from export (UUID internal identifier)
        for row in data:
            row.pop('id', None)
        save_path = get_save_path(db, "items_summary")
        return ExcelWriter.generate_from_list(data, "PO_Reconciliation_Report.xlsx", save_path)
    else:
        # Default: pending items (Items Summary)
        data = report_service.get_selected_items_details(real_ids, db)
        logger.info(f"Fetched Data Rows: {len(data)}")
        if data:
            logger.info(f"Sample Data Row 1: {data[0]}")
        
        save_path = get_save_path(db, "items_summary")
        logger.info(f"Using Save Path: {save_path}")
        return ExcelService.generate_standard_summary(data, db, save_path)