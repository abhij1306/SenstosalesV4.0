"""
Tests for Status Service
Tests the status calculation logic for POs, DCs, and Invoices
"""


from backend.services.status_service import (
    calculate_entity_status,
    calculate_pending_quantity,
)


class TestCalculateEntityStatus:
    """Test status calculation logic"""
    
    def test_pending_status_no_dispatch(self):
        """Status should be Pending when no dispatch activity"""
        status = calculate_entity_status(
            total_ordered=100.0,
            total_dispatched=0.0,
            total_received=0.0,
        )
        assert status == "Pending"
    
    def test_delivered_status_all_dispatched(self):
        """Status should be Delivered when all items dispatched"""
        status = calculate_entity_status(
            total_ordered=100.0,
            total_dispatched=100.0,
            total_received=0.0,
        )
        assert status == "Delivered"
    
    def test_delivered_status_over_dispatched(self):
        """Status should be Delivered when dispatched >= ordered"""
        status = calculate_entity_status(
            total_ordered=100.0,
            total_dispatched=100.1,  # Over dispatch
            total_received=0.0,
        )
        assert status == "Delivered"
    
    def test_closed_status_all_received(self):
        """Status should be Delivered (not Closed) even when all items received, as Closing is manual/reconciliation based"""
        status = calculate_entity_status(
            total_ordered=100.0,
            total_dispatched=100.0,
            total_received=100.0,
        )
        assert status == "Delivered"
    
    def test_closed_status_over_received(self):
        """Status should be Delivered when received >= ordered"""
        status = calculate_entity_status(
            total_ordered=100.0,
            total_dispatched=100.0,
            total_received=100.1,  # Over received
        )
        assert status == "Delivered"
    
    def test_floating_point_tolerance(self):
        """Test floating point comparison tolerance (0.001)"""
        # Should handle small floating point differences
        status = calculate_entity_status(
            total_ordered=100.0,
            total_dispatched=99.999,  # Within tolerance
            total_received=0.0,
        )
        # Within strict 3-decimal precision, 99.999 < 100.000, so it remains Pending
        assert status == "Pending"
        
        status = calculate_entity_status(
            total_ordered=100.0,
            total_dispatched=100.0001,  # Just over
            total_received=0.0,
        )
        assert status == "Delivered"


class TestCalculatePendingQuantity:
    """Test pending quantity calculation"""
    
    def test_pending_quantity_calculation(self):
        """Calculate pending quantity correctly"""
        pending = calculate_pending_quantity(ordered=100.0, fulfilled=30.0)
        assert pending == 70.0
    
    def test_zero_pending(self):
        """Pending should be zero when fully fulfilled"""
        pending = calculate_pending_quantity(ordered=100.0, fulfilled=100.0)
        assert pending == 0.0
    
    def test_over_fulfilled(self):
        """Pending should be zero even when over-fulfilled"""
        pending = calculate_pending_quantity(ordered=100.0, fulfilled=150.0)
        assert pending == 0.0
    
    def test_floating_point_precision(self):
        """Handle floating point calculations correctly"""
        pending = calculate_pending_quantity(ordered=100.5, fulfilled=30.3)
        assert abs(pending - 70.2) < 0.001  # Allow small floating point differences
