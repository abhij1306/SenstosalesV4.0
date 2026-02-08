import datetime
import sqlite3
from typing import Any

from backend.services.excel_writer import ExcelWriter


class DispatchSummaryExcel(ExcelWriter):
    def __init__(self, data: dict[str, Any], db: sqlite3.Connection):
        super().__init__(data, db)
        if self.workbook:
            self.worksheet = self.workbook.add_worksheet("Summary")

    def _write_headers(self):
        worksheet = self.worksheet
        workbook = self.workbook
        font_name = "Calibri"
        
        # Styles from backup
        self.fmt_th = workbook.add_format({"bold": True, "border": 1, "align": "center", "valign": "vcenter", "text_wrap": True, "font_name": font_name})
        self.fmt_cell = workbook.add_format({"border": 1, "align": "center", "valign": "vcenter", "font_name": font_name})
        self.fmt_cell_left = workbook.add_format({"border": 1, "align": "left", "valign": "vcenter", "font_name": font_name})
        self.fmt_bold_left = workbook.add_format({"bold": True, "font_name": font_name})
        
        # Column Widths matching backup
        worksheet.set_column("A:A", 5)  # S.No
        worksheet.set_column("B:B", 40) # Description
        worksheet.set_column("C:C", 15) # Qty
        worksheet.set_column("D:D", 10) # Packets
        worksheet.set_column("E:E", 15) # PO No
        worksheet.set_column("F:F", 18) # GEMC No
        worksheet.set_column("G:G", 12) # Invoice No
        worksheet.set_column("H:H", 12) # Challan No
        worksheet.set_column("I:I", 20) # Dispatch Delivered (Destination)

        # Header logic
        current_row = self._write_standard_header(
            worksheet, workbook, columns=9, db=self.db, title="SUMMARY", layout="challan"
        )
        
        date_str = self.data.get("date_str") or datetime.datetime.now().strftime("%d-%m-%Y")
        worksheet.write(current_row, 1, "Date:", self.fmt_bold_left)
        worksheet.write(current_row, 2, date_str, self.fmt_bold_left)
        
        self.table_row = current_row + 2
        headers = [
            "S.\nNo.", "Description", "Quantity\nSet/Nos.", "No of\npackets", 
            "PO NO", "GEMC  NO", "Invoice\nNo.", "Challa\nn\nNo.", "Dispatch\nDelivered"
        ]
        for i, h in enumerate(headers):
            worksheet.write(self.table_row, i, h, self.fmt_th)

    def _write_data(self):
        items = self.data.get("items", [])
        row = self.table_row + 1
        for idx, item in enumerate(items):
            self.worksheet.write(row, 0, idx + 1, self.fmt_cell)
            self.worksheet.write(row, 1, item.get("description") or item.get("material_description", ""), self.fmt_cell_left)
            
            qty = item.get("quantity") or item.get("ord_qty", "")
            unit = item.get("unit", "")
            self.worksheet.write(row, 2, f"{qty} {unit}".strip(), self.fmt_cell)
            
            self.worksheet.write(row, 3, item.get("packets") or item.get("no_of_packets", ""), self.fmt_cell)
            self.worksheet.write(row, 4, item.get("po_number", ""), self.fmt_cell)
            self.worksheet.write(row, 5, item.get("gemc_number", ""), self.fmt_cell)
            self.worksheet.write(row, 6, item.get("invoice_number", ""), self.fmt_cell)
            self.worksheet.write(row, 7, item.get("dc_number", ""), self.fmt_cell)
            
            # Use 'dispatch_delivered' or 'destination'
            dest = item.get("dispatch_delivered") or item.get("destination", "")
            self.worksheet.write(row, 8, dest, self.fmt_cell)
            row += 1