"""
CSV Generation Utility
Reusable CSV generation functions for exports.
"""

import csv
import io

from backend.core.constants import EXPORT_BOM


def generate_csv(
    headers: list[str],
    rows: list[dict],
    column_map: dict[str, str] = None
) -> io.BytesIO:
    """
    Generate CSV bytes from a list of dictionaries.
    
    Args:
        headers: Column headers in order
        rows: List of dictionaries with data
        column_map: Optional mapping from header to row key (for renaming)
    
    Returns:
        BytesIO containing UTF-8 BOM + CSV data
    """
    column_map = column_map or {}
    output = io.StringIO()
    writer = csv.writer(output)
    output.write(EXPORT_BOM)  # BOM for Excel
    writer.writerow(headers)
    
    for row in rows:
        values = []
        for header in headers:
            key = column_map.get(header, header.lower().replace(" ", "_"))
            value = row.get(key, "") if isinstance(row, dict) else getattr(row, key, "")
            values.append(str(value) if value is not None else "")
        writer.writerow(values)
    
    return io.BytesIO(output.getvalue().encode('utf-8'))


def generate_csv_from_objects(
    headers: list[str],
    objects: list,
    attr_map: dict[str, str] = None
) -> io.BytesIO:
    """
    Generate CSV bytes from a list of objects.
    
    Args:
        headers: Column headers in order
        objects: List of objects with attributes
        attr_map: Optional mapping from header to object attribute
    
    Returns:
        BytesIO containing UTF-8 BOM + CSV data
    """
    attr_map = attr_map or {}
    output = io.StringIO()
    writer = csv.writer(output)
    output.write(EXPORT_BOM)  # BOM for Excel
    writer.writerow(headers)
    
    for obj in objects:
        values = []
        for header in headers:
            attr = attr_map.get(header, header.lower().replace(" ", "_"))
            value = getattr(obj, attr, "")
            values.append(str(value) if value is not None else "")
        writer.writerow(values)
    
    return io.BytesIO(output.getvalue().encode('utf-8'))
