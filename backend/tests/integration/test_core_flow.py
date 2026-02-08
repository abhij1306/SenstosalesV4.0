from datetime import datetime

import pytest
from backend.db.models import DCCreate, InvoiceCreate
from backend.services.dc import create_dc
from backend.services.ingest_po import po_ingestion_service
from backend.services.invoice import create_invoice


# Use our new In-Memory DB fixture
@pytest.mark.asyncio
async def test_full_lifecycle_flow(db_connection):
    """
    Simulates the entire ERP lifecycle:
    PO Upload -> DC Creation -> Invoice Creation -> Quantities Check
    Uses In-Memory DB (fast & safe).
    """
    db = db_connection
    po_num = "TEST_PO_001"
    dc_num = "TEST_DC_001"
    inv_num = "TEST_INV_001"
    
    # -------------------------------------------------------------------------
    # 1. PO INGESTION
    # -------------------------------------------------------------------------
    print(f"\n[Step 1] Ingesting PO {po_num}...")
    po_header = {
        "PURCHASE ORDER": po_num,
        "PO Date": datetime.now().strftime("%d-%m-%Y"),
        "Supplier Name": "TEST SUPPLIER",
        "Financial Year": "2025-26"
    }
    po_items = [{
        "PO ITM": 10,
        "MATERIAL CODE": "TEST-MAT-X",
        "DESCRIPTION": "Test Material Description",
        "UNIT": "NOS",
        "PO RATE": 1000.0,
        "ORD QTY": 100.0,
        "ITEM VALUE": 100000.0,
        "deliveries": [{
            "LOT NO": 1,
            "DELY QTY": 100.0,
            "DELY DATE": datetime.now().strftime("%d-%m-%Y")
        }]
    }]
    
    success, warnings, _ = po_ingestion_service.ingest_po(db, po_header, po_items)
    assert success is True, f"Ingestion failed: {warnings}"
    print(f"   -> Success. PO {po_num} created with 1 item (Qty: 100).")
    
    # Verify PO Logic
    item = db.execute("SELECT * FROM purchase_order_items WHERE po_number = ?", (po_num,)).fetchone()
    assert item is not None
    assert item["pending_qty"] == 100.0
    item_id = item["id"]

    # -------------------------------------------------------------------------
    # 2. DC CREATION (Dispatch 10 items)
    # -------------------------------------------------------------------------
    print(f"[Step 2] Creating Delivery Challan {dc_num}...")
    dc_data = DCCreate(
        dc_number=dc_num,
        dc_date=datetime.now().strftime("%Y-%m-%d"),
        po_number=po_num,
        consignee_name="TEST CONSIGNEE"
    )
    dc_items = [{"po_item_id": item_id, "dsp_qty": 10.0}]
    
    result = create_dc(dc_data, dc_items, db)
    assert result.success is True, f"DC Creation failed: {result.message}"
    print("   -> Success. DC created for 10 items.")
    
    # Verify Sync Logic (Trigger Check)
    updated_item = db.execute("SELECT dsp_qty, pending_qty FROM purchase_order_items WHERE id = ?", (item_id,)).fetchone()
    assert updated_item["dsp_qty"] == 10.0
    assert updated_item["pending_qty"] == 90.0  # 100 - 10
    print("   -> Logic Verified: PO Pending Qty dropped to 90.0 (Correct).")

    # -------------------------------------------------------------------------
    # 3. INVOICE CREATION
    # -------------------------------------------------------------------------
    print(f"[Step 3] Generating Invoice {inv_num}...")
    inv_data = InvoiceCreate(
        invoice_number=inv_num,
        invoice_date=datetime.now().strftime("%Y-%m-%d"),
        dc_number=dc_num,
        po_numbers=po_num
    )
    
    # Using model_dump() for Pydantic v2 compatibility
    inv_result = create_invoice(inv_data.model_dump(), db)
    assert inv_result.success is True, f"Invoice Creation failed: {inv_result.message}"
    print(f"   -> Success. Invoice linked to DC {dc_num}.")

    print("\n✅ Full Lifecycle Verification Passed!")
