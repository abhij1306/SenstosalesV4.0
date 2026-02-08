"""
Validation Service
Centralizes high-value business rules and cross-document validation.
"""

import logging
import sqlite3
from typing import Any, Literal

from backend.core.exceptions import (
    BusinessRuleViolation,
    ConflictError,
    ResourceNotFoundError,
    ValidationError,
)
from backend.core.number_utils import to_qty
from backend.core.utils import get_financial_year

logger = logging.getLogger(__name__)

class ValidationService:
    @staticmethod
    def check_duplicate_number(
        db: sqlite3.Connection,
        doc_type: Literal["DC", "Invoice"],
        number: str,
        date: str
    ) -> dict[str, Any]:
        """
        Check if a DC or Invoice number already exists within the same financial year.
        Ensures cross-document uniqueness (DC vs Invoice).
        """
        try:
            fy = get_financial_year(date)
            # Calculate FY boundaries
            year_start = fy.split("-")[0]
            full_year_start = f"{year_start}-04-01"
            year_end = f"20{fy.split('-')[1]}"
            full_year_end = f"{year_end}-03-31"

            exists = False
            conflict_type = None

            # 1. Check same-type conflict
            table = "delivery_challans" if doc_type == "DC" else "gst_invoices"
            col = "dc_number" if doc_type == "DC" else "invoice_number"
            date_col = "dc_date" if doc_type == "DC" else "invoice_date"

            query = f"SELECT 1 FROM {table} WHERE {col} = ? AND {date_col} >= ? AND {date_col} <= ? LIMIT 1"
            if db.execute(query, (number, full_year_start, full_year_end)).fetchone():
                exists = True
                conflict_type = doc_type

            # NOTE: Cross-entity check REMOVED - DC and Invoice are independent entities
            # DC 344 and Invoice 344 can coexist in the same FY
            # Same-entity FY duplicate check (above) remains active

            return {
                "exists": exists,
                "financial_year": fy,
                "conflict_type": conflict_type
            }

        except Exception as e:
            logger.error(f"Error in check_duplicate_number for {doc_type} #{number}: {e}", exc_info=True)
            raise

    @staticmethod
    def validate_dc_header(db: sqlite3.Connection, dc_number: str, dc_date: str) -> None:
        """
        Validate DC header fields
        """
        if not dc_number or dc_number.strip() == "":
            raise ValidationError("DC number is required")

        if not dc_date or dc_date.strip() == "":
            raise ValidationError("DC date is required")

        # Check for duplicate DC number within same FY
        result = ValidationService.check_duplicate_number(db, "DC", dc_number, dc_date)
        if result["exists"]:
            raise ConflictError(f"Delivery Challan {dc_number} already exists in FY {result['financial_year']}")

    @staticmethod
    def validate_dc_items(db: sqlite3.Connection, items: list[dict], exclude_dc: str | None = None) -> None:
        """
        Validate DC items for dispatch quantity constraints (Batch Optimized)
        """
        if not items or len(items) == 0:
            raise ValidationError("At least one item is required")

        # 1. Prepare unique PO item IDs for batch fetch
        po_item_ids = list({item["po_item_id"] for item in items if "po_item_id" in item})
        if not po_item_ids:
            raise ValidationError("PO item IDs are required for all items")

        # 2. Batch fetch ord_qty and current physical_dispatched in one query
        places = ",".join(["?"] * len(po_item_ids))
        query = f"""
            SELECT poi.id, poi.ord_qty, 
                   COALESCE((SELECT SUM(dsp_qty) FROM delivery_challan_items dci WHERE dci.po_item_id = poi.id), 0) as physical_dispatched
            FROM purchase_order_items poi
            WHERE poi.id IN ({places})
        """
        rows = db.execute(query, po_item_ids).fetchall()
        
        # Row factory is assumed to be sqlite3.Row or dict
        stat_map = {row["id"]: {"ord_qty": row["ord_qty"], "dispatched": row["physical_dispatched"]} for row in rows}

        # 3. If update scenario, fetch contribution of the DC being updated to subtract it
        excluded_contributions = {}
        if exclude_dc:
            contrib_query = f"""
                SELECT po_item_id, COALESCE(SUM(dsp_qty), 0) as contrib
                FROM delivery_challan_items
                WHERE dc_number = ? AND po_item_id IN ({places})
                GROUP BY po_item_id
            """
            contrib_rows = db.execute(contrib_query, [exclude_dc, *po_item_ids]).fetchall()
            excluded_contributions = {row["po_item_id"]: row["contrib"] for row in contrib_rows}

        # 4. Perform localized validation
        local_accum = {}
        for idx, item in enumerate(items):
            pid = item.get("po_item_id")
            if pid not in stat_map:
                raise ResourceNotFoundError(f"PO Item {pid} not found")

            dsp_qty_val = item.get("dsp_qty") or item.get("dispatch_qty")
            qty = to_qty(dsp_qty_val)
            
            if qty is None:
                raise ValidationError(f"Item {idx + 1}: Invalid dispatch quantity format", details={"item_index": idx})
            if qty <= 0:
                raise ValidationError(f"Item {idx + 1}: Dispatch quantity must be positive", details={"item_index": idx})

            # Physical Limit Calculation: (Ordered - (TotalDispatched - ThisDCContribution))
            total_dispatched = stat_map[pid]["dispatched"] - excluded_contributions.get(pid, 0)
            remaining_global = stat_map[pid]["ord_qty"] - total_dispatched
            
            # Account for multiple items targeting same pid in this batch
            current_local = local_accum.get(pid, 0)
            
            if qty > (remaining_global - current_local) + 0.001:
                raise BusinessRuleViolation(
                    f"Item {idx + 1}: Over-dispatch error (Physical Limit). Remaining: {remaining_global - current_local:.3f}.",
                    details={"item_index": idx, "dsp_qty": qty, "remaining": remaining_global - current_local}
                )
            
            local_accum[pid] = current_local + qty

    @staticmethod
    def check_document_linked(db: sqlite3.Connection, dc_number: str) -> str | None:
        """
        Check if DC is linked to an invoice. Used to block edits/deletions.
        """
        invoice_row = db.execute(
            "SELECT invoice_number FROM gst_invoices WHERE dc_number = ? LIMIT 1",
            (dc_number,),
        ).fetchone()
        return invoice_row["invoice_number"] if invoice_row else None

    @staticmethod
    def validate_invoice_header(invoice_data: dict) -> None:
        """
        Validate invoice header fields.
        buyer_name is NOT required - it can be inherited from DC or left empty.
        """
        if not invoice_data.get("invoice_number") or invoice_data["invoice_number"].strip() == "":
            raise ValidationError("Invoice number is required")
        if not invoice_data.get("dc_number") or invoice_data["dc_number"].strip() == "":
            raise ValidationError("DC number is required")
        if not invoice_data.get("invoice_date") or invoice_data["invoice_date"].strip() == "":
            raise ValidationError("Invoice date is required")
        # buyer_name is optional - can be inherited from DC consignee or left blank

    @staticmethod
    def validate_dispatch_qty(db: sqlite3.Connection, po_item_id: str, lot_no: int, dispatch_qty: float):
        """
        Validate that dispatch_qty <= pending_qty
        """
        item = db.execute(
            "SELECT ord_qty, dsp_qty FROM purchase_order_items WHERE id = ?", 
            (po_item_id,)
        ).fetchone()
        
        if not item:
            raise ResourceNotFoundError("PO Item", po_item_id)
            
        pending = (item['ord_qty'] or 0) - (item['dsp_qty'] or 0)
        
        if dispatch_qty > (pending + 0.001):
            raise BusinessRuleViolation(f"Dispatch quantity ({dispatch_qty}) exceeds pending quantity ({pending})")
        return True

    @staticmethod
    def validate_po_exists(db: sqlite3.Connection, po_number: str) -> bool:
        """
        Check if PO exists in the system.
        """
        row = db.execute("SELECT 1 FROM purchase_orders WHERE po_number = ?", (po_number,)).fetchone()
        if not row:
            raise ResourceNotFoundError("PO", po_number)
        return True
