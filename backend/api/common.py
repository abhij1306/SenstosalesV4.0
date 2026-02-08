"""
Common/Utility routes
Provides shared functionality across modules
"""

import json
import logging
import sqlite3
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query

from backend.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Common"])


@router.get("/check-duplicate")
def check_duplicate_number(
    type: Literal["DC", "Invoice"] = Query(..., description="Type of document to check"),
    number: str = Query(..., description="Document number to check for duplicates"),
    date: str = Query(..., description="Document date (ISO format YYYY-MM-DD)"),
    db: sqlite3.Connection = Depends(get_db),
):
    """
    Check if a DC or Invoice number already exists within the same financial year.
    Uses ValidationService for centralized logic.
    """

    from backend.services.validation_service import ValidationService
    
    try:
        result = ValidationService.check_duplicate_number(db, type, number, date)
        logger.debug(f"Duplicate check for {type} #{number} in FY {result['financial_year']}: "
                     f"{'CONFLICT with ' + result['conflict_type'] if result['exists'] else 'OK'}")
        return result

    except Exception as e:
        logger.error(f"Error checking duplicate for {type}: {e}", exc_info=True)
        from backend.core.errors import internal_error
        raise internal_error("System error during duplicate validation. Document creation paused for safety.", e)


@router.get("/linked-documents")
def get_linked_documents(
    doc_type: str,
    doc_number: str,
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Returns all documents linked to the given document.
    Uses both explicit links from 'document_links' and implicit links discovered from DB relations.
    """
    try:
        results = []
        dt = doc_type.upper()
        dn = doc_number.upper()
        seen = set() # To avoid duplicates
        
        # 1. FETCH EXPLICIT LINKS (from document_links table)
        try:
            rows = db.execute("""
                SELECT * FROM document_links 
                WHERE (source_doc_type = ? AND source_doc_number = ?)
                   OR (target_doc_type = ? AND target_doc_number = ?)
                ORDER BY created_at DESC
            """, [dt, dn, dt, dn]).fetchall()
            
            for row in rows:
                is_source = row["source_doc_number"] == dn and row["source_doc_type"] == dt
                other_type = row["target_doc_type"] if is_source else row["source_doc_type"]
                other_num = row["target_doc_number"] if is_source else row["source_doc_number"]
                
                link_key = f"{other_type}:{other_num}"
                if link_key not in seen:
                    results.append({
                        "id": row["id"],
                        "source_doc_type": row["source_doc_type"],
                        "source_doc_number": row["source_doc_number"],
                        "target_doc_type": row["target_doc_type"],
                        "target_doc_number": row["target_doc_number"],
                        "link_type": row["link_type"],
                        "created_at": row["created_at"],
                        "doc_date": row["created_at"], # Fallback for manual links
                        "is_manual": True,
                        "metadata": json.loads(row["metadata"]) if row["metadata"] else {}
                    })
                    seen.add(link_key)
        except sqlite3.OperationalError:
            logger.warning("document_links table not yet initialized or missing.")

        # 2. IMPLICIT DISCOVERY (Tracer)
        # discovery_date is just for UI sorting
        now = datetime.now().isoformat()

        if dt == "PO":
            # Find DCs
            dc_rows = db.execute("SELECT dc_number, dc_date FROM delivery_challans WHERE po_number = ?", [dn]).fetchall()
            for r in dc_rows:
                key = f"DC:{r['dc_number']}"
                if key not in seen:
                    results.append({
                        "id": f"implicit_dc_{r['dc_number']}",
                        "source_doc_type": "PO", "source_doc_number": dn,
                        "target_doc_type": "DC", "target_doc_number": r["dc_number"],
                        "link_type": "DIRECT_RELATION", "is_manual": False,
                        "created_at": now,
                        "doc_date": r["dc_date"] or now
                    })
                    seen.add(key)
            
            # Find SRVs
            srv_rows = db.execute("SELECT srv_number, srv_date FROM srvs WHERE po_number = ?", [dn]).fetchall()
            for r in srv_rows:
                key = f"SRV:{r['srv_number']}"
                if key not in seen:
                    results.append({
                        "id": f"implicit_srv_{r['srv_number']}",
                        "source_doc_type": "PO", "source_doc_number": dn,
                        "target_doc_type": "SRV", "target_doc_number": r["srv_number"],
                        "link_type": "DIRECT_RELATION", "is_manual": False,
                        "created_at": now,
                        "doc_date": r["srv_date"] or now
                    })
                    seen.add(key)

            # Find Invoices (via DCs)
            inv_rows = db.execute("""
                SELECT invoice_number, invoice_date FROM gst_invoices 
                WHERE dc_number IN (SELECT dc_number FROM delivery_challans WHERE po_number = ?)
            """, [dn]).fetchall()
            for r in inv_rows:
                key = f"INVOICE:{r['invoice_number']}"
                if key not in seen:
                    results.append({
                        "id": f"implicit_inv_{r['invoice_number']}",
                        "source_doc_type": "PO", "source_doc_number": dn,
                        "target_doc_type": "INVOICE", "target_doc_number": r["invoice_number"],
                        "link_type": "FOLLOWON_RELATION", "is_manual": False,
                        "created_at": now,
                        "doc_date": r["invoice_date"] or now
                    })
                    seen.add(key)

        elif dt == "DC":
            # Find PO
            po_row = db.execute("SELECT p.po_number, p.po_date FROM purchase_orders p JOIN delivery_challans dc ON dc.po_number = p.po_number WHERE dc.dc_number = ?", [dn]).fetchone()
            if po_row:
                key = f"PO:{po_row['po_number']}"
                if key not in seen:
                    results.append({
                        "id": f"implicit_po_{po_row['po_number']}",
                        "source_doc_type": "DC", "source_doc_number": dn,
                        "target_doc_type": "PO", "target_doc_number": po_row["po_number"],
                        "link_type": "PARENT_RELATION", "is_manual": False,
                        "created_at": now,
                        "doc_date": po_row["po_date"] or now
                    })
                    seen.add(key)
            
            # Find Invoice
            inv_row = db.execute("SELECT invoice_number, invoice_date FROM gst_invoices WHERE dc_number = ?", [dn]).fetchone()
            if inv_row:
                key = f"INVOICE:{inv_row['invoice_number']}"
                if key not in seen:
                    results.append({
                        "id": f"implicit_inv_{inv_row['invoice_number']}",
                        "source_doc_type": "DC", "source_doc_number": dn,
                        "target_doc_type": "INVOICE", "target_doc_number": inv_row["invoice_number"],
                        "link_type": "DIRECT_RELATION", "is_manual": False,
                        "created_at": now,
                        "doc_date": inv_row["invoice_date"] or now
                    })
                    seen.add(key)

        # ... (further types can be added as needed, but PO is the main entrance)
        
        return results
    except Exception as e:
        logger.error(f"Failed to fetch linked documents: {e}")
        return []

@router.get("/available-documents")
def get_available_documents(
    doc_type: str,
    doc_number: str,
    link_type: str,
    db: sqlite3.Connection = Depends(get_db)
):
    """Finds potential documents that can be linked based on context."""
    # Simplified version for now - returns empty list to avoid 404
    return []

@router.post("/document-links")
def create_document_link(
    data: dict[str, Any],
    db: sqlite3.Connection = Depends(get_db)
):
    """Creates a new link between documents."""
    try:
        db.execute("""
            INSERT INTO document_links 
            (source_doc_type, source_doc_number, target_doc_type, target_doc_number, link_type, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, [
            data["source_doc_type"].upper(),
            data["source_doc_number"].upper(),
            data["target_doc_type"].upper(),
            data["target_doc_number"].upper(),
            data["link_type"].upper()
        ])
        db.commit()
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to create document link: {e}")
        return {"success": False, "error": str(e)}
