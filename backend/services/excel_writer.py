import logging
import os
import sqlite3
from io import BytesIO

import xlsxwriter
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

class ExcelWriter:
    def __init__(self, data=None, db=None):
        self.data = data or {}
        self.db = db
        self.output = BytesIO()
        self.workbook = xlsxwriter.Workbook(self.output, {"in_memory": True})
        # Subclasses should add their own worksheets
        self.worksheet = None

    def generate_excel(self, filename="summary.xlsx"):
        """Generate Excel content and decide whether to save to disk or stream."""
        self._write_headers()
        self._write_data()
        self.workbook.close()
        self.output.seek(0)

        # Use the data dict to check for save_path
        save_path = self.data.get("save_path")
        return self._save_or_stream(self.output, filename, save_path)

    @staticmethod
    def _save_or_stream(output, filename: str, save_path: str = None, media_type: str = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"):
        """
        Helper method to either save the BytesIO content to a file or stream it.
        Always returns StreamingResponse for browser consistency.
        """
        if isinstance(output, bytes):
            content = output
        elif hasattr(output, "getvalue"):
            content = output.getvalue()
        else:
            content = output.read()
        
        logger.info(f"Preparing to stream file: {filename} (Size: {len(content)} bytes)")

        if save_path:
            try:
                full_path = save_path
                if not save_path.lower().endswith(('.xlsx', '.csv')):
                    full_path = os.path.join(save_path, filename)
                
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                
                # Deduplicate
                base, ext = os.path.splitext(full_path)
                final_save_path = full_path
                counter = 1
                while os.path.exists(final_save_path):
                    final_save_path = f"{base}({counter}){ext}"
                    counter += 1
                
                logger.info(f"Attempting to auto-save to: {final_save_path}")
                with open(final_save_path, "wb") as f:
                    f.write(content)
                logger.info(f"File auto-saved successfully to: {final_save_path}")
                
                # Return successful JSON response if saved to disk, so UI shows correct path
                return {
                    "success": True, 
                    "path": final_save_path, 
                    "saved_to_disk": True,
                    "message": f"Successfully saved to {final_save_path}" 
                }
            except Exception as e:
                logger.error(f"Error auto-saving to {save_path}: {e}", exc_info=True)
                # Fallthrough to stream if save fails

        logger.info("No save_path provided or save failed, streaming file.")

        # Stream for browser download if not saved to disk (or save failed)
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
        return StreamingResponse(
            BytesIO(content),
            media_type=media_type,
            headers=headers
        )

    def _write_standard_header(
        self,
        worksheet,
        workbook,
        columns: int,
        db: sqlite3.Connection,
        title: str = None,
        layout: str = "invoice",
        font_name: str = "Calibri",
    ):
        """
        Consistently writes the business header across all reports.
        """
        try:
            rows = db.execute("SELECT key, value FROM settings").fetchall()
            settings = {row["key"]: row["value"] for row in rows}
        except Exception:
            settings = {}

        s_name = settings.get("supplier_name", "")
        s_desc = settings.get("supplier_description", "")
        s_addr = settings.get("supplier_address", "")
        s_gst = settings.get("supplier_gstin", "")
        s_phone = settings.get("supplier_contact", "")

        name_fmt = workbook.add_format({"bold": True, "font_size": 14, "align": "left", "font_name": font_name})
        detail_fmt = workbook.add_format({"font_size": 11, "align": "left", "font_name": font_name})

        row = 0
        if layout == "invoice":
            if title:
                worksheet.merge_range(row, 0, row, columns - 1, title, workbook.add_format({"bold": True, "font_size": 14, "align": "center", "font_name": font_name}))
                row += 2
            worksheet.merge_range(row, 0, row, 7, s_name, name_fmt)
            row += 1
            worksheet.merge_range(row, 0, row, 7, s_desc, detail_fmt)
            row += 1
            worksheet.merge_range(row, 0, row, 7, s_addr, detail_fmt)
            row += 1
            worksheet.write(row, 0, f"GSTIN: {s_gst}", detail_fmt)
            row += 1
        else: # challan/summary
            if title:
                worksheet.merge_range(row, 0, row, columns - 1, title, workbook.add_format({"bold": True, "font_size": 18, "align": "center", "font_name": font_name}))
                row += 1
            worksheet.merge_range(row, 0, row, columns - 1, s_name, workbook.add_format({"bold": True, "font_size": 14, "align": "center", "font_name": font_name}))
            row += 1
            worksheet.merge_range(row, 0, row, columns - 1, s_addr, workbook.add_format({"font_size": 10, "align": "center", "font_name": font_name}))
            row += 1
            worksheet.write(row, 0, f"Tel: {s_phone}", detail_fmt)
            row += 1
        
        return row

    @staticmethod
    def generate_from_list(data: list[dict], filename: str, save_path: str = None) -> StreamingResponse:
        """
        Generic helper to stream list of dicts as Excel.
        """
        output = BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet("Report")
        
        if not data:
            workbook.close()
            return ExcelWriter._save_or_stream(output, filename, save_path)
            
        # Get headers from first item keys
        headers = list(data[0].keys())
        
        # Write Headers
        header_fmt = workbook.add_format({"bold": True, "border": 1, "bg_color": "#D7E4BC"})
        for col_num, header in enumerate(headers):
            worksheet.write(0, col_num, header, header_fmt)
            
        # Write Data
        for row_num, item in enumerate(data, start=1):
            for col_num, header in enumerate(headers):
                value = item.get(header, "")
                worksheet.write(row_num, col_num, value)
                
        # Auto-adjust columns
        for i, header in enumerate(headers):
            max_len = len(str(header))
            for item in data:
                val_len = len(str(item.get(header, "")))
                if val_len > max_len:
                    max_len = val_len
            worksheet.set_column(i, i, min(max_len + 2, 60))

        workbook.close()
        return ExcelWriter._save_or_stream(output, filename, save_path)

    def _write_headers(self):
        raise NotImplementedError

    def _write_data(self):
        raise NotImplementedError