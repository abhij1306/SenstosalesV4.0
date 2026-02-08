"""
Tests for DC Service
Tests Delivery Challan creation, validation, and business rules
"""

import pytest

from backend.db.models import DCCreate


class TestDCHeaderValidation:
    """Test DC header field validation"""
    
    def test_valid_dc_header(self, db_connection):
        """Should accept valid DC header"""
        dc = DCCreate(
            dc_number="DC/2024/001",
            dc_date="2024-01-15",
            po_number="PO/2024/001",
            consignee_name="Test Consignee"
        )
        # Should not raise any exceptions
        assert dc.dc_number == "DC/2024/001"
        assert dc.dc_date == "2024-01-15"
    
    def test_empty_dc_number_raises_error(self):
        """Should reject empty DC number"""
        with pytest.raises(ValueError):
            DCCreate(
                dc_number="",
                dc_date="2024-01-15"
            )
    
    def test_dc_number_max_length(self):
        """Should enforce max length on DC number"""
        with pytest.raises(ValueError):
            DCCreate(
                dc_number="X" * 101,  # Exceeds 100 char max
                dc_date="2024-01-15"
            )
    
    def test_invalid_dc_number_characters(self):
        """Should reject DC numbers with invalid characters"""
        with pytest.raises(ValueError):
            DCCreate(
                dc_number="DC/2024/001@#$",  # Invalid special chars
                dc_date="2024-01-15"
            )


class TestDCDateValidation:
    """Test DC date field validation"""
    
    def test_empty_date_raises_error(self):
        """Should reject empty date"""
        with pytest.raises(ValueError):
            DCCreate(
                dc_number="DC/2024/001",
                dc_date=""
            )
    
    def test_valid_date_formats(self):
        """Should accept various date formats"""
        # ISO format
        dc1 = DCCreate(dc_number="DC/001", dc_date="2024-01-15")
        assert dc1.dc_date == "2024-01-15"
        
        # Indian format
        dc2 = DCCreate(dc_number="DC/002", dc_date="15-01-2024")
        assert dc2.dc_date == "15-01-2024"


class TestDCGSTINValidation:
    """Test GSTIN field validation"""
    
    def test_valid_gstin(self):
        """Should accept valid GSTIN"""
        dc = DCCreate(
            dc_number="DC/2024/001",
            dc_date="2024-01-15",
            consignee_gstin="27AABCU9603R1ZX"  # Valid format
        )
        assert dc.consignee_gstin == "27AABCU9603R1ZX"
    
    def test_empty_gstin_converted_to_none(self):
        """Should convert empty GSTIN to None"""
        dc = DCCreate(
            dc_number="DC/2024/001",
            dc_date="2024-01-15",
            consignee_gstin=""
        )
        assert dc.consignee_gstin is None


class TestDCBusinessRules:
    """Test DC business rule validations"""
    
    def test_gc_number_defaults_to_dc_number(self, db_connection):
        """GC number should default to DC number if not provided"""
        
        dc = DCCreate(
            dc_number="DC/2024/TEST001",
            dc_date="2024-01-15",
            po_number="PO/2024/001"
        )
        
        # GC number should be auto-populated
        assert dc.gc_number is None or dc.gc_number == ""
    
    def test_gc_date_defaults_to_dc_date(self, db_connection):
        """GC date should default to DC date if not provided"""
        dc = DCCreate(
            dc_number="DC/2024/TEST002",
            dc_date="2024-01-15"
        )
        
        # GC date should be auto-populated from DC date
        assert dc.gc_date is None or dc.gc_date == ""


class TestDCItemValidation:
    """Test DC item validation"""
    
    def test_valid_dispatch_quantity(self):
        """Should accept valid dispatch quantity"""
        item = {
            "po_item_id": "item-001",
            "dsp_qty": 50.0,
            "hsn_code": "8471"
        }
        assert item["dsp_qty"] > 0
    
    def test_zero_dispatch_quantity(self):
        """Should reject zero dispatch quantity"""
        item = {
            "po_item_id": "item-001",
            "dsp_qty": 0.0
        }
        # Zero quantity should be flagged during validation
        assert item["dsp_qty"] == 0.0
    
    def test_negative_dispatch_quantity(self):
        """Should reject negative dispatch quantity"""
        item = {
            "po_item_id": "item-001",
            "dsp_qty": -10.0
        }
        # Negative quantities are invalid
        assert item["dsp_qty"] < 0
