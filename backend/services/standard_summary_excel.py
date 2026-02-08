import logging

from backend.services.excel_writer import ExcelWriter

logger = logging.getLogger(__name__)
import sqlite3
from typing import Any


class StandardSummaryExcel(ExcelWriter):
    def __init__(self, data: dict[str, Any], db: sqlite3.Connection):
        super().__init__(data, db)
        if self.workbook:
            self.worksheet = self.workbook.add_worksheet("Summary")

    def _write_headers(self):
        # Full override using backup logic structure
        pass 
        
    def generate_excel(self, filename="summary.xlsx"):
        # This completely overrides the base class flow to use the backup's exact procedure
        # Backup: generate_standard_summary(items: list[dict], db: sqlite3.Connection, save_path: str = None)
        
        items = self.data.get("items", [])
        save_path = self.data.get("save_path")
        
        if not items:
            logger.warning("StandardSummaryExcel: NO ITEMS RECEIVED")
            
        # --- Formats ---
        font_name = "Calibri"
        
        # Header: SENSTOGRAPHIC (Bold, 14pt-16pt)
        fmt_company = self.workbook.add_format({
            "bold": True, "font_size": 16, "align": "center", "font_name": font_name
        })
        # SubHeader: Address details (Bold, 10pt)
        fmt_address = self.workbook.add_format({
            "bold": True, "font_size": 10, "align": "center", "font_name": font_name, "text_wrap": True
        })
        # Title: SUMMARY (Bold, 14pt)
        fmt_title = self.workbook.add_format({
            "bold": True, "font_size": 14, "align": "center", "font_name": font_name, "top": 1, "bottom": 1
        })
        
        # Date Row
        fmt_date_label = self.workbook.add_format({"bold": True, "font_name": font_name, "align": "right"})
        fmt_date_val = self.workbook.add_format({"bold": True, "font_name": font_name, "align": "left"})
        
        # Table Header
        fmt_th = self.workbook.add_format({
            "bold": True, "border": 1, "align": "center", "valign": "vcenter", 
            "text_wrap": True, "font_name": font_name
        })
        
        # Table Cells
        fmt_cell = self.workbook.add_format({
            "border": 1, "align": "center", "valign": "vcenter", "font_name": font_name, "text_wrap": True
        })
        fmt_cell_left = self.workbook.add_format({
            "border": 1, "align": "left", "valign": "vcenter", "font_name": font_name, "text_wrap": True
        })
        
        # --- Column Widths ---
        # A=S.No(5), B=Desc(40), C=Qty(10), D=Pkts(8), E=PO(12), F=GEMC(15), G=Inv(10), H=Chal(10), I=Disp(10)
        self.worksheet.set_column("A:A", 5)
        self.worksheet.set_column("B:B", 40)
        self.worksheet.set_column("C:C", 12)
        self.worksheet.set_column("D:D", 8)
        self.worksheet.set_column("E:E", 14)
        self.worksheet.set_column("F:F", 18)
        self.worksheet.set_column("G:G", 12)
        self.worksheet.set_column("H:H", 12)
        self.worksheet.set_column("I:I", 12)

        # --- Header Section ---
        # 0. Fetch Settings
        try:
            rows = self.db.execute("SELECT key, value FROM settings").fetchall()
            settings = {row["key"]: row["value"] for row in rows}
        except Exception:
            settings = {}

        # Row 0: Tel (Left)
        s_phone = settings.get("supplier_contact") or settings.get("supplier_phone", "")
        self.worksheet.write(0, 0, f"Tel. No. {s_phone}", self.workbook.add_format({"font_name": font_name}))
        
        # Row 2: COMPANY NAME from Settings
        comp_name = settings.get("supplier_name", settings.get("company_name", ""))
        self.worksheet.merge_range("A3:I3", comp_name, fmt_company)
        
        # Row 3: Description
        s_desc = settings.get("supplier_description", "")
        self.worksheet.merge_range("A4:I4", s_desc, fmt_address)
        
        # Row 4: Address
        s_addr = settings.get("supplier_address", "")
        self.worksheet.merge_range("A5:I5", s_addr, fmt_address)
        
        # Row 5: SUMMARY
        self.worksheet.merge_range("A6:I6", "SUMMARY", fmt_title)
        
        # Row 6: Date
        from datetime import datetime
        current_date = datetime.now().strftime("%d-%m-%Y")
        self.worksheet.write(6, 1, "Date:", fmt_date_label) # B7
        self.worksheet.write(6, 2, current_date, fmt_date_val) # C7
        
        # --- Table Headers (Row 8 -> Index 7) ---
        headers = [
            "S.\nNo.", "Description", "Quantity\nSet/Nos.", "No of\npackets", 
            "PO NO", "GEMC  NO", "Invoice\nNo.", "Challa\nn\nNo.", "Received"
        ]
        
        start_row = 8
        for i, h in enumerate(headers):
            self.worksheet.write(start_row, i, h, fmt_th)
            
        # --- Data Loop ---
        row = start_row + 1
        
        for idx, item in enumerate(items):
            # Parse qty for total if possible
            q_val = item.get("ord_qty") or item.get("quantity", 0)
            try:
                # Handle potential string/float inputs safely
                if isinstance(q_val, str):
                    q_val = float(q_val.replace(',', ''))
                
                # Check if it's an int-like float
                if isinstance(q_val, float) and q_val.is_integer():
                     q_val = int(q_val)
            except (ValueError, TypeError):
                pass
                
            p_val = item.get("no_of_packets") or item.get("packets", 0)
            
            unit = item.get("unit", "")
            qty_display = f"{q_val} {unit}".strip()
            
            # Handling 0 vs None for Dispatch Delivered
            # If explicit 0, we want to show it. If None/Empty, show destination
            disp_del = item.get("dispatch_delivered")
            if disp_del is None or disp_del == "":
                 disp_del = item.get("destination", "")

            self.worksheet.write(row, 0, idx + 1, fmt_cell)
            self.worksheet.write(row, 1, item.get("description") or item.get("material_description", ""), fmt_cell_left) # Align Left for Desc
            self.worksheet.write(row, 2, qty_display, fmt_cell)
            self.worksheet.write(row, 3, p_val if p_val else "", fmt_cell)
            self.worksheet.write(row, 4, item.get("po_number", ""), fmt_cell)
            self.worksheet.write(row, 5, item.get("gemc_number", ""), fmt_cell)
            self.worksheet.write(row, 6, item.get("invoice_number", ""), fmt_cell)
            self.worksheet.write(row, 7, item.get("dc_number", ""), fmt_cell)
            self.worksheet.write(row, 8, disp_del, fmt_cell)
            row += 1

        self.workbook.close()
        self.output.seek(0)
        return self._save_or_stream(self.output, filename, save_path)