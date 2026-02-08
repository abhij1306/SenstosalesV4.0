"""
Unified Date Utility functions for consistent date parsing across the system.
"""

import re
from datetime import datetime
from typing import Any

# Re-export financial year from utils for backward compatibility
from backend.core.utils import get_financial_year as _get_financial_year


def normalize_date(val: Any) -> str:
    """
    Normalize various date formats into standard ISO YYYY-MM-DD.
    Handles:
    - YYYY-MM-DD (ISO)
    - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    - DD-MMM-YY, DD-MMM-YYYY (e.g. 05-JAN-24)
    """
    if not val:
        return ""

    s = str(val).strip().upper()

    # Pass through YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s

    # dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy or dd mm yyyy
    m = re.search(r"(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})", s)
    if m:
        d, mth, y = m.groups()
        if len(y) == 2:
            y = "20" + y
        try:
            return f"{int(y)}-{int(mth):02d}-{int(d):02d}"
        except (ValueError, TypeError):
            pass

    # dd-MMM-yy or dd-MMM-yyyy or dd.MMM.yyyy or dd MMM yyyy
    m = re.search(r"(\d{1,2})[\/\-\.\s]([A-Z]{3})[\/\-\.\s](\d{2,4})", s)
    if m:
        d, mon, y = m.groups()
        if len(y) == 2:
            y = "20" + y
        try:
            # Handle standard month abbreviations
            dt = datetime.strptime(f"{d}-{mon}-{y}", "%d-%B-%Y") if len(mon) > 3 else datetime.strptime(f"{d}-{mon}-{y}", "%d-%b-%Y")
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    return ""


def get_financial_year(date_str: str = None) -> str:
    """
    Derive Financial Year (April to March) from a date.
    
    Args:
        date_str: Date string in YYYY-MM-DD format (optional)
    
    Returns:
        Financial year in format "2024-25"
    """
    return _get_financial_year(date_str)
