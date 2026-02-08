"""
Purchase Order Service
Handles business logic, aggregation, and data retrieval for POs.
Aligns with 4-layer architecture by using PORepository.
"""

import logging
import sqlite3

from backend.core.exceptions import ResourceNotFoundError, ValidationError
from backend.db.models import PODetail, POHeader, POItem, POListItem, POStats
from backend.repositories.po_repository import PORepository
from backend.services.ingest_po import POIngestionService
from backend.services.status_service import calculate_entity_status

logger = logging.getLogger(__name__)


class POService:
    """Service for Purchase Order business logic"""

    def get_stats(self, db: sqlite3.Connection) -> POStats:
        """Calculate PO Dashboard Statistics"""
        try:
            repo = PORepository(db)
            stats = repo.get_stats()

            return POStats(
                open_orders_count=stats["open_count"],
                pending_approval_count=stats["pending_count"],
                total_value_ytd=stats["total_value"],
                total_value_change=0.0,
                total_shipped_qty=stats["total_dsp"],
                total_rejected_qty=stats["total_rej"]
            )
        except Exception:
            logger.exception("Error calculating PO stats")
            return POStats(
                open_orders_count=0, pending_approval_count=0,
                total_value_ytd=0.0, total_value_change=0.0
            )

    def list_pos(
        self,
        db: sqlite3.Connection,
        limit: int = 10,
        offset: int = 0,
        sort_by: str = "created_at",
        order: str = "desc",
        search: str | None = None,
    ) -> tuple[list[POListItem], int, dict]:
        """
        List all Purchase Orders with aggregated quantity details.
        Returns: (items, total_count, filtered_stats)
        """
        repo = PORepository(db)
        
        sort_map = {
            "po_number": "po.po_number",
            "po_date": "po.po_date",
            "supplier_name": "po.supplier_name",
            "po_value": "po.po_value",
            "po_status": "po_status",
            "created_at": "po.created_at",
            "total_ord_qty": "total_ord",
            "total_dsp_qty": "total_dsp",
            "total_rcd_qty": "total_rcd",
            "total_rej_qty": "total_rej",
            "total_items_count": "total_items"
        }

        db_sort_col = sort_map.get(sort_by, "po.created_at")
        db_order = "DESC" if order.lower() == "desc" else "ASC"

        rows = repo.list_paginated(limit, offset, db_sort_col, db_order, search)
        total_count = repo.get_count_paginated(search)
        filtered_stats = repo.get_filtered_stats(search)

        results = []
        for row in rows:
            t_ordered = row["total_ord"] or 0
            t_dsp = row["total_dsp"] or 0
            t_rcd = row["total_rcd"] or 0
            t_rej = row["total_rej"] or 0
            
            accepted = max(0.0, t_rcd - t_rej)
            status = calculate_entity_status(t_ordered, t_dsp, accepted)

            results.append(POListItem(
                po_number=row["po_number"],
                po_date=row["po_date"],
                supplier_name=row["supplier_name"],
                po_value=row["po_value"],
                amend_no=row["amend_no"],
                po_status=status,
                linked_dc_numbers="",
                total_ord_qty=t_ordered,
                total_dsp_qty=t_dsp,
                total_rcd_qty=t_rcd,
                total_rej_qty=t_rej,
                total_pending_qty=row["total_pending"] or 0,
                total_items_count=row["total_items"] or 0,
                linked_dc_count=row["linked_dc_count"] or 0,
                linked_srv_count=row["linked_srv_count"] or 0,
                linked_invoice_count=row["linked_invoice_count"] or 0,
                financial_year=row["financial_year"],
                created_at=row["created_at"],
            ))

        return results, total_count, filtered_stats

    def get_po_detail(self, db: sqlite3.Connection, po_number: str) -> PODetail:
        """
        Get full Purchase Order detail with items and delivery schedules.
        """
        repo = PORepository(db)
        header_dict = repo.get_header(po_number)
        if not header_dict:
            raise ResourceNotFoundError("PO", po_number)

        # Live status
        agg = repo.get_aggregate_data(po_number)
        if agg and agg["total_ord"] is not None:
            t_ord, t_dsp, t_rcd, t_rej = agg["total_ord"] or 0, agg["total_dsp"] or 0, agg["total_rcd"] or 0, agg["total_rej"] or 0
            header_dict["po_status"] = calculate_entity_status(t_ord, t_dsp, max(0.0, t_rcd - t_rej))
        else:
            header_dict["po_status"] = header_dict.get("po_status") or "Pending"

        # Defaults
        if not header_dict.get("consignee_name"):
            header_dict["consignee_name"] = "BUYER COMPANY NAME"
        if not header_dict.get("consignee_address"):
            header_dict["consignee_address"] = header_dict.get("inspection_at") or "CITY, STATE - PINCODE"

        header = POHeader(**header_dict)

        # Items and Lots
        item_rows = repo.get_items(po_number)
        item_ids = [r["id"] for r in item_rows]
        all_deliveries = repo.get_deliveries_for_items(item_ids)

        items_with_deliveries = []
        for item_row in item_rows:
            item_id = item_row["id"]
            item_deliveries = []
            total_lot_dsp = 0.0
            total_lot_rcd = 0.0

            for d in all_deliveries:
                if d["po_item_id"] == item_id:
                    dsp, rcd = d["dsp_qty"] or 0.0, d["rcd_qty"] or 0.0
                    item_deliveries.append(d)
                    total_lot_dsp += dsp
                    total_lot_rcd += rcd

            if total_lot_dsp > 0: item_row["dsp_qty"] = total_lot_dsp
            if total_lot_rcd > 0: item_row["rcd_qty"] = total_lot_rcd
            item_row["pending_qty"] = max(0.0, item_row.get("ord_qty", 0) - item_row.get("dsp_qty", 0))

            items_with_deliveries.append(POItem(**item_row, deliveries=item_deliveries))

        return PODetail(header=header, items=items_with_deliveries)

    def get_po_context(self, db: sqlite3.Connection, po_number: str) -> dict:
        """Fetch PO context for auto-fill"""
        repo = PORepository(db)
        context = repo.get_po_context(po_number)
        if not context:
            raise ResourceNotFoundError("PO", po_number)
        return context

    def check_po_has_dc(self, db: sqlite3.Connection, po_number: str) -> dict:
        """Check if PO has linked DCs"""
        repo = PORepository(db)
        dc_row = repo.check_has_dc(po_number)
        if dc_row:
            return {
                "has_dc": True, 
                "dc_id": dc_row["dc_number"], 
                "dc_number": dc_row["dc_number"],
                "dc_date": dc_row["dc_date"]
            }
        return {"has_dc": False}

    # ==========================================================================
    # PO Mapping Functions - Moved from API Router for proper layering
    # ==========================================================================

    def map_header_to_scraper_format(self, header: PODetail) -> dict:
        """Maps a PODetail header to the scraper's expected format."""
        return {
            "PURCHASE ORDER": str(header.po_number),
            "PO DATE": header.po_date,
            "SUPP NAME M/S": header.supplier_name,
            "SUPP CODE": header.supplier_code,
            "PHONE": header.supplier_phone,
            "FAX": header.supplier_fax,
            "EMAIL": header.supplier_email,
            "DVN": header.department_no,
            "ENQUIRY": header.enquiry_no,
            "ENQ DATE": header.enquiry_date,
            "QUOTATION": header.quotation_ref,
            "QUOT-DATE": header.quotation_date,
            "RC NO": header.rc_no,
            "ORD-TYPE": header.order_type,
            "PO STATUS": header.po_status,
            "TIN NO": header.tin_no,
            "ECC NO": header.ecc_no,
            "MPCT NO": header.mpct_no,
            "PO-VALUE": header.po_value,
            "FOB VALUE": header.fob_value,
            "NET PO VAL": header.net_po_value,
            "AMEND NO": header.amend_no,
            "INSPECTION BY": header.inspection_by,
            "INSPECTION AT BHEL": header.inspection_at,
            "NAME": header.issuer_name,
            "DESIGNATION": header.issuer_designation,
            "PHONE NO": header.issuer_phone,
            "REMARKS": header.remarks,
            "OUR_REF": header.our_ref,
            "CONSIGNEE_NAME": header.consignee_name,
            "CONSIGNEE_ADDRESS": header.consignee_address,
        }

    def map_items_to_scraper_format(self, items: list, header: PODetail) -> list[dict]:
        """Maps a list of PODetail items to the scraper's expected format."""
        items_list = []
        for item in items:
            item_map = {
                "PO ITM": item.po_item_no,
                "MATERIAL CODE": item.material_code,
                "DESCRIPTION": item.material_description,
                "DRG": item.drg_no,
                "UNIT": item.unit,
                "PO RATE": item.po_rate,
                "ORD QTY": item.ord_qty,
                "RCD QTY": item.rcd_qty,
                "REJ QTY": item.rej_qty,
                "MTRL CAT": item.mtrl_cat,
                "DSP QTY": item.dsp_qty,
                "HSN CODE": item.hsn_code,
                "ITEM VALUE": item.item_value,
                "deliveries": [],
            }

            if item.deliveries:
                for d in item.deliveries:
                    item_map["deliveries"].append({
                        "LOT NO": d.lot_no,
                        "DELY QTY": d.ord_qty,
                        "DELY DATE": d.dely_date,
                        "ENTRY ALLOW DATE": d.entry_allow_date,
                        "DEST CODE": d.dest_code,
                        "manual_override_qty": d.manual_override_qty or d.dsp_qty or 0.0,
                    })
            else:
                item_map["deliveries"].append({
                    "LOT NO": 1,
                    "DELY QTY": item.ord_qty,
                    "DELY DATE": header.po_date,
                    "ENTRY ALLOW DATE": None,
                    "DEST CODE": header.department_no or 1,
                })

            items_list.append(item_map)
        return items_list

    def ingest_po_data(self, db: sqlite3.Connection, header_map: dict, items_list: list[dict]) -> PODetail:
        """Ingests PO data using the POIngestionService."""
        ingestion_service = POIngestionService()
        success, warnings, _ = ingestion_service.ingest_po(db, header_map, items_list)
        if not success:
            raise ValidationError(f"Failed to ingest PO: {', '.join(warnings)}")
        
        # Reconstruct PODetail from the mapped data
        header = POHeader(**{k.lower(): v for k, v in header_map.items()})
        items = [POItem(**{k.lower(): v for k, v in item.items()}) for item in items_list]
        return PODetail(header=header, items=items)

    def process_po_update(self, po_data: PODetail, db: sqlite3.Connection) -> PODetail:
        """Shared logic for creating/updating PO via structured model"""
        if not po_data.items:
            raise ValidationError("At least one item is required")

        header_map = self.map_header_to_scraper_format(po_data.header)
        items_list = self.map_items_to_scraper_format(po_data.items, po_data.header)
        
        return self.ingest_po_data(db, header_map, items_list)


# Singleton instance
po_service = POService()
