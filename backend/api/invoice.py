"""
Invoice API Router (Controller)
Delegates all business logic and data access to InvoiceService.
"""

import logging
import re
import sqlite3

from fastapi import APIRouter, Depends, Query

from backend.core.errors import internal_error, not_found
from backend.core.intelligence import LedgerLogger
from backend.db.models import (
    InvoiceListItem,
    InvoiceStats,
    PaginatedResponse,
)
from backend.db.session import get_db, transactional
from backend.services.invoice import (
    create_invoice as service_create_invoice,
)
from backend.services.invoice import (
    delete_invoice as service_delete_invoice,
)
from backend.services.invoice import (
    generate_invoice_preview,
    list_invoices_paginated,
)
from backend.services.invoice import (
    get_invoice_detail as service_get_invoice_detail,
)
from backend.services.invoice import (
    get_invoice_stats as service_get_invoice_stats,
)
from backend.services.invoice import (
    update_invoice as service_update_invoice,
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
        return "invoice"
    return filename[:max_length]

# Models kept here if they are only used by the API layer for request parsing
from pydantic import BaseModel  # noqa: E402


class InvoiceItemCreate(BaseModel):
    po_item_no: str
    description: str
    quantity: float
    unit: str = "NO"
    rate: float
    hsn_sac: str | None = None
    no_of_packets: int | None = None

class EnhancedInvoiceCreate(BaseModel):
    invoice_number: str
    invoice_date: str
    dc_number: str
    supplier_name: str | None = None
    supplier_address: str | None = None
    supplier_gstin: str | None = None
    supplier_contact: str | None = None
    buyer_name: str
    buyer_address: str | None = None
    buyer_gstin: str | None = None
    buyer_state: str | None = None
    buyer_state_code: str | None = None
    place_of_supply: str | None = None
    buyers_order_no: str | None = None
    buyers_order_date: str | None = None
    vehicle_no: str | None = None
    lr_no: str | None = None
    transporter: str | None = None
    destination: str | None = None
    terms_of_delivery: str | None = None
    gemc_number: str | None = None
    gemc_date: str | None = None
    mode_of_payment: str | None = None
    payment_terms: str = "45 Days"
    despatch_doc_no: str | None = None
    srv_no: str | None = None
    srv_date: str | None = None
    remarks: str | None = None
    items: list[InvoiceItemCreate] | None = None


@router.get("/stats/", response_model=InvoiceStats)
def get_invoice_stats(db: sqlite3.Connection = Depends(get_db)):
    """Get Invoice Page Statistics"""
    result = service_get_invoice_stats(db)
    if result.success:
        return result.data
    raise internal_error(result.message)


@router.get("/", response_model=PaginatedResponse[InvoiceListItem])
def list_invoices(
    po: str | None = None,
    dc: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    sort_by: str = "created_at",
    order: str = "desc",
    search: str | None = None,
    db: sqlite3.Connection = Depends(get_db),
):
    """List all Invoices (Paginated)"""
    result = list_invoices_paginated(db, po, dc, limit, offset, sort_by, order, search)
    if result.success:
        return result.data
    raise internal_error(result.message)


def _generate_invoices_csv(data: list[InvoiceListItem]) -> bytes:
    """Generate CSV bytes from a list of invoices."""
    headers = [
        "Invoice #", "Date", "Linked DCs", "Linked POs", "Items Count",
        "Delivered Qty", "Value", "Status", "Pending Qty"
    ]
    
    attr_map = {
        "Invoice #": "invoice_number",
        "Date": "invoice_date",
        "Linked DCs": "dc_number",
        "Linked POs": "po_numbers",
        "Items Count": "total_items",
        "Delivered Qty": "total_dsp_qty",
        "Value": "total_invoice_value",
        "Status": "status",
        "Pending Qty": "total_pending_qty"
    }
    
    csv_io = generate_csv_from_objects(headers, data, attr_map)
    return csv_io.getvalue()

def _get_invoice_list_data(po: str | None, dc: str | None, db: sqlite3.Connection) -> list[InvoiceListItem]:
    """Fetch a list of invoices for export."""
    result = list_invoices_paginated(db, po=po, dc=dc, limit=10000)
    if not result.success:
        raise internal_error(result.message)
    return result.data.items

@router.get("/export-list/")
def export_invoices_list(
    po: str | None = None,
    dc: str | None = None,
    db: sqlite3.Connection = Depends(get_db),
):
    """Export Invoice List as simple CSV"""
    invoice_data = _get_invoice_list_data(po, dc, db)
    csv_bytes = _generate_invoices_csv(invoice_data)
    
    save_path = get_save_path(db, "invoice_summary")
    from backend.services.excel_writer import ExcelWriter
    return ExcelWriter._save_or_stream(csv_bytes, "Invoice_List_Export.csv", save_path, media_type="text/csv")


def _generate_and_stream_invoice_excel(invoice_number: str, data: dict, db: sqlite3.Connection):
    """Generate and stream the invoice Excel file."""
    save_path = get_save_path(db, "invoice")
    from backend.services.invoice_excel import InvoiceExcel
    try:
        safe_inv = _sanitize_filename(invoice_number)
        LedgerLogger.record(
            db,
            event_class="INVOICE_DOWNLOADED",
            entity_type="INVOICE",
            entity_id=invoice_number,
            module_path="backend.api.invoice",
            payload={"action": "download"}
        )
        writer = InvoiceExcel(data["header"], data["items"], db, save_path=save_path)
        filename = f"Invoice_{safe_inv}.xlsx"
        return writer.generate_excel(filename)
    except Exception as e:
        raise internal_error(str(e))

@router.get("/{invoice_number:path}/download/")
def download_invoice_excel(invoice_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Download Invoice as Excel"""
    result = service_get_invoice_detail(invoice_number, db)
    if not result.success:
        raise not_found(result.message) if result.error_code == "RESOURCE_NOT_FOUND" else internal_error(result.message)
    
    return _generate_and_stream_invoice_excel(invoice_number, result.data, db)


@router.get("/preview/{dc_number:path}/")
def preview_invoice_endpoint(dc_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Generate Invoice Preview from DC"""
    result = generate_invoice_preview(dc_number, db)
    if result.success:
        return result.data
    if result.error_code == "RESOURCE_NOT_FOUND":
        raise not_found(result.message)
    raise internal_error(result.message)


@router.get("/{invoice_number:path}/")
def get_invoice_detail(invoice_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Get Invoice detail"""
    result = service_get_invoice_detail(invoice_number, db)
    if result.success:
        return result.data
    if result.error_code == "RESOURCE_NOT_FOUND":
        raise not_found(result.message)
    raise internal_error(result.message)


def _record_invoice_creation(db: sqlite3.Connection, invoice_number: str, buyer_name: str, total_value: float):
    """Records the creation of an invoice."""
    LedgerLogger.record(
        db,
        event_class="INVOICE_CREATED",
        entity_type="INVOICE",
        entity_id=invoice_number,
        module_path="backend.api.invoice",
        payload={"buyer": buyer_name, "value": total_value}
    )

@router.post("/")
@transactional
def create_invoice(request: EnhancedInvoiceCreate, db: sqlite3.Connection = Depends(get_db)):
    """Create Invoice from Delivery Challan"""
    result = service_create_invoice(request.dict(), db)
    if result.success:
        invoice_header = result.data["header"]
        _record_invoice_creation(
            db,
            invoice_header.get("invoice_number"),
            request.buyer_name,
            invoice_header.get("total_invoice_value")
        )
        return result.data
    if result.error_code == "RESOURCE_NOT_FOUND":
        raise not_found(result.message)
    raise internal_error(result.message)


def _record_invoice_update(db: sqlite3.Connection, invoice_number: str):
    """Records the update of an invoice."""
    LedgerLogger.record(
        db,
        event_class="INVOICE_UPDATED",
        entity_type="INVOICE",
        entity_id=invoice_number,
        module_path="backend.api.invoice",
        payload={"action": "update"}
    )


def _record_invoice_deletion(db: sqlite3.Connection, invoice_number: str):
    """Records the deletion of an invoice."""
    LedgerLogger.record(
        db,
        event_class="INVOICE_DELETED",
        entity_type="INVOICE",
        entity_id=invoice_number,
        module_path="backend.api.invoice",
        payload={"action": "delete"}
    )

@router.post("/reconcile-all/")
@transactional
def reconcile_all_docs(db: sqlite3.Connection = Depends(get_db)):
    """Trigger global reconciliation for all POs and DCs"""
    from backend.services.reconciliation_v2 import ReconciliationService
    try:
        # 1. Fetch all PO Numbers
        po_rows = db.execute("SELECT po_number FROM purchase_orders").fetchall()
        po_numbers = [row["po_number"] for row in po_rows]
        
        # 2. Sync each PO
        for po_num in po_numbers:
            ReconciliationService.sync_po(db, po_num)
            
        # 3. Fetch all DC Numbers
        dc_rows = db.execute("SELECT dc_number FROM delivery_challans").fetchall()
        dc_numbers = [row["dc_number"] for row in dc_rows]
        
        # 4. Reconcile each DC
        for dc_num in dc_numbers:
            ReconciliationService.reconcile_dc(db, dc_num)
            
        LedgerLogger.record(
            db,
            event_class="SYSTEM_RECONCILED",
            module_path="backend.api.invoice",
            entity_type="CORE",
            entity_id="GLOBAL",
            payload={"pos": len(po_numbers), "dcs": len(dc_numbers)},
            actor="USER",
            severity="HIGH"
        )
        
        return {"success": True, "pos": len(po_numbers), "dcs": len(dc_numbers)}
    except Exception as e:
        LedgerLogger.capture_error(db, e, module="backend.api.invoice")
        raise internal_error(str(e))


@router.put("/{invoice_number:path}/")
@transactional
def update_invoice(invoice_number: str, update_data: dict, db: sqlite3.Connection = Depends(get_db)):
    """Update Invoice Metadata"""
    result = service_update_invoice(invoice_number, update_data, db)
    if result.success:
        _record_invoice_update(db, invoice_number)
        return result.data
    if result.error_code == "RESOURCE_NOT_FOUND":
        raise not_found(result.message)
    raise internal_error(result.message)


@router.delete("/{invoice_number:path}/")
@transactional
def delete_invoice(invoice_number: str, db: sqlite3.Connection = Depends(get_db)):
    """Delete an Invoice"""
    result = service_delete_invoice(invoice_number, db)
    if result.success:
        _record_invoice_deletion(db, invoice_number)
        return result.data
    if result.error_code == "RESOURCE_NOT_FOUND":
        raise not_found(result.message)
    raise internal_error(result.message)