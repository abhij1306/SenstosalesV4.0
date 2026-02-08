"""
Tests for Excel generation services.
Tests DCExcel, InvoiceExcel, and GuaranteeCertificateExcel.
"""

import sqlite3
from io import BytesIO

import pytest

# Skip xlsxwriter tests if not installed
try:
    import xlsxwriter
    HAS_XLSXWRITER = True
except ImportError:
    HAS_XLSXWRITER = False

from backend.services.dc_excel import DCExcel


@pytest.mark.skipif(not HAS_XLSXWRITER, reason="xlsxwriter not installed")
class TestDCExcel:
    """Test DC Excel generation"""

    @pytest.fixture
    def mock_db(self):
        """Create in-memory SQLite database"""
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Create settings table
        cursor.execute("""
            CREATE TABLE settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        
        # Insert test settings
        settings = [
            ("supplier_name", "Test Supplier"),
            ("supplier_description", "Test Description"),
            ("supplier_address", "123 Test Street"),
            ("supplier_gstin", "22AAAAA0000A1Z5"),
            ("supplier_contact", "1234567890"),
        ]
        cursor.executemany("INSERT INTO settings VALUES (?, ?)", settings)
        conn.commit()
        
        return conn

    @pytest.fixture
    def sample_dc_data(self):
        """Sample DC data for testing"""
        return {
            "header": {
                "dc_number": "DC-2024-001",
                "dc_date": "2024-02-01",
                "po_number": "PO-2024-001",
                "po_date": "2024-01-15",
                "consignee_name": "Test Consignee",
                "consignee_address": "456 Consignee Ave\nTest City",
                "department_no": "DEPT-001",
                "our_ref": "REF-001",
                "gc_number": "GC-001",
                "gc_date": "2024-02-01",
                "invoice_number": "INV-001",
                "invoice_date": "2024-02-01",
                "supplier_name": "Test Supplier",
                "supplier_gstin": "22AAAAA0000A1Z5",
            },
            "items": [
                {
                    "po_item_no": 1,
                    "material_description": "Test Material 1",
                    "material_code": "MAT-001",
                    "dsp_qty": 10,
                    "unit": "NO",
                    "po_rate": 100.0,
                },
                {
                    "po_item_no": 2,
                    "material_description": "Test Material 2",
                    "material_code": "MAT-002",
                    "dsp_qty": 5,
                    "unit": "KG",
                    "po_rate": 200.0,
                },
            ],
        }

    def test_dc_excel_initialization(self, mock_db, sample_dc_data):
        """Test DCExcel class initialization"""
        dc_excel = DCExcel(sample_dc_data, mock_db)
        
        assert dc_excel.data == sample_dc_data
        assert dc_excel.db == mock_db
        assert dc_excel.output is not None
        assert dc_excel.workbook is not None

    def test_dc_excel_generate_excel(self, mock_db, sample_dc_data):
        """Test DC Excel generation"""
        dc_excel = DCExcel(sample_dc_data, mock_db)
        
        # Generate Excel
        result = dc_excel.generate_excel("test_dc.xlsx")
        
        # Should return StreamingResponse or dict
        assert result is not None
        
        # Verify workbook was created
        assert dc_excel.worksheet is not None

    def test_dc_excel_with_empty_items(self, mock_db):
        """Test DC Excel with empty items"""
        data = {
            "header": {
                "dc_number": "DC-2024-002",
                "dc_date": "2024-02-01",
                "po_number": "PO-2024-002",
            },
            "items": [],
        }
        
        dc_excel = DCExcel(data, mock_db)
        result = dc_excel.generate_excel("test_dc_empty.xlsx")
        
        assert result is not None

    def test_dc_excel_format_date(self, mock_db, sample_dc_data):
        """Test date formatting in DC Excel"""
        dc_excel = DCExcel(sample_dc_data, mock_db)
        
        # Test valid date
        formatted = dc_excel._fmt_date("2024-02-01")
        assert formatted == "01/02/2024"
        
        # Test empty date
        assert dc_excel._fmt_date("") == ""
        assert dc_excel._fmt_date(None) == ""

    def test_dc_excel_with_special_characters(self, mock_db):
        """Test DC Excel with special characters in data"""
        data = {
            "header": {
                "dc_number": "DC-2024-003",
                "dc_date": "2024-02-01",
                "consignee_name": "Test & Co. (Pty) Ltd.",
            },
            "items": [
                {
                    "po_item_no": 1,
                    "material_description": "Material with special chars: & < > \" '",
                    "dsp_qty": 1,
                    "unit": "NO",
                },
            ],
        }
        
        dc_excel = DCExcel(data, mock_db)
        result = dc_excel.generate_excel("test_dc_special.xlsx")
        
        assert result is not None


@pytest.mark.skipif(not HAS_XLSXWRITER, reason="xlsxwriter not installed")
class TestExcelWriter:
    """Test base ExcelWriter class"""

    def test_excel_writer_initialization(self):
        """Test ExcelWriter initialization"""
        from backend.services.excel_writer import ExcelWriter
        
        # Create a concrete implementation for testing
        class TestExcel(ExcelWriter):
            def _write_headers(self):
                pass
            
            def _write_data(self):
                pass
        
        writer = TestExcel()
        
        assert writer.data == {}
        assert writer.db is None
        assert writer.output is not None
        assert writer.workbook is not None

    def test_excel_writer_save_or_stream(self):
        """Test save_or_stream static method"""
        from backend.services.excel_writer import ExcelWriter
        
        output = BytesIO(b"test content")
        result = ExcelWriter._save_or_stream(output, "test.xlsx")
        
        # Should return StreamingResponse
        assert result is not None


class TestExcelGenerationErrors:
    """Test error handling in Excel generation"""

    @pytest.fixture
    def sample_dc_data(self):
        """Sample DC data for testing"""
        return {
            "header": {
                "dc_number": "DC-2024-001",
                "dc_date": "2024-02-01",
                "po_number": "PO-2024-001",
            },
            "items": [],
        }

    @pytest.fixture
    def mock_db(self):
        """Create in-memory SQLite database"""
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        conn.commit()
        return conn

    def test_dc_excel_with_missing_db(self, sample_dc_data):
        """Test DC Excel with missing database"""
        # Should handle missing DB gracefully
        dc_excel = DCExcel(sample_dc_data, None)
        
        # Should not raise exception
        try:
            result = dc_excel.generate_excel("test.xlsx")
            # May return None or empty response when DB is missing
        except Exception as e:
            # If exception is raised, it should be handled gracefully
            pytest.fail(f"Should handle missing DB gracefully: {e}")

    def test_dc_excel_with_none_data(self, mock_db):
        """Test DC Excel with None data"""
        dc_excel = DCExcel(None, mock_db)
        
        # Should use default empty data
        assert dc_excel.data == {}


# Integration test with actual file generation
@pytest.mark.skipif(not HAS_XLSXWRITER, reason="xlsxwriter not installed")
class TestExcelIntegration:
    """Integration tests for Excel generation"""

    @pytest.fixture
    def mock_db(self):
        """Create in-memory database for integration tests"""
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        
        settings = [
            ("supplier_name", "Integration Test Supplier"),
            ("supplier_address", "Integration Test Address"),
            ("supplier_gstin", "22INTEG0000A1Z5"),
        ]
        cursor.executemany("INSERT INTO settings VALUES (?, ?)", settings)
        conn.commit()
        
        return conn

    def test_full_dc_excel_generation(self, mock_db):
        """Test complete DC Excel generation workflow"""
        data = {
            "header": {
                "dc_number": "DC-INT-001",
                "dc_date": "2024-02-15",
                "po_number": "PO-INT-001",
                "po_date": "2024-02-01",
                "consignee_name": "Integration Consignee",
                "consignee_address": "Integration Address",
                "department_no": "DEPT-INT",
                "our_ref": "REF-INT",
                "gc_number": "GC-INT",
                "gc_date": "2024-02-15",
            },
            "items": [
                {
                    "po_item_no": i + 1,
                    "material_description": f"Integration Material {i+1}",
                    "dsp_qty": 10 * (i + 1),
                    "unit": "NO" if i % 2 == 0 else "KG",
                    "po_rate": 100.0 * (i + 1),
                }
                for i in range(5)
            ],
        }
        
        dc_excel = DCExcel(data, mock_db)
        
        # Generate without save path
        result = dc_excel.generate_excel("Integration_DC.xlsx")
        
        # Should return StreamingResponse
        assert result is not None
        assert hasattr(result, 'body') or hasattr(result, 'status_code')
