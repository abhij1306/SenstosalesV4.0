"""
Application Constants
Centralized constants for status values, mappings, and business rules
"""

from enum import Enum


class POStatus(str, Enum):
    """Purchase Order Status Values"""
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"
    ACTIVE = "Active"
    NEW = "New"


class DCStatus(str, Enum):
    """Delivery Challan Status Values"""
    PENDING = "Pending"
    IN_TRANSIT = "In Transit"
    DELIVERED = "Delivered"


class InvoiceStatus(str, Enum):
    """Invoice Status Values"""
    PENDING = "Pending"
    PAID = "Paid"
    OVERDUE = "Overdue"


class SRVStatus(str, Enum):
    """SRV Status Values"""
    RECEIVED = "Received"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"


# Status color mappings for UI
STATUS_COLORS = {
    "po": {
        POStatus.COMPLETED.value: "success",
        POStatus.PENDING.value: "warning",
        POStatus.IN_PROGRESS.value: "primary",
        POStatus.CANCELLED.value: "error",
        POStatus.ACTIVE.value: "success",
        POStatus.NEW.value: "primary",
    },
    "dc": {
        DCStatus.DELIVERED.value: "success",
        DCStatus.IN_TRANSIT.value: "warning",
        DCStatus.PENDING.value: "primary",
    },
    "invoice": {
        InvoiceStatus.PAID.value: "success",
        InvoiceStatus.PENDING.value: "warning",
        InvoiceStatus.OVERDUE.value: "error",
    },
    "srv": {
        SRVStatus.ACCEPTED.value: "success",
        SRVStatus.RECEIVED.value: "warning",
        SRVStatus.REJECTED.value: "error",
    }
}

# Business rule constants
MAX_ITEMS_PER_PO = 500
MAX_ITEMS_PER_DC = 500
MAX_ITEMS_PER_INVOICE = 500
MAX_ITEMS_PER_SRV = 1000

# Pagination defaults
DEFAULT_PAGE_LIMIT = 100
MAX_PAGE_LIMIT = 1000

# Financial constants
DEFAULT_CURRENCY = "INR"
DEFAULT_EXCHANGE_RATE = 1.0
GST_RATES = {
    "CGST": 0.09,  # 9%
    "SGST": 0.09,  # 9%
    "IGST": 0.18,  # 18%
}

# Date formats
DATE_FORMAT_ISO = "%Y-%m-%d"
DATE_FORMAT_INDIAN = "%d-%m-%Y"

# Document number patterns
DOC_NUMBER_PATTERN = r'^[A-Za-z0-9\-_/]+$'
GSTIN_PATTERN = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'

# Quantity calculation constants (from original constants.py)
QUANTITY_TOLERANCE = 0.001
QTY_UNIT = "NOS"

# CSV Export constants
EXPORT_BOM = "\ufeff"  # UTF-8 Byte Order Mark for Excel compatibility

# Default GST rates
DEFAULT_CGST_RATE = 0.09  # 9%
DEFAULT_SGST_RATE = 0.09  # 9%

# Batch processing constants
DEFAULT_BATCH_SIZE = 100
