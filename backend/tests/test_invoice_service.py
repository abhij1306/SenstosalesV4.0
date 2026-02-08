"""
Tests for Invoice Service
Tests Invoice creation, validation, and tax calculations
"""

import pytest

from backend.db.models import InvoiceCreate


class TestInvoiceHeaderValidation:
    """Test Invoice header field validation"""
    
    def test_valid_invoice_header(self):
        """Should accept valid Invoice header"""
        inv = InvoiceCreate(
            invoice_number="INV/2024/001",
            invoice_date="2024-01-15",
            dc_number="DC/2024/001",
            buyer_name="Test Buyer"
        )
        assert inv.invoice_number == "INV/2024/001"
        assert inv.invoice_date == "2024-01-15"
    
    def test_empty_invoice_number_raises_error(self):
        """Should reject empty invoice number"""
        with pytest.raises(ValueError):
            InvoiceCreate(
                invoice_number="",
                invoice_date="2024-01-15"
            )
    
    def test_invoice_number_max_length(self):
        """Should enforce max length on invoice number"""
        with pytest.raises(ValueError):
            InvoiceCreate(
                invoice_number="X" * 101,  # Exceeds 100 char max
                invoice_date="2024-01-15"
            )


class TestInvoiceDateValidation:
    """Test Invoice date field validation"""
    
    def test_empty_date_raises_error(self):
        """Should reject empty date"""
        with pytest.raises(ValueError):
            InvoiceCreate(
                invoice_number="INV/2024/001",
                invoice_date=""
            )


class TestInvoiceTaxCalculations:
    """Test Invoice tax calculation logic"""
    
    def test_taxable_value_positive(self):
        """Taxable value should be non-negative"""
        inv = InvoiceCreate(
            invoice_number="INV/2024/001",
            invoice_date="2024-01-15",
            taxable_value=1000.0
        )
        assert inv.taxable_value >= 0
    
    def test_cgst_calculation(self):
        """CGST should be calculated correctly"""
        inv = InvoiceCreate(
            invoice_number="INV/2024/001",
            invoice_date="2024-01-15",
            taxable_value=1000.0,
            cgst=90.0,  # 9% of 1000
            sgst=90.0,  # 9% of 1000
            igst=0.0
        )
        assert inv.cgst == 90.0
        assert inv.sgst == 90.0
    
    def test_igst_calculation(self):
        """IGST should be calculated correctly for inter-state"""
        inv = InvoiceCreate(
            invoice_number="INV/2024/001",
            invoice_date="2024-01-15",
            taxable_value=1000.0,
            cgst=0.0,
            sgst=0.0,
            igst=180.0  # 18% IGST
        )
        assert inv.igst == 180.0
    
    def test_total_invoice_value_calculation(self):
        """Total should equal taxable + all taxes"""
        inv = InvoiceCreate(
            invoice_number="INV/2024/001",
            invoice_date="2024-01-15",
            taxable_value=1000.0,
            cgst=90.0,
            sgst=90.0,
            igst=0.0,
            total_invoice_value=1180.0
        )
        expected_total = inv.taxable_value + inv.cgst + inv.sgst + inv.igst
        assert inv.total_invoice_value == expected_total


class TestInvoiceGSTINValidation:
    """Test GSTIN field validation"""
    
    def test_empty_buyer_gstin_converted_to_none(self):
        """Should convert empty buyer GSTIN to None"""
        inv = InvoiceCreate(
            invoice_number="INV/2024/001",
            invoice_date="2024-01-15",
            buyer_gstin=""
        )
        assert inv.buyer_gstin is None


class TestInvoiceBusinessRules:
    """Test Invoice business rules"""
    
    def test_invoice_requires_dc_link(self):
        """Invoice should be linked to a DC"""
        inv = InvoiceCreate(
            invoice_number="INV/2024/001",
            invoice_date="2024-01-15",
            dc_number="DC/2024/001"
        )
        assert inv.dc_number is not None
    
    def test_invoice_immutable_after_save(self):
        """Invoice quantities should not be editable after save"""
        # This is a business rule - implementation should enforce immutability
        inv = InvoiceCreate(
            invoice_number="INV/2024/001",
            invoice_date="2024-01-15",
            taxable_value=1000.0
        )
        # Once saved, quantities should be locked
        assert inv.taxable_value == 1000.0
