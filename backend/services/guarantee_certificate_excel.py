import datetime
import sqlite3

from backend.services.excel_writer import ExcelWriter


class GuaranteeCertificateExcel(ExcelWriter):
    def __init__(self, header: dict, items: list[dict], db: sqlite3.Connection, save_path: str = None):
        data = {"header": header, "items": items, "save_path": save_path}
        super().__init__(data, db)
        if self.workbook:
            self.worksheet = self.workbook.add_worksheet("Guarantee Certificate")

    def _write_headers(self):
        worksheet = self.worksheet
        workbook = self.workbook
        header = self.data.get("header", {})
        font_name = "Calibri"
        
        # --- Print Settings ---
        worksheet.set_paper(9) # A4
        worksheet.fit_to_pages(1, 1)
        worksheet.set_margins(left=0.5, right=0.5, top=0.5, bottom=0.5)

        # --- Formats from Backup ---
        fmt_tel = workbook.add_format({"font_name": font_name, "font_size": 11, "valign": "vcenter"})
        fmt_company = workbook.add_format({"bold": True, "font_name": font_name, "font_size": 20, "align": "center"})
        fmt_branding = workbook.add_format({"bold": True, "font_name": font_name, "font_size": 11, "align": "center"})
        fmt_title = workbook.add_format({"bold": True, "font_name": font_name, "font_size": 16, "align": "center"})
        fmt_box = workbook.add_format({"border": 1, "font_name": font_name, "font_size": 11, "valign": "vcenter"})
        self.fmt_table_header = workbook.add_format({"bold": True, "border": 1, "align": "center", "valign": "vcenter", "font_name": font_name, "font_size": 11, "text_wrap": True})
        self.fmt_cell_center = workbook.add_format({"border": 1, "align": "center", "valign": "vcenter", "font_name": font_name, "font_size": 11})
        self.fmt_cell_desc = workbook.add_format({"border": 1, "align": "left", "valign": "vcenter", "font_name": font_name, "font_size": 11, "text_wrap": True})

        # --- Column Widths ---
        worksheet.set_column("A:A", 10)
        worksheet.set_column("B:E", 12) 
        worksheet.set_column("F:F", 25)

        # Fetch Settings
        try:
            rows = self.db.execute("SELECT key, value FROM settings").fetchall()
            settings = {row["key"]: row["value"] for row in rows}
        except Exception:
            settings = {}

        s_phone = header.get("supplier_contact") or settings.get("supplier_contact") or settings.get("supplier_phone", "")
        s_name = header.get("supplier_name") or settings.get("supplier_name", "YOUR COMPANY NAME")
        s_addr = header.get("supplier_address") or settings.get("supplier_address", "")
        s_branding = settings.get("supplier_description", "")

        def f_dt(d_str):
            if not d_str: return ""
            try:
                dt = datetime.datetime.strptime(str(d_str).split("T")[0], "%Y-%m-%d")
                return dt.strftime("%d/%m/%Y")
            except Exception:
                return str(d_str)

        # Header writing
        worksheet.write("A1", f"Tel. No. {s_phone}", fmt_tel)
        worksheet.merge_range("A3:F3", s_name, fmt_company)
        worksheet.set_row(2, 25)
        worksheet.merge_range("A4:F4", s_branding, fmt_branding)
        worksheet.merge_range("A5:F5", s_addr, fmt_branding)
        worksheet.merge_range("A6:F6", "GUARANTEE CERTIFICATE", fmt_title)
        worksheet.set_row(5, 25)

        # Info Blocks
        b_name = header.get("consignee_name") or "CONSIGNEE NAME"
        raw_addr = header.get("consignee_address", "") or header.get("buyer_address", "")
        addr_lines = [l.strip() for l in raw_addr.replace("\r\n", "\n").split("\n") if l.strip()]
        b_company = addr_lines[0] if len(addr_lines) > 0 else ""
        b_location = ", ".join(addr_lines[1:]) if len(addr_lines) > 1 else ""

        worksheet.merge_range("A7:D7", b_name, fmt_box)
        worksheet.write("E7", "GC No. & Dt.:", fmt_box)
        worksheet.write("F7", f"{header.get('gc_number') or header.get('dc_number', '')} {f_dt(header.get('gc_date') or header.get('dc_date'))}", fmt_box)
        
        worksheet.merge_range("A8:D8", b_company, fmt_box)
        worksheet.write("E8", "PO No. & Dt.:", fmt_box)
        worksheet.write("F8", f"{header.get('po_number', '')} {f_dt(header.get('po_date'))}", fmt_box)
        
        worksheet.merge_range("A9:D9", b_location, fmt_box)
        worksheet.write("E9", "DC No. & Dt:", fmt_box)
        worksheet.write("F9", f"{header.get('dc_number', '')} {f_dt(header.get('dc_date'))}", fmt_box)

        # Table Header
        worksheet.write("A10", "P.O.\nSl. No.", self.fmt_table_header)
        worksheet.merge_range("B10:E10", "Description", self.fmt_table_header)
        worksheet.write("F10", "Quantity", self.fmt_table_header)
        worksheet.set_row(9, 30)
        self.table_row = 10

    def _write_data(self):
        items = self.data.get("items", [])
        curr = self.table_row
        for idx, item in enumerate(items):
            qty_val = float(item.get("dsp_qty") or item.get("quantity") or 0)
            q_num = int(qty_val) if qty_val == int(qty_val) else qty_val
            unit = item.get("unit", "NOS")
            if str(unit).upper() == "NO": unit = "NOS"
            qty_str = f"{q_num} {unit}"
            desc = item.get("material_description") or item.get("description", "")
            
            lines = len(desc) // 50 + 1
            height = max(30, lines * 15)
            self.worksheet.set_row(curr, height)
            
            self.worksheet.write(curr, 0, item.get("po_item_no", idx+1), self.fmt_cell_center)
            self.worksheet.merge_range(curr, 1, curr, 4, desc, self.fmt_cell_desc)
            self.worksheet.write(curr, 5, qty_str, self.fmt_cell_desc)
            curr += 1

        # Empty rows
        for _ in range(3):
            self.worksheet.write(curr, 0, "", self.fmt_cell_center)
            self.worksheet.merge_range(curr, 1, curr, 4, "", self.fmt_cell_desc)
            self.worksheet.write(curr, 5, "", self.fmt_cell_desc)
            curr += 1

        # Guarantee Text
        curr += 1
        fmt_footer = self.workbook.add_format({"border": 1, "valign": "vcenter", "text_wrap": True, "align": "left", "font_name": "Calibri", "font_size": 11, "italic": True})
        text = "This is to certify that the materials mentioned above are supplied strictly as per the specification of your order and they are guaranteed for 12 months from the date of use or 18 months from the date of dispatch whichever is earlier for any manufacturing defects."
        self.worksheet.merge_range(curr, 0, curr+2, 5, text, fmt_footer)
        self.worksheet.set_row(curr, 20); self.worksheet.set_row(curr+1, 20); self.worksheet.set_row(curr+2, 20)
        curr += 4
        
        # Signature
        try:
            rows = self.db.execute("SELECT value FROM settings WHERE key='supplier_name'").fetchone()
            s_name = rows[0] if rows else "YOUR COMPANY NAME"
        except Exception:
            s_name = "YOUR COMPANY NAME"
        
        self.worksheet.merge_range(curr, 4, curr, 5, f"For {s_name}", self.workbook.add_format({"bold": True, "font_name": "Calibri", "align": "right"}))