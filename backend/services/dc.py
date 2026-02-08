"""
Delivery Challan Service Layer
Centralizes all DC business logic and validation
HTTP-agnostic - can be called from routers or AI agents
"""

import logging
import sqlite3
import uuid
from typing import Any

from backend.core.exceptions import (
    BusinessRuleViolation,
    ConflictError,
    ErrorCode,
    ResourceNotFoundError,
    ValidationError,
)
from backend.core.intelligence import ErrorSeverity, ErrorType, EventClass, LedgerLogger
from backend.core.number_utils import to_qty
from backend.core.result import ServiceResult
from backend.db.models import DCCreate, DCListItem, DCStats, PaginatedMetadata, PaginatedResponse
from backend.repositories.dc_repository import DCRepository
from backend.services.status_service import calculate_entity_status
from backend.services.validation_service import ValidationService

logger = logging.getLogger(__name__)


def validate_dc_header(dc: DCCreate, db: sqlite3.Connection) -> None:
    """
    Validate DC header fields
    """
    ValidationService.validate_dc_header(db, dc.dc_number, dc.dc_date)


def validate_dc_items(items: list[dict], db: sqlite3.Connection, exclude_dc: str | None = None) -> None:
    """
    Validate DC items for dispatch quantity constraints
    """
    ValidationService.validate_dc_items(db, items, exclude_dc)


def check_dc_has_invoice(dc_number: str, db: sqlite3.Connection) -> str | None:
    """
    Check if DC is linked to an invoice
    """
    return ValidationService.check_document_linked(db, dc_number)


def _create_dispatchable_item(row: sqlite3.Row) -> dict:
    """Creates a dispatchable item from a database row."""
    ordered = row["ord_qty"] or 0
    dispatched = row["dsp_qty"] or 0
    balance = max(0, ordered - dispatched)
    
    if balance <= 0:
        return None

    return {
        "id": str(row['po_item_id']),
        "po_item_id": row["po_item_id"],
        "po_item_no": row["po_item_no"],
        "lot_no": None,
        "material_code": row["material_code"] or "",
        "description": row["description"] or "",
        "drg_no": row["drg_no"] or "",
        "mtrl_cat": row["mtrl_cat"],
        "unit": row["unit"] or "NOS",
        "po_rate": row["po_rate"] or 0,
        "ord_qty": ordered,
        "dsp_qty": dispatched,
        "rcd_qty": row["rcd_qty"] or 0,
        "balance_quantity": balance,
    }

def get_dispatchable_items_for_po(po_number: str, db: sqlite3.Connection) -> ServiceResult[dict[str, Any]]:
    """
    Fetch dispatchable items and PO header for DC creation.
    Centralized logic from API layer.
    """
    try:
        repo = DCRepository(db)
        rows = repo.get_dispatchable_items(po_number)
        
        items = [item for row in rows if (item := _create_dispatchable_item(row)) is not None]
        
        header = repo.get_po_header(po_number)
        if header:
            settings = repo.get_settings(["default_consignee_name"])
            header["consignee_name"] = settings.get("default_consignee_name", "The Sr. Manager (CRX)")
            if not header.get("consignee_address"):
                header["consignee_address"] = "CONSIGNEE COMPANY NAME\nCITY, STATE - PINCODE"
        
        return ServiceResult.ok({
            "po_number": po_number,
            "header": header,
            "items": items,
            "total_items": len(items)
        })
    except Exception as e:
        logger.exception("Error fetching dispatchable items")
        return ServiceResult.fail(f"Failed to fetch dispatchable items: {e!s}")


def get_dc_stats(db: sqlite3.Connection) -> ServiceResult[DCStats]:
    """Get DC Page Statistics"""
    try:
        repo = DCRepository(db)
        stats = repo.get_dc_stats()
        
        return ServiceResult.ok(DCStats(
            total_challans=stats["total_challans"],
            total_challans_change=0.0,
            pending_delivery=max(0, stats["total_challans"] - stats["completed"]),
            completed_delivery=stats["completed"],
            completed_change=0.0,
            total_value=stats["total_value"],
        ))
    except Exception as e:
        logger.exception("Failed to fetch DC stats")
        return ServiceResult.fail(f"Failed to fetch DC statistics: {e!s}")


def list_dcs_paginated(
    db: sqlite3.Connection,
    po: str | None = None,
    limit: int = 100,
    offset: int = 0,
    sort_by: str = "created_at",
    order: str = "desc",
    search: str | None = None,
) -> ServiceResult[PaginatedResponse[DCListItem]]:
    """List all Delivery Challans (Paginated) with business logic."""
    repo = DCRepository(db)
    
    sort_map = {
        "dc_number": "dc.dc_number",
        "dc_date": "dc.dc_date",
        "po_number": "dc.po_number",
        "consignee_name": "dc.consignee_name",
        "created_at": "dc.created_at",
        "total_value": "total_value",
        "total_ord_qty": "total_ord_qty",
        "total_dsp_qty": "total_dsp_qty",
        "total_rcd_qty": "total_rcd_qty",
        "invoice_number": "invoice_number"
    }
    
    db_sort_col = sort_map.get(sort_by, "dc.created_at")
    db_order = "DESC" if order.lower() == "desc" else "ASC"

    where_clauses = []
    params = []
    
    if po:
        where_clauses.append("dc.po_number = ?")
        params.append(po)
    
    if search:
        where_clauses.append("(dc.dc_number LIKE ? OR dc.po_number LIKE ? OR dc.consignee_name LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        
    where_stmt = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    
    total_count = repo.count_dcs(where_stmt, params)
    filtered_stats = repo.get_filtered_stats(where_stmt, params)
    rows = repo.list_dcs_paginated(where_stmt, params, db_sort_col, db_order, limit, offset)

    results = []
    for row in rows:
        total_ordered = row["total_ord_qty"] or 0
        total_dispatched_this_dc = row["total_dsp_qty"] or 0
        total_received_this_dc = row["total_rcd_qty"] or 0
        global_dispatched = row["global_dsp_qty"] or 0

        total_pending = max(0, total_ordered - global_dispatched)
        status = calculate_entity_status(total_dispatched_this_dc, total_dispatched_this_dc, total_received_this_dc)

        results.append(
            DCListItem(
                dc_number=row["dc_number"],
                dc_date=row["dc_date"],
                po_number=row["po_number"],
                consignee_name=row["consignee_name"],
                status=status,
                total_value=row["total_value"],
                created_at=row["created_at"],
                total_ord_qty=total_ordered,
                total_dsp_qty=total_dispatched_this_dc,
                total_pending_qty=total_pending,
                total_rcd_qty=total_received_this_dc,
                invoice_number=row["invoice_number"],
                total_items_count=row["total_items"] or 0
            )
        )

    return ServiceResult.ok(PaginatedResponse(
        items=results,
        metadata=PaginatedMetadata(
            total_count=total_count,
            page=(offset // limit) + 1,
            limit=limit,
            total_value=filtered_stats.get("total_value"),
            total_shipped=filtered_stats.get("total_dispatched"),
            total_received=filtered_stats.get("total_received")
        )
    ))


def get_dc_detail(dc_number: str, db: sqlite3.Connection) -> ServiceResult[dict[str, Any]]:
    """Get Delivery Challan detail with items and business rules."""
    repo = DCRepository(db)
    dc_row = repo.get_dc_row(dc_number)

    if not dc_row:
        return ServiceResult.fail(f"Delivery Challan {dc_number} not found", ErrorCode.RESOURCE_NOT_FOUND)

    header_dict = dc_row

    settings = repo.get_settings(["default_consignee_name", "supplier_name", "supplier_contact", "supplier_gstin"])
    
    if not header_dict.get("consignee_name"):
        header_dict["consignee_name"] = settings.get("default_consignee_name", "The Sr. Manager (CRX)")

    if not header_dict.get("consignee_address"):
        header_dict["consignee_address"] = repo.get_default_buyer_address() or "CONSIGNEE COMPANY NAME\nCITY, STATE - PINCODE"

    header_dict["supplier_name"] = header_dict.get("supplier_name") or settings.get("supplier_name", "")
    header_dict["supplier_phone"] = header_dict.get("supplier_phone") or settings.get("supplier_contact", "")
    header_dict["supplier_gstin"] = header_dict.get("supplier_gstin") or settings.get("supplier_gstin", "")

    header_dict["invoice_number"] = check_dc_has_invoice(dc_number, db)

    agg = repo.get_dc_aggregation(dc_number)
    if agg:
        t_ord = agg["total_ord"] or 0
        t_del = agg["total_del"] or 0
        t_recd = agg["total_recd"] or 0
        header_dict["status"] = calculate_entity_status(t_ord, t_del, t_recd)
    else:
        header_dict["status"] = "Pending"

    items = repo.get_dc_items(dc_number)
    logger.info(f"items: {items}")
    result_items = []
    for item in items:
        item_dict = item
        item_ord_qty = item_dict["ord_qty"] or 0
        item_total_dispatched = item_dict["item_total_dispatched"] or 0
        
        lot_ordered = item_dict["lot_ordered_qty"] or 0
        lot_delivered = item_dict["lot_delivered_qty"] or 0
        current_dispatch = item_dict["dsp_qty"] or 0

        item_dict["ord_qty"] = item_ord_qty
        item_dict["pending_qty"] = max(0, item_ord_qty - item_total_dispatched)
        item_dict["dsp_qty"] = current_dispatch
        item_dict["rcd_qty"] = item_dict.get("rcd_qty", 0)
        item_dict["remaining_post_dc"] = max(0, lot_ordered - lot_delivered)

        result_items.append(item_dict)

    return ServiceResult.ok({"header": header_dict, "items": result_items})


def create_dc(dc: DCCreate, items: list[dict], db: sqlite3.Connection) -> ServiceResult[dict]:
    """
    Create new Delivery Challan
    """
    try:
        from backend.core.utils import get_financial_year

        fy = get_financial_year(dc.dc_date)

        # Financial year boundaries
        year_start = fy.split("-")[0]
        full_year_start = f"{year_start}-04-01"
        year_end = f"20{fy.split('-')[1]}"
        full_year_end = f"{year_end}-03-31"

        logger.debug(f"Service create_dc checking duplicate for {dc.dc_number} in {fy}")
        # Check for duplicate DC number within the FY
        existing = db.execute(
            """
            SELECT 1 FROM delivery_challans 
            WHERE dc_number = ? 
            AND dc_date >= ? AND dc_date <= ?
        """,
            (dc.dc_number, full_year_start, full_year_end),
        ).fetchone()

        if existing:
            logger.debug(f"Duplicate DC number found: {dc.dc_number} in FY {fy}")
            raise ConflictError(
                f"DC number {dc.dc_number} already exists in Financial Year {fy}.",
                details={"dc_number": dc.dc_number, "financial_year": fy},
            )

        final_dc_number = dc.dc_number

        # 0. GC Number/Date Defaults & Validation
        if not dc.gc_number or dc.gc_number.strip() == "":
            dc.gc_number = final_dc_number
        
        if not dc.gc_date or dc.gc_date.strip() == "":
            dc.gc_date = dc.dc_date  # Default GC date to DC date

        # Check for duplicate GC number within the FY
        existing_gc = db.execute(
            """
            SELECT 1 FROM delivery_challans 
            WHERE gc_number = ? 
            AND dc_date >= ? AND dc_date <= ?
            AND dc_number != ?
        """,
            (dc.gc_number, full_year_start, full_year_end, dc.dc_number),
        ).fetchone()

        if existing_gc:
            raise ConflictError(
                f"GC number {dc.gc_number} already exists in Financial Year {fy}.",
                details={"gc_number": dc.gc_number, "financial_year": fy},
            )

        # Normalize item keys
        for item in items:
            if "dispatch_qty" in item and "dsp_qty" not in item:
                item["dsp_qty"] = item.pop("dispatch_qty")

        # Validate
        validate_dc_header(dc, db)
        validate_dc_items(items, db, exclude_dc=None)

        # Insert DC header
        db.execute(
            """
            INSERT INTO delivery_challans
            (dc_number, dc_date, po_number, department_no, financial_year,
             consignee_name, consignee_gstin, consignee_address, 
             inspection_company, eway_bill_no, vehicle_no, lr_no, 
             transporter, mode_of_transport, remarks, our_ref, gc_number, gc_date,
             supplier_name, supplier_address, supplier_gstin, supplier_contact)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                final_dc_number, dc.dc_date, dc.po_number, dc.department_no, fy,
                dc.consignee_name, dc.consignee_gstin, dc.consignee_address, 
                dc.inspection_company, dc.eway_bill_no, dc.vehicle_no, dc.lr_no, 
                dc.transporter, dc.mode_of_transport, dc.remarks, dc.our_ref, dc.gc_number, dc.gc_date,
                dc.supplier_name, dc.supplier_address, dc.supplier_gstin, dc.supplier_contact,
            ),
        )

        # Prepare batch insert data
        insert_data = [
            (
                str(uuid.uuid4()), 
                final_dc_number, 
                item["po_item_id"], 
                1, 
                to_qty(item["dsp_qty"]), 
                item.get("hsn_code"), 
                item.get("hsn_rate")
            )
            for item in items
        ]

        # Batch insert items
        db.executemany(
            """
            INSERT INTO delivery_challan_items 
            (id, dc_number, po_item_id, lot_no, dsp_qty, hsn_code, hsn_rate) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            insert_data,
        )

        from backend.services.reconciliation_v2 import ReconciliationService
        ReconciliationService.reconcile_dc(db, final_dc_number)

        # Prepare consolidated payload for the primary event
        event_payload = {
            "po_number": dc.po_number,
            "dc_date": dc.dc_date,
            "consignee_name": dc.consignee_name,
            "total_items": len(items),
            "total_dsp_qty": sum(to_qty(item.get("dsp_qty", 0)) for item in items),
            "items": [
                {
                    "po_item_id": str(item.get("po_item_id")),
                    "dsp_qty": to_qty(item.get("dsp_qty", 0))
                } for item in items
            ]
        }

        result = get_dc_detail(final_dc_number, db)
        if result.success:
            header = result.data.get("header", {})
            event_payload["total_value"] = header.get("total_value", 0.0)
            event_payload["status"] = header.get("status", "Pending")
            
            # Log status transition if status changed from default
            if header.get("status") and header["status"] != "Pending":
                LedgerLogger.record_status_transition(
                    db=db,
                    entity_type="DC",
                    entity_id=final_dc_number,
                    module_path="backend.services.dc",
                    old_status="Pending",
                    new_status=header["status"],
                    trigger="DC_CREATION",
                    actor="SYSTEM"
                )

        # Record the SINGLE comprehensive event
        LedgerLogger.record(
            db=db,
            event_class=EventClass.DC_GENERATED,
            module_path="backend.services.dc",
            entity_id=final_dc_number,
            payload=event_payload,
            entity_type="DC",
            actor="SYSTEM"
        )
        
        return result

    except (ValidationError, ResourceNotFoundError, BusinessRuleViolation, ConflictError):
        raise
    except Exception as e:
        logger.error(f"Failed to create DC: {e}", exc_info=True)
        
        # Use new LedgerLogger for error capture
        LedgerLogger.capture_error(
            db=db,
            error=e,
            severity=ErrorSeverity.HIGH,
            error_type=ErrorType.LOGIC,
            module="backend.services.dc",
            entity_id=dc.dc_number or "NEW_DC"
        )
        
        return ServiceResult.fail(f"Failed to create DC: {e!s}")


def update_dc(dc_number: str, dc: DCCreate, items: list[dict], db: sqlite3.Connection) -> ServiceResult[dict]:
    """
    Update existing Delivery Challan
    """
    invoice_number = check_dc_has_invoice(dc_number, db)
    if invoice_number:
        raise ConflictError(f"Cannot edit DC {dc_number} - already linked to invoice {invoice_number}")

    if dc.dc_number != dc_number:
        raise ValidationError("DC number in body must match URL")

    validate_dc_header(dc, db)
    validate_dc_items(items, db, exclude_dc=dc_number)
    
    if not dc.gc_number or dc.gc_number.strip() == "":
        dc.gc_number = dc_number
    
    if not dc.gc_date or dc.gc_date.strip() == "":
        from datetime import date
        dc.gc_date = date.today().strftime("%d-%m-%Y")

    from backend.core.utils import get_financial_year
    fy = get_financial_year(dc.dc_date)
    year_start = fy.split("-")[0]
    full_year_start = f"{year_start}-04-01"
    year_end = f"20{fy.split('-')[1]}"
    full_year_end = f"{year_end}-03-31"

    existing_gc = db.execute(
        """
        SELECT 1 FROM delivery_challans 
        WHERE gc_number = ? 
        AND dc_date >= ? AND dc_date <= ?
        AND dc_number != ?
    """,
        (dc.gc_number, full_year_start, full_year_end, dc_number),
    ).fetchone()

    if existing_gc:
        raise ConflictError(f"GC number {dc.gc_number} already exists in Financial Year {fy}.")

    db.execute(
        """
        UPDATE delivery_challans SET
        dc_date = ?, po_number = ?, department_no = ?, 
        consignee_name = ?, consignee_gstin = ?, consignee_address = ?, 
        inspection_company = ?, eway_bill_no = ?, vehicle_no = ?, 
        lr_no = ?, transporter = ?, mode_of_transport = ?, remarks = ?, our_ref = ?,
        gc_number = ?, gc_date = ?,
        supplier_name = ?, supplier_address = ?, supplier_gstin = ?, supplier_contact = ?
        WHERE dc_number = ?
    """,
        (
            dc.dc_date, dc.po_number, dc.department_no, dc.consignee_name, dc.consignee_gstin, dc.consignee_address,
            dc.inspection_company, dc.eway_bill_no, dc.vehicle_no, dc.lr_no, dc.transporter,
            dc.mode_of_transport, dc.remarks, dc.our_ref, dc.gc_number, dc.gc_date,
            dc.supplier_name, dc.supplier_address, dc.supplier_gstin, dc.supplier_contact, dc_number,
        ),
    )

    db.execute("DELETE FROM delivery_challan_items WHERE dc_number = ?", (dc_number,))

    # Prepare batch insert data
    insert_data = [
        (
            str(uuid.uuid4()), 
            dc_number, 
            item["po_item_id"], 
            1, 
            to_qty(item["dsp_qty"]), 
            item.get("hsn_code"), 
            item.get("hsn_rate")
        )
        for item in items
    ]

    # Batch insert items (Validation already handled by validate_dc_items above)
    db.executemany(
        """
        INSERT INTO delivery_challan_items
        (id, dc_number, po_item_id, lot_no, dsp_qty, hsn_code, hsn_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        insert_data
    )

    from backend.services.reconciliation_v2 import ReconciliationService
    ReconciliationService.reconcile_dc(db, dc_number)

    # Forensic logging via Nexus
    LedgerLogger.record(
        db,
        event_class="DC_UPDATED",
        module_path="backend.services.dc",
        entity_type="DC",
        entity_id=dc_number,
        payload={"dc_date": dc.dc_date, "items_count": len(items)},
        actor="USER"
    )

    return ServiceResult.ok({"success": True, "dc_number": dc_number})


def delete_dc(dc_number: str, db: sqlite3.Connection) -> ServiceResult[dict]:
    """
    Delete a Delivery Challan
    """
    invoice_number = check_dc_has_invoice(dc_number, db)
    if invoice_number:
        raise ConflictError(f"Cannot delete DC {dc_number} - linked to invoice {invoice_number}")
    
    srv_row = db.execute("""
        SELECT srv_number FROM srv_items 
        WHERE challan_no = ? 
        LIMIT 1
    """, (dc_number,)).fetchone()
    
    if srv_row:
        raise ConflictError(f"Cannot delete DC {dc_number} - has received goods in SRV {srv_row['srv_number']}")

    dc_row = db.execute("SELECT 1 FROM delivery_challans WHERE dc_number = ?", (dc_number,)).fetchone()
    if not dc_row:
        raise ResourceNotFoundError("DC", dc_number)

    po_row = db.execute("SELECT po_number FROM delivery_challans WHERE dc_number = ?", (dc_number,)).fetchone()
    po_number = po_row[0] if po_row else None
    
    from backend.services.reconciliation_v2 import ReconciliationService
    db.execute("DELETE FROM delivery_challan_items WHERE dc_number = ?", (dc_number,))
    db.execute("DELETE FROM delivery_challans WHERE dc_number = ?", (dc_number,))

    if po_number:
        ReconciliationService.reconcile_po(db, po_number)

    # Forensic logging via LedgerLogger
    LedgerLogger.record(
        db,
        event_class="DOC_DELETED",
        module_path="backend.services.dc",
        entity_type="DC",
        entity_id=dc_number,
        payload={"po_number": po_number},
        actor="SYSTEM"
    )

    return ServiceResult.ok({"success": True, "message": f"DC {dc_number} deleted"})


def update_dc_header(dc_number: str, update_data: dict, db: sqlite3.Connection) -> ServiceResult[dict]:
    """
    Update restricted DC metadata.
    """
    repo = DCRepository(db)
    existing = repo.get_dc_row(dc_number)

    if not existing:
        raise ResourceNotFoundError("Delivery Challan", dc_number)

    allowed_fields = {
        "dc_date", "consignee_name", "consignee_address", "consignee_gstin",
        "inspection_company", "eway_bill_no", "vehicle_no", "lr_no",
        "transporter", "mode_of_transport", "remarks", "our_ref",
        "gc_number", "gc_date", "supplier_name", "supplier_address",
        "supplier_gstin", "supplier_contact", "department_no"
    }

    filtered_updates = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if not filtered_updates:
        return ServiceResult.ok({"message": "No valid fields to update", "dc_number": dc_number})

    set_clause = ", ".join([f"{k} = ?" for k in filtered_updates])
    params = list(filtered_updates.values())
    params.append(dc_number)

    db.execute(
        f"UPDATE delivery_challans SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE dc_number = ?",
        params
    )

    LedgerLogger.record(
        db,
        event_class="DC_PARTIAL_UPDATE",
        module_path="backend.services.dc",
        entity_type="DC",
        entity_id=dc_number,
        payload={"updated_fields": list(filtered_updates.keys())},
        actor="USER"
    )

    return ServiceResult.ok({
        "message": "DC updated successfully",
        "dc_number": dc_number,
        "updated_fields": list(filtered_updates.keys())
    })