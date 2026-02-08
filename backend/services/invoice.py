"""
Invoice Service Layer
Centralizes all invoice business logic and validation.
Aligns with 4-layer architecture by using InvoiceRepository.
"""

import logging
import sqlite3
import uuid

from backend.core.constants import DEFAULT_CGST_RATE, DEFAULT_SGST_RATE
from backend.core.exceptions import (
    ConflictError,
    ErrorCode,
    ResourceNotFoundError,
    ValidationError,
)
from backend.core.intelligence import ErrorSeverity, ErrorType, EventClass, LedgerLogger
from backend.core.number_utils import to_qty
from backend.core.result import ServiceResult
from backend.db.models import InvoiceListItem, InvoiceStats, PaginatedMetadata, PaginatedResponse
from backend.repositories.invoice_repository import InvoiceRepository
from backend.services.status_service import calculate_entity_status, calculate_pending_quantity
from backend.services.validation_service import ValidationService

logger = logging.getLogger(__name__)


def calculate_tax(taxable_value: float, cgst_rate: float, sgst_rate: float) -> dict:
    """
    Calculate CGST and SGST amounts.
    """
    cgst_amount = round(taxable_value * cgst_rate / 100, 2)
    sgst_amount = round(taxable_value * sgst_rate / 100, 2)
    total = round(taxable_value + cgst_amount + sgst_amount, 2)

    return {
        "cgst_amount": cgst_amount,
        "sgst_amount": sgst_amount,
        "total_amount": total,
    }

def _process_invoice_items(dc_items: list[dict], cgst_rate: float, sgst_rate: float, overrides: dict = None) -> tuple[list[dict], dict[str, float]]:
    """Helper to consolidate DC items and calculate taxes."""
    overrides = overrides or {}
    consolidated = {}
    for dci in dc_items:
        p_id = dci["po_item_id"]
        if p_id not in consolidated:
            consolidated[p_id] = dict(dci)
        else:
            consolidated[p_id]["dsp_qty"] += dci.get("dsp_qty", 0)

    invoice_items = []
    totals = {"taxable": 0.0, "cgst": 0.0, "sgst": 0.0, "total": 0.0}

    for dci in consolidated.values():
        item_no = str(dci.get("po_item_no") or "")
        qty = dci.get("dsp_qty", 0)
        rate = dci.get("po_rate") or 0

        if item_no in overrides:
            override = overrides[item_no]
            if override.get("quantity") is not None:
                qty = to_qty(override["quantity"])
            if override.get("rate") is not None:
                rate = float(override["rate"])

        if qty <= 0: continue

        taxable = round(qty * rate, 2)
        tax_calc = calculate_tax(taxable, cgst_rate, sgst_rate)

        item = {
            "po_item_no": item_no,
            "description": dci.get("description") or "",
            "material_code": dci.get("material_code") or "",
            "drg_no": dci.get("drg_no") or "",
            "mtrl_cat": dci.get("mtrl_cat") or "",
            "hsn_sac": dci.get("hsn_code") or "",
            "quantity": qty,
            "unit": dci.get("unit") or "NO",
            "rate": rate,
            "taxable_value": taxable,
            "cgst_amount": tax_calc["cgst_amount"],
            "sgst_amount": tax_calc["sgst_amount"],
            "total_amount": tax_calc["total_amount"],
        }
        invoice_items.append(item)
        totals["taxable"] += taxable
        totals["cgst"] += tax_calc["cgst_amount"]
        totals["sgst"] += tax_calc["sgst_amount"]
        totals["total"] += tax_calc["total_amount"]

    return invoice_items, totals


def get_invoice_stats(db: sqlite3.Connection) -> ServiceResult[InvoiceStats]:
    """Get Invoice Page Statistics"""
    try:
        repo = InvoiceRepository(db)
        stats = repo.get_stats()
        
        return ServiceResult.ok(InvoiceStats(
            total_invoiced=stats["total_invoiced"],
            gst_collected=stats["gst_collected"],
            pending_payments=0.0,
            total_invoiced_change=0.0,
        ))
    except Exception as e:
        logger.exception("Failed to fetch invoice stats")
        return ServiceResult.fail(f"Failed to fetch stats: {e}", ErrorCode.INTERNAL_ERROR)


def list_invoices_paginated(
    db: sqlite3.Connection,
    po: str | None = None,
    dc: str | None = None,
    limit: int = 100,
    offset: int = 0,
    sort_by: str = "created_at",
    order: str = "desc",
    search: str | None = None,
) -> ServiceResult[PaginatedResponse[InvoiceListItem]]:
    """List all Invoices (Paginated)"""
    try:
        repo = InvoiceRepository(db)
        rows = repo.list_paginated(po, dc, limit, offset, sort_by, order, search)
        total_count = repo.get_count_paginated(po, dc, search)
        filtered_stats = repo.get_filtered_stats(po, dc, search)

        results = []
        for row in rows:
            total_ord_qty = row["total_ord_qty"]
            total_rcd_qty = row["total_rcd_qty"]
            total_dsp_qty = row["total_dsp_qty"]
            
            row["total_pending_qty"] = calculate_pending_quantity(total_ord_qty, total_rcd_qty)
            row["status"] = calculate_entity_status(total_ord_qty, total_dsp_qty, total_rcd_qty)
            
            results.append(InvoiceListItem(**row))

        return ServiceResult.ok(PaginatedResponse(
            items=results,
            metadata=PaginatedMetadata(
                total_count=total_count,
                page=(offset // limit) + 1,
                limit=limit,
                total_value=filtered_stats.get("total_value"),
                total_taxable=filtered_stats.get("total_taxable")
            )
        ))
    except Exception as e:
        logger.exception("Failed to list invoices")
        return ServiceResult.fail(str(e), ErrorCode.INTERNAL_ERROR)


def get_invoice_detail(invoice_number: str, db: sqlite3.Connection) -> ServiceResult[dict]:
    """Get Invoice detail with items and linked DCs"""
    try:
        repo = InvoiceRepository(db)
        header = repo.get_detail(invoice_number)
        if not header:
            return ServiceResult.fail(f"Invoice {invoice_number} not found", ErrorCode.RESOURCE_NOT_FOUND)

        header["buyers_order_no"] = header.get("po_numbers")
        if not header.get("buyers_order_date"):
            header["buyers_order_date"] = header.get("po_date")

        # Fetch DC date
        if header.get("dc_number"):
            dc_header = repo.get_dc_header_for_invoice(header["dc_number"])
            if dc_header:
                header["dc_date"] = dc_header["dc_date"]

        # Aggregate status
        agg = repo.get_aggregate_status_data(invoice_number)
        if agg:
            header["status"] = calculate_entity_status(agg["total_ord"], agg["total_del"], agg["total_recd"])
        else:
            header["status"] = "Pending"

        # Default buyer details from settings if missing
        settings_rows = db.execute("SELECT key, value FROM settings").fetchall()
        settings = {row["key"]: row["value"] for row in settings_rows}
        
        for field, key in [
            ("buyer_name", "buyer_name"),
            ("buyer_address", "buyer_address"),
            ("buyer_gstin", "buyer_gstin"),
            ("buyer_state", "buyer_state"),
            ("place_of_supply", "buyer_place_of_supply")
        ]:
            if not header.get(field):
                header[field] = settings.get(key, "")

        items = repo.get_items(invoice_number)
        for item in items:
            item["amount"] = item["total_amount"]
            if not item.get("description"):
                item["description"] = "No Description"

        # Linked DCs
        dc_links = []
        if header.get("dc_number"):
            dc_row = repo.get_dc_header_for_invoice(header["dc_number"])
            if dc_row:
                dc_row["dc_number"] = header["dc_number"]
                dc_links.append(dc_row)

        return ServiceResult.ok({"header": header, "items": items, "linked_dcs": dc_links})

    except Exception as e:
        logger.exception(f"Error fetching invoice {invoice_number}")
        return ServiceResult.fail(str(e), ErrorCode.INTERNAL_ERROR)


def create_invoice(invoice_data: dict, db: sqlite3.Connection) -> ServiceResult[dict]:
    """
    Create Invoice from Delivery Challan.
    """
    try:
        repo = InvoiceRepository(db)
        invoice_number = invoice_data["invoice_number"]
        invoice_date = invoice_data["invoice_date"]
        dc_number = invoice_data["dc_number"]

        from backend.core.utils import get_financial_year
        fy = get_financial_year(invoice_date)

        # Check for duplicate within FY
        if repo.check_exists(invoice_number, fy):
            raise ConflictError(f"Invoice number {invoice_number} already exists in FY {fy}")

        # Validate header
        ValidationService.validate_invoice_header(invoice_data)

        # Verify DC exists
        dc_header = repo.get_dc_header_for_invoice(dc_number)
        if not dc_header:
            raise ResourceNotFoundError("Delivery Challan", dc_number)

        # PO Date
        po_date = repo.get_po_date(dc_header["po_number"])

        # Check if DC already invoiced
        existing_invoice = ValidationService.check_document_linked(db, dc_number)
        if existing_invoice:
            raise ConflictError(f"DC {dc_number} has already been invoiced (Invoice: {existing_invoice})")

        # Fetch DC items
        dc_items = repo.get_dc_items_for_invoice(dc_number)
        if not dc_items:
            raise ValidationError(f"DC {dc_number} has no items")

        # Tax rates from settings
        settings_rows = db.execute("SELECT key, value FROM settings WHERE key IN ('cgst_rate', 'sgst_rate')").fetchall()
        settings = {row["key"]: float(row["value"]) for row in settings_rows}
        cgst_rate = settings.get("cgst_rate", DEFAULT_CGST_RATE)
        sgst_rate = settings.get("sgst_rate", DEFAULT_SGST_RATE)

        invoice_items = []
        total_taxable = 0.0
        total_cgst = 0.0
        total_sgst = 0.0
        total_amount = 0.0

        # Prepare overrides
        overrides = {}
        if invoice_data.get("items"):
            for item in invoice_data["items"]:
                item_no = str(item.get("po_item_no") if isinstance(item, dict) else item.po_item_no)
                overrides[item_no] = item

        # Process items using helper
        processed_items, totals = _process_invoice_items(dc_items, cgst_rate, sgst_rate, overrides)

        invoice_items = []
        for item in processed_items:
            item.update({
                "id": str(uuid.uuid4()),
                "invoice_number": invoice_number,
                "igst_amount": 0.0
            })
            invoice_items.append(item)

        total_taxable = totals["taxable"]
        total_cgst = totals["cgst"]
        total_sgst = totals["sgst"]
        total_amount = totals["total"]

        # Insert header
        repo.insert_header({
            "invoice_number": invoice_number,
            "invoice_date": invoice_date,
            "dc_number": dc_number,
            "financial_year": fy,
            "buyer_name": invoice_data.get("buyer_name") or dc_header.get("consignee_name"),
            "buyer_gstin": invoice_data.get("buyer_gstin") or dc_header.get("consignee_gstin"),
            "buyer_address": invoice_data.get("buyer_address") or dc_header.get("consignee_address"),
            "po_numbers": str(invoice_data.get("buyers_order_no") or dc_header.get("po_number", "")),
            "buyers_order_date": invoice_data.get("buyers_order_date") or po_date,
            "gemc_number": invoice_data.get("gemc_number"),
            "gemc_date": invoice_data.get("gemc_date"),
            "mode_of_payment": invoice_data.get("mode_of_payment"),
            "payment_terms": invoice_data.get("payment_terms", "45 Days"),
            "despatch_doc_no": invoice_data.get("despatch_doc_no"),
            "srv_no": invoice_data.get("srv_no"),
            "srv_date": invoice_data.get("srv_date"),
            "vehicle_no": invoice_data.get("vehicle_no") or dc_header.get("vehicle_no"),
            "lr_no": invoice_data.get("lr_no") or dc_header.get("lr_no"),
            "transporter": invoice_data.get("transporter") or dc_header.get("transporter"),
            "destination": invoice_data.get("destination"),
            "terms_of_delivery": invoice_data.get("terms_of_delivery"),
            "buyer_state": invoice_data.get("buyer_state"),
            "buyer_state_code": invoice_data.get("buyer_state_code"),
            "place_of_supply": invoice_data.get("place_of_supply"),
            "taxable_value": total_taxable,
            "cgst": total_cgst,
            "sgst": total_sgst,
            "igst": 0.0,
            "total_invoice_value": total_amount,
            "remarks": invoice_data.get("remarks") or dc_header.get("remarks"),
            "supplier_name": invoice_data.get("supplier_name") or dc_header.get("supplier_name"),
            "supplier_address": invoice_data.get("supplier_address") or dc_header.get("supplier_address"),
            "supplier_gstin": invoice_data.get("supplier_gstin") or dc_header.get("supplier_gstin"),
            "supplier_contact": invoice_data.get("supplier_contact") or dc_header.get("supplier_contact")
        })

        # Insert items
        repo.insert_items(invoice_items)

        # Record comprehensive invoice creation event with LedgerLogger
        LedgerLogger.record_document_create(
            db=db,
            entity_type="INVOICE",
            entity_id=invoice_number,
            module_path="backend.services.invoice",
            payload={
                "invoice_date": invoice_date,
                "dc_number": dc_number,
                "po_number": dc_header.get("po_number"),
                "total_taxable": total_taxable,
                "total_gst": total_cgst + total_sgst,
                "total_value": total_amount,
                "items_count": len(invoice_items)
            },
            actor="SYSTEM"
        )
        
        # Record the SINGLE comprehensive event
        LedgerLogger.record(
            db=db,
            event_class=EventClass.INVOICE_GENERATED,
            module_path="backend.services.invoice",
            entity_id=invoice_number,
            payload={
                "invoice_date": invoice_date,
                "dc_number": dc_number,
                "total_value": total_amount,
                "items_count": len(invoice_items),
                "overrides": overrides if overrides else None
            },
            actor="SYSTEM"
        )

        logger.info(f"Created invoice {invoice_number} with {len(invoice_items)} items")

        return get_invoice_detail(invoice_number, db)

    except ValidationError as e:
        return ServiceResult.fail(str(e), ErrorCode.VALIDATION_ERROR)
    except ResourceNotFoundError as e:
        return ServiceResult.fail(str(e), ErrorCode.RESOURCE_NOT_FOUND)
    except ConflictError as e:
        return ServiceResult.fail(str(e), ErrorCode.CONFLICT)
    except Exception as e:
        logger.exception("Failed to create invoice")
        
        # Use new LedgerLogger for error capture
        LedgerLogger.capture_error(
            db=db,
            error=e,
            severity=ErrorSeverity.HIGH,
            error_type=ErrorType.LOGIC,
            module="backend.services.invoice",
            entity_id=invoice_data.get("invoice_number", "NEW_INVOICE")
        )
        
        return ServiceResult.fail(str(e), ErrorCode.INTERNAL_ERROR)


def generate_invoice_preview(dc_number: str, db: sqlite3.Connection) -> ServiceResult[dict]:
    """Generate invoice preview from DC"""
    try:
        repo = InvoiceRepository(db)
        existing = ValidationService.check_document_linked(db, dc_number)
        if existing:
             return ServiceResult.fail(f"DC {dc_number} already invoiced (Invoice: {existing})", ErrorCode.CONFLICT)

        dc_items = repo.get_dc_items_for_invoice(dc_number)
        dc_header = repo.get_dc_header_for_invoice(dc_number)
        if not dc_items or not dc_header:
             return ServiceResult.fail(f"DC {dc_number} not found or empty", ErrorCode.RESOURCE_NOT_FOUND)
            
        po_date = repo.get_po_date(dc_header["po_number"])

        settings_rows = db.execute("SELECT key, value FROM settings").fetchall()
        settings = {row["key"]: row["value"] for row in settings_rows}
        cgst_rate = float(settings.get("cgst_rate", DEFAULT_CGST_RATE))
        sgst_rate = float(settings.get("sgst_rate", DEFAULT_SGST_RATE))

        # Process items using helper
        invoice_items, totals = _process_invoice_items(dc_items, cgst_rate, sgst_rate)
        
        # Add preview-specific fields
        for item in invoice_items:
            item["items_in_lot"] = 1

        total_taxable = totals["taxable"]
        total_cgst = totals["cgst"]
        total_sgst = totals["sgst"]

        header = {
            "dc_number": dc_number,
            "dc_date": dc_header.get("dc_date"),
            "buyers_order_no": dc_header.get("po_number"),
            "buyers_order_date": po_date,
            "vehicle_no": dc_header.get("vehicle_no"),
            "lr_no": dc_header.get("lr_no"),
            "transporter": dc_header.get("transporter"),
            "buyer_name": dc_header.get("consignee_name"),
            "buyer_gstin": dc_header.get("consignee_gstin"),
            "buyer_address": dc_header.get("consignee_address"),
            "remarks": dc_header.get("remarks"),
            "total_taxable_value": total_taxable,
            "cgst_total": total_cgst,
            "sgst_total": total_sgst,
            "total_invoice_value": total_taxable + total_cgst + total_sgst,
            "supplier_name": settings.get("supplier_name"),
            "supplier_address": settings.get("supplier_address"),
            "supplier_gstin": settings.get("supplier_gstin"),
            "supplier_contact": settings.get("supplier_contact")
        }

        return ServiceResult.ok({"header": header, "items": invoice_items})
    except Exception as e:
        logger.exception("Preview gen failed")
        return ServiceResult.fail(str(e), ErrorCode.INTERNAL_ERROR)


def update_invoice(invoice_number: str, update_data: dict, db: sqlite3.Connection) -> ServiceResult[dict]:
    """Update Invoice metadata"""
    try:
        repo = InvoiceRepository(db)
        if not repo.check_exists(invoice_number):
            raise ResourceNotFoundError("Invoice", invoice_number)

        allowed_fields = {
            "invoice_date", "buyer_name", "buyer_gstin", "buyer_address",
            "po_numbers", "buyers_order_date", "gemc_number", "gemc_date",
            "mode_of_payment", "payment_terms", "despatch_doc_no",
            "srv_no", "srv_date", "vehicle_no", "lr_no", "transporter",
            "destination", "terms_of_delivery", "remarks"
        }

        filtered = {k: v for k, v in update_data.items() if k in allowed_fields}
        if not filtered:
            return ServiceResult.ok({"message": "No valid fields to update", "invoice_number": invoice_number})

        repo.update_header(invoice_number, filtered)

        LedgerLogger.record(
            db,
            event_class="INVOICE_UPDATED",
            module_path="backend.services.invoice",
            entity_type="INVOICE",
            entity_id=invoice_number,
            payload={"updated_fields": list(filtered.keys())},
            actor="USER"
        )

        return ServiceResult.ok({
            "message": "Invoice updated successfully",
            "invoice_number": invoice_number,
            "updated_fields": list(filtered.keys())
        })
    except ResourceNotFoundError as e:
        return ServiceResult.fail(str(e), ErrorCode.RESOURCE_NOT_FOUND)
    except Exception as e:
        logger.exception("Update failed")
        return ServiceResult.fail(str(e), ErrorCode.INTERNAL_ERROR)


def delete_invoice(invoice_number: str, db: sqlite3.Connection) -> ServiceResult[dict]:
    """Delete an Invoice and its items"""
    try:
        repo = InvoiceRepository(db)
        invoice = repo.get_detail(invoice_number)
        if not invoice:
            raise ResourceNotFoundError("Invoice", invoice_number)
        
        # Invariant check: cannot delete if SRV exists for this DC
        srv_no = repo.check_dc_received(invoice["dc_number"])
        if srv_no:
            raise ConflictError(f"Cannot delete invoice: DC {invoice['dc_number']} already received in SRV {srv_no}")
        
        repo.delete(invoice_number)
        logger.info(f"Deleted invoice {invoice_number}")
        LedgerLogger.record(
            db,
            event_class="DOC_DELETED",
            module_path="backend.services.invoice",
            entity_type="INVOICE",
            entity_id=invoice_number,
            payload={"dc_number": invoice["dc_number"]},
            actor="USER"
        )
        
        return ServiceResult.ok({"success": True, "message": f"Invoice {invoice_number} deleted"})
    except ResourceNotFoundError as e:
        return ServiceResult.fail(str(e), ErrorCode.RESOURCE_NOT_FOUND)
    except ConflictError as e:
        return ServiceResult.fail(str(e), ErrorCode.CONFLICT)
    except Exception as e:
        logger.error(f"Delete failed: {e}")
        return ServiceResult.fail(str(e), ErrorCode.INTERNAL_ERROR)
