import logging
import sqlite3

from fastapi.responses import StreamingResponse

from backend.services.excel_writer import ExcelWriter

logger = logging.getLogger(__name__)


class ExcelService(ExcelWriter):
    @staticmethod
    def generate_exact_dc_excel(header: dict, items: list[dict], db: sqlite3.Connection, save_path: str = None):
        from backend.services.dc_excel import DCExcel
        
        data = {
            "header": header,
            "items": items,
            "save_path": save_path
        }
        
        return DCExcel(data, db).generate_excel()
    @staticmethod
    def generate_exact_invoice_excel(header: dict, items: list[dict], db: sqlite3.Connection, save_path: str = None):
        from backend.services.invoice_excel import InvoiceExcel
        return InvoiceExcel(header, items, db, save_path).generate_excel()

    @staticmethod
    def generate_gc_excel(header: dict, items: list[dict], db: sqlite3.Connection, save_path: str = None) -> StreamingResponse:
        from backend.services.guarantee_certificate_excel import GuaranteeCertificateExcel
        
        return GuaranteeCertificateExcel(header, items, db, save_path).generate_excel()

    @staticmethod
    def generate_standard_summary(items: list[dict], db: sqlite3.Connection, save_path: str = None) -> StreamingResponse:
        from backend.services.standard_summary_excel import StandardSummaryExcel
        
        return StandardSummaryExcel({"items": items, "save_path": save_path}, db).generate_excel(filename="Items_summary.xlsx")

    @staticmethod
    def generate_dispatch_summary(date_str: str, items: list[dict], db: sqlite3.Connection, save_path: str = None) -> StreamingResponse:
        from backend.services.dispatch_summary_excel import DispatchSummaryExcel
        return DispatchSummaryExcel({"items": items, "save_path": save_path}, db).generate_excel(filename=f"Dispatch_Summary_{date_str}.xlsx")