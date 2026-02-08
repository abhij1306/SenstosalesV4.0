import logging
from datetime import datetime

from backend.services.excel_writer import ExcelWriter

logger = logging.getLogger(__name__)

class DCExcel(ExcelWriter):
    def __init__(self, data, db):
        super().__init__(data, db)
        # We handle worksheet creation in _write_headers to match backup logic exactly

    def _write_headers(self):
        header = self.data.get("header", {})
        db = self.db
        workbook = self.workbook
        
        # In DCExcel, we create the sheet here to ensure it uses the backup name
        if not self.worksheet:
            self.worksheet = workbook.add_worksheet("Delivery Challan")
        
        worksheet = self.worksheet
        base_font = "Calibri"

        # --- Base Formats from Backup ---
        fmt_tel = workbook.add_format({"font_size": 10, "font_name": base_font})
        fmt_gstin = workbook.add_format({"font_size": 10, "align": "right", "font_name": base_font})
        fmt_title = workbook.add_format({"bold": True, "font_size": 18, "align": "center", "font_name": base_font})
        fmt_branding = workbook.add_format({"bold": True, "font_size": 11, "align": "center", "font_name": base_font})
        fmt_address = workbook.add_format({"font_size": 10, "align": "center", "font_name": base_font})
        fmt_doc_type = workbook.add_format({"bold": True, "font_size": 14, "align": "center", "font_name": base_font, "underline": True})
        
        self.fmt_label = workbook.add_format({"font_size": 10, "font_name": base_font, "valign": "vcenter"})
        self.fmt_value = workbook.add_format({"font_size": 10, "bold": True, "font_name": base_font, "valign": "vcenter"})
        
        self.fmt_box_l = workbook.add_format({"font_size": 10, "font_name": base_font, "valign": "vcenter", "left": 1})
        self.fmt_box_r = workbook.add_format({"font_size": 10, "font_name": base_font, "valign": "vcenter", "right": 1})
        self.fmt_box_tl = workbook.add_format({"font_size": 10, "font_name": base_font, "valign": "vcenter", "left": 1, "top": 1})
        self.fmt_box_tr = workbook.add_format({"font_size": 10, "font_name": base_font, "valign": "vcenter", "right": 1, "top": 1})
        self.fmt_box_bl = workbook.add_format({"font_size": 10, "font_name": base_font, "valign": "vcenter", "left": 1, "bottom": 1})
        self.fmt_box_br = workbook.add_format({"font_size": 10, "font_name": base_font, "valign": "vcenter", "right": 1, "bottom": 1})
        self.fmt_box_t = workbook.add_format({"font_size": 10, "font_name": base_font, "valign": "vcenter", "top": 1})
        self.fmt_box_b = workbook.add_format({"font_size": 10, "font_name": base_font, "valign": "vcenter", "bottom": 1})
        
        self.fmt_val_t = workbook.add_format({"font_size": 10, "bold": True, "font_name": base_font, "valign": "vcenter", "top": 1})
        self.fmt_val_b = workbook.add_format({"font_size": 10, "bold": True, "font_name": base_font, "valign": "vcenter", "bottom": 1})
        
        self.fmt_th = workbook.add_format({"bold": True, "border": 1, "align": "center", "valign": "vcenter", "font_name": base_font, "text_wrap": True, "font_size": 11})
        self.fmt_td = workbook.add_format({"border": 1, "valign": "top", "font_name": base_font, "text_wrap": True, "font_size": 10})
        self.fmt_td_center = workbook.add_format({"border": 1, "align": "center", "valign": "vcenter", "font_name": base_font, "font_size": 10})
        self.fmt_td_remark = workbook.add_format({"border": 1, "valign": "top", "font_name": base_font, "font_size": 10})
        self.fmt_footer = workbook.add_format({"font_size": 10, "font_name": base_font, "valign": "vcenter"})
        self.fmt_sig = workbook.add_format({"bold": True, "font_size": 11, "font_name": base_font, "align": "right"})

        # Column Widths
        worksheet.set_column("A:A", 12)
        worksheet.set_column("B:F", 12)
        worksheet.set_column("G:G", 15)
        worksheet.set_column("H:H", 18)

        def fmt_date(d_str):
            if not d_str: return ""
            try:
                dt = datetime.strptime(str(d_str).split("T")[0], "%Y-%m-%d")
                return dt.strftime("%d/%m/%Y")
            except Exception:
                return str(d_str)

        try:
            rows = db.execute("SELECT key, value FROM settings").fetchall()
            settings = {row["key"]: row["value"] for row in rows}
        except Exception:
            settings = {}

        s_phone = header.get("supplier_contact") or settings.get("supplier_contact") or settings.get("supplier_phone", "")
        s_gst = header.get("supplier_gstin") or settings.get("supplier_gstin", "")
        s_name = header.get("supplier_name") or settings.get("supplier_name", "YOUR COMPANY NAME")
        s_addr = header.get("supplier_address") or settings.get("supplier_address", "")

        # Header Rows
        worksheet.write("A1", f"Tel. No. {s_phone}", fmt_tel)
        worksheet.write("H1", f"GSTIN: {s_gst}", fmt_gstin)
        worksheet.merge_range("A3:H3", s_name, fmt_title)
        s_branding = settings.get("supplier_description", "")
        worksheet.merge_range("A4:H4", s_branding, fmt_branding)
        worksheet.merge_range("A5:H5", s_addr, fmt_address)
        worksheet.merge_range("A7:H7", "DELIVERY CHALLAN", fmt_doc_type)

        # Consignee Box
        b_name = header.get("consignee_name") or "CONSIGNEE NAME"
        raw_addr = header.get("consignee_address", "") or header.get("buyer_address", "")
        addr_lines = [l.strip() for l in raw_addr.replace("\r\n", "\n").split("\n") if l.strip()]
        b_company = addr_lines[0] if len(addr_lines) > 0 else ""
        b_location = ", ".join(addr_lines[1:]) if len(addr_lines) > 1 else ""

        worksheet.write("A8", b_name, self.fmt_box_tl)
        worksheet.write("E8", "", self.fmt_box_tr)
        worksheet.write("A9", b_company, self.fmt_box_l)
        worksheet.write("E9", "", self.fmt_box_r)
        worksheet.write("A10", b_location, self.fmt_box_bl)
        worksheet.write("E10", "", self.fmt_box_br)
        for c in range(1, 5):
            worksheet.write(7, c, "", self.fmt_box_t)
            worksheet.write(9, c, "", self.fmt_box_b)

        # Challan Box
        worksheet.write("F8", "Challan No. :", self.fmt_box_tl)
        worksheet.write("G8", header.get("dc_number", ""), self.fmt_val_t)
        worksheet.write("H8", "", self.fmt_box_tr)
        worksheet.write("F9", "Date :", self.fmt_box_l)
        worksheet.write("G9", fmt_date(header.get("dc_date")), self.fmt_value)
        worksheet.write("H9", "", self.fmt_box_r)
        worksheet.write("F10", "Our Ref :", self.fmt_box_bl)
        worksheet.write("G10", header.get("our_ref", ""), self.fmt_val_b)
        worksheet.write("H10", "", self.fmt_box_br)

        worksheet.write("A12", f"Your Order No. :  {header.get('po_number', '')}", self.fmt_label)
        worksheet.write("D12", "Date:", self.fmt_label)
        worksheet.write("E12", fmt_date(header.get("po_date")), self.fmt_value)
        
        dest_code = header.get("department_no") or header.get("destination") or ""
        worksheet.write("A13", f"Goods Dispatched Delivered to:  {dest_code}", self.fmt_label)

    def _write_data(self):
        items = self.data.get("items", [])
        header = self.data.get("header", {})
        worksheet = self.worksheet
        
        tr = 14
        worksheet.write(tr, 0, "P.O.SI.\nNo.", self.fmt_th)
        worksheet.merge_range(tr, 1, tr, 5, "Description", self.fmt_th)
        worksheet.merge_range(tr, 6, tr, 7, "Quantity", self.fmt_th)
        worksheet.set_row(tr, 35)

        curr = tr + 1
        for idx, item in enumerate(items):
            qty_val = float(item.get("dsp_qty") or 0)
            q_num = int(qty_val) if qty_val == int(qty_val) else qty_val
            qty_str = f"{q_num} {item.get('unit', 'NO')}"
            desc = item.get("material_description") or item.get("description", "")
            worksheet.set_row(curr, max(35, 15 * (1 + len(desc) // 60)))
            worksheet.write(curr, 0, item.get("po_item_no", idx + 1), self.fmt_td_center)
            worksheet.merge_range(curr, 1, curr, 5, desc, self.fmt_td)
            worksheet.merge_range(curr, 6, curr, 7, qty_str, self.fmt_td_center)
            curr += 1

        remarks_list = []
        gc_no, gc_dt = header.get("gc_number"), header.get("gc_date")
        if gc_no:
            remarks_list.append(f"Guarantee Certificate No. {gc_no} Dt. {self._fmt_date(gc_dt)}")
        
        inv_no, inv_dt = header.get("invoice_number", ""), header.get("invoice_date")
        remarks_list.append(f"GST Bill No. {inv_no}  Dt. {self._fmt_date(inv_dt) if inv_dt else ''}")
        remarks_list.extend(["Dimension Report", "TC No:-  dt.  Of", "TC No  dt.  Of", "Lot No.  -"])
        
        total_value = sum(float(i.get("dsp_qty", 0) or 0) * float(i.get("rate", 0) or i.get("po_rate", 0) or 0) for i in items)
        remarks_list.append(f"Consignment Value of DC ₹{total_value:,.2f}")

        for rem_text in remarks_list:
            worksheet.set_row(curr, 18)
            worksheet.write(curr, 0, "", self.fmt_td_remark)
            worksheet.merge_range(curr, 1, curr, 5, rem_text, self.fmt_td_remark)
            worksheet.merge_range(curr, 6, curr, 7, "", self.fmt_td_remark)
            curr += 1

        for c in range(0, 8):
            worksheet.write(curr, c, "", self.workbook.add_format({"top": 1}))

        footer_r = curr + 1
        worksheet.write(footer_r, 1, "Received the Goods in good condition", self.fmt_footer)
        s_name = header.get("supplier_name") or "YOUR COMPANY"
        worksheet.merge_range(footer_r, 6, footer_r, 7, f"For {s_name}", self.fmt_sig)
        worksheet.write(footer_r + 2, 1, "E. & O.E.", self.fmt_footer)

    def _fmt_date(self, d_str):
        if not d_str: return ""
        try:
            dt = datetime.strptime(str(d_str).split("T")[0], "%Y-%m-%d")
            return dt.strftime("%d/%m/%Y")
        except Exception:
            return str(d_str)