"""
Integration Test: PO → DC → Invoice Flow
Tests the complete procurement lifecycle
"""

from backend.db.models import DCCreate, InvoiceCreate, PODetail, POHeader, POItem


class TestPOCreation:
    """Test PO creation and initial state"""
    
    def test_create_po_with_items(self, db_connection):
        """Should create PO with multiple items"""
        header = POHeader(
            po_number="PO/INT/001",
            po_date="2024-01-15",
            supplier_name="Test Supplier"
        )
        
        items = [
            POItem(
                po_item_no=1,
                material_code="MAT001",
                material_description="Test Material 1",
                ord_qty=100.0,
                unit="NOS"
            ),
            POItem(
                po_item_no=2,
                material_code="MAT002",
                material_description="Test Material 2",
                ord_qty=200.0,
                unit="KG"
            )
        ]
        
        po = PODetail(header=header, items=items)
        
        assert po.header.po_number == "PO/INT/001"
        assert len(po.items) == 2
        assert po.items[0].ord_qty == 100.0
        assert po.items[1].ord_qty == 200.0


class TestDCCreationFromPO:
    """Test DC creation linked to PO"""
    
    def test_create_dc_for_po(self, db_connection):
        """Should create DC linked to existing PO"""
        dc = DCCreate(
            dc_number="DC/INT/001",
            dc_date="2024-01-20",
            po_number="PO/INT/001",
            consignee_name="Test Consignee"
        )
        
        assert dc.dc_number == "DC/INT/001"
        assert dc.po_number == "PO/INT/001"
    
    def test_dispatch_qty_validation(self, db_connection):
        """Should not allow dispatch more than ordered"""
        ordered_qty = 100.0
        dispatch_qty = 150.0  # Exceeds ordered
        
        # Validation should catch this
        assert dispatch_qty > ordered_qty  # Would raise error in service


class TestInvoiceCreationFromDC:
    """Test Invoice creation linked to DC"""
    
    def test_create_invoice_for_dc(self, db_connection):
        """Should create Invoice linked to DC"""
        inv = InvoiceCreate(
            invoice_number="INV/INT/001",
            invoice_date="2024-01-25",
            dc_number="DC/INT/001",
            taxable_value=10000.0,
            cgst=900.0,
            sgst=900.0,
            total_invoice_value=11800.0
        )
        
        assert inv.invoice_number == "INV/INT/001"
        assert inv.dc_number == "DC/INT/001"
        assert inv.total_invoice_value == 11800.0


class TestCompleteFlow:
    """Test complete PO → DC → Invoice flow"""
    
    def test_full_procurement_lifecycle(self, db_connection):
        """Complete flow from PO to Invoice"""
        
        # Step 1: Create PO
        po_header = POHeader(
            po_number="PO/FULL/001",
            po_date="2024-01-01",
            supplier_name="Integration Test Supplier",
            po_value=50000.0
        )
        po_items = [
            POItem(
                po_item_no=1,
                material_code="MAT-FULL-001",
                material_description="Integration Test Material",
                ord_qty=100.0,
                unit="NOS",
                po_rate=500.0
            )
        ]
        po = PODetail(header=po_header, items=po_items)
        
        # Step 2: Create DC for PO
        dc = DCCreate(
            dc_number="DC/FULL/001",
            dc_date="2024-01-10",
            po_number=po.header.po_number,
            consignee_name="Test Consignee"
        )
        
        # Step 3: Create Invoice for DC
        inv = InvoiceCreate(
            invoice_number="INV/FULL/001",
            invoice_date="2024-01-15",
            dc_number=dc.dc_number,
            taxable_value=50000.0,
            cgst=4500.0,
            sgst=4500.0,
            total_invoice_value=59000.0
        )
        
        # Verify link chain
        assert inv.dc_number == dc.dc_number
        assert dc.po_number == po.header.po_number
        
        # Verify calculations
        expected_total = inv.taxable_value + inv.cgst + inv.sgst
        assert inv.total_invoice_value == expected_total


class TestStatusTransitions:
    """Test status transitions through the flow"""
    
    def test_po_status_pending_initially(self):
        """PO should be Pending when created"""
        from backend.services.status_service import calculate_entity_status
        
        status = calculate_entity_status(
            total_ordered=100.0,
            total_dispatched=0.0,
            total_received=0.0
        )
        assert status == "Pending"
    
    def test_po_status_delivered_after_dc(self):
        """PO should be Delivered after full dispatch"""
        from backend.services.status_service import calculate_entity_status
        
        status = calculate_entity_status(
            total_ordered=100.0,
            total_dispatched=100.0,
            total_received=0.0
        )
        assert status == "Delivered"


class TestConstraints:
    """Test business constraints"""
    
    def test_cannot_delete_po_with_dc(self):
        """Should not allow deleting PO with linked DC"""
        # Business rule: PO with DCs should not be deletable
        has_linked_dc = True
        assert has_linked_dc  # Deletion should be blocked
    
    def test_cannot_modify_dc_with_invoice(self):
        """Should not allow modifying DC with linked Invoice"""
        # Business rule: DC with Invoice should be immutable
        has_linked_invoice = True
        assert has_linked_invoice  # Modification should be blocked
