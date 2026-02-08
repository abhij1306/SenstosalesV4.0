"""
LinkedChain API - Document Linking and Journey Management
"""

import json
import sqlite3
from datetime import datetime

from fastapi import APIRouter, HTTPException

from backend.api.common import get_db_path
from backend.core.intelligence.linkedchain_models import (
    CreateLinkRequest,
    DocumentJourney,
    DocumentLink,
    JourneyEvent,
    JourneyStage,
    JourneyStats,
    LinkType,
    LinkValidationResult,
    StageTransitionRequest,
)

router = APIRouter(prefix="/api/linkedchain", tags=["linkedchain"])

# ============================================================
# DOCUMENT LINKING OPERATIONS
# ============================================================

@router.post("/links", response_model=DocumentLink)
def create_link(request: CreateLinkRequest):
    """Create a link between two documents"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if link already exists
        cursor.execute("""
            SELECT id FROM document_links 
            WHERE source_doc_type = ? AND source_doc_number = ?
            AND target_doc_type = ? AND target_doc_number = ?
        """, (request.source_doc_type, request.source_doc_number,
              request.target_doc_type, request.target_doc_number))
        
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Link already exists")
        
        # Create the link
        cursor.execute("""
            INSERT INTO document_links 
            (source_doc_type, source_doc_number, target_doc_type, target_doc_number, 
             link_type, created_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (request.source_doc_type, request.source_doc_number,
              request.target_doc_type, request.target_doc_number,
              request.link_type, datetime.now().isoformat(),
              json.dumps(request.metadata) if request.metadata else None))
        
        link_id = cursor.lastrowid
        conn.commit()
        
        return DocumentLink(
            id=link_id,
            source_doc_type=request.source_doc_type,
            source_doc_number=request.source_doc_number,
            target_doc_type=request.target_doc_type,
            target_doc_number=request.target_doc_number,
            link_type=request.link_type,
            created_at=datetime.now()
        )
    finally:
        conn.close()


@router.get("/links", response_model=list[DocumentLink])
def list_links(
    doc_type: str | None = None,
    doc_number: str | None = None,
    link_type: str | None = None
):
    """List document links with optional filters"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    query = "SELECT * FROM document_links WHERE 1=1"
    params = []
    
    if doc_type:
        query += " AND (source_doc_type = ? OR target_doc_type = ?)"
        params.extend([doc_type, doc_type])
    
    if doc_number:
        query += " AND (source_doc_number = ? OR target_doc_number = ?)"
        params.extend([doc_number, doc_number])
    
    if link_type:
        query += " AND link_type = ?"
        params.append(link_type)
    
    query += " ORDER BY created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [DocumentLink(
        id=row[0],
        source_doc_type=row[1],
        source_doc_number=row[2],
        target_doc_type=row[3],
        target_doc_number=row[4],
        link_type=row[5],
        created_at=datetime.fromisoformat(row[6]) if row[6] else None,
        metadata=json.loads(row[7]) if row[7] else None
    ) for row in rows]


@router.delete("/links/{link_id}")
def delete_link(link_id: int):
    """Delete a document link"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM document_links WHERE id = ?", (link_id,))
    conn.commit()
    conn.close()
    
    return {"success": True}


@router.post("/links/validate", response_model=LinkValidationResult)
def validate_link(request: CreateLinkRequest):
    """Validate if a link can be created"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    result = LinkValidationResult(
        is_valid=True,
        source_exists=False,
        target_exists=False,
        link_type_valid=False,
        already_linked=False,
        errors=[],
        warnings=[]
    )
    
    # Check if documents exist
    doc_tables = {
        "po": "po_headers",
        "dc": "dc_headers",
        "invoice": "invoices",
        "srv": "srv_headers"
    }
    
    if request.source_doc_type in doc_tables:
        cursor.execute(
            f"SELECT 1 FROM {doc_tables[request.source_doc_type]} WHERE po_number = ?",
            (request.source_doc_number,)
        )
        result.source_exists = cursor.fetchone() is not None
    
    if request.target_doc_type in doc_tables:
        cursor.execute(
            f"SELECT 1 FROM {doc_tables[request.target_doc_type]} WHERE {'po_number' if request.target_doc_type in ['po', 'srv'] else 'invoice_number' if request.target_doc_type == 'invoice' else 'dc_number'} = ?",
            (request.target_doc_number,)
        )
        result.target_exists = cursor.fetchone() is not None
    
    # Validate link type
    valid_link_types = [
        LinkType.PO_TO_DC, LinkType.DC_TO_INVOICE, LinkType.PO_TO_SRV,
        LinkType.DC_TO_SRV, LinkType.INVOICE_TO_SRV, LinkType.PO_TO_INVOICE
    ]
    result.link_type_valid = request.link_type in valid_link_types
    
    # Check if already linked
    cursor.execute("""
        SELECT id FROM document_links 
        WHERE source_doc_type = ? AND source_doc_number = ?
        AND target_doc_type = ? AND target_doc_number = ?
    """, (request.source_doc_type, request.source_doc_number,
          request.target_doc_type, request.target_doc_number))
    
    result.already_linked = cursor.fetchone() is not None
    conn.close()
    
    # Generate errors/warnings
    if not result.source_exists:
        result.errors.append("Source document not found")
    if not result.target_exists:
        result.errors.append("Target document not found")
    if not result.link_type_valid:
        result.errors.append("Invalid link type")
    if result.already_linked:
        result.errors.append("Link already exists")
    
    result.is_valid = len(result.errors) == 0
    
    return result


# ============================================================
# DOCUMENT JOURNEY OPERATIONS
# ============================================================

@router.get("/journey/{doc_type}/{doc_number}", response_model=DocumentJourney)
def get_document_journey(doc_type: str, doc_number: str):
    """Get the journey for a document"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get current stage
    cursor.execute("""
        SELECT current_stage, created_at, updated_at, completed_at
        FROM document_journey 
        WHERE doc_type = ? AND doc_number = ?
    """, (doc_type, doc_number))
    
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Journey not found")
    
    # Get stage history
    cursor.execute("""
        SELECT * FROM journey_events 
        WHERE doc_type = ? AND doc_number = ?
        ORDER BY timestamp ASC
    """, (doc_type, doc_number))
    
    history = []
    for event_row in cursor.fetchall():
        history.append({
            "id": event_row[0],
            "doc_type": event_row[1],
            "doc_number": event_row[2],
            "from_stage": event_row[3],
            "to_stage": event_row[4],
            "event_type": event_row[5],
            "trigger": event_row[6],
            "actor": event_row[7],
            "timestamp": event_row[8],
            "notes": event_row[9]
        })
    
    conn.close()
    
    return DocumentJourney(
        doc_type=doc_type,
        doc_number=doc_number,
        current_stage=row[0],
        stage_history=history,
        created_at=datetime.fromisoformat(row[1]) if row[1] else None,
        updated_at=datetime.fromisoformat(row[2]) if row[2] else None,
        completed_at=datetime.fromisoformat(row[3]) if row[3] else None
    )


@router.post("/journey/transition", response_model=JourneyEvent)
def transition_stage(request: StageTransitionRequest):
    """Transition a document to a new stage"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get current stage
    cursor.execute("""
        SELECT current_stage FROM document_journey 
        WHERE doc_type = ? AND doc_number = ?
    """, (request.doc_type, request.doc_number))
    
    row = cursor.fetchone()
    from_stage = row[0] if row else JourneyStage.DRAFT
    
    # Create journey event
    cursor.execute("""
        INSERT INTO journey_events 
        (doc_type, doc_number, from_stage, to_stage, event_type, trigger, actor, timestamp, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (request.doc_type, request.doc_number, from_stage, request.to_stage,
          "transition", request.trigger, request.actor, datetime.now().isoformat(),
          request.notes))
    
    event_id = cursor.lastrowid
    
    # Update or create journey record
    cursor.execute("""
        INSERT OR REPLACE INTO document_journey 
        (doc_type, doc_number, current_stage, updated_at, completed_at)
        VALUES (?, ?, ?, ?, ?)
    """, (request.doc_type, request.doc_number, request.to_stage,
          datetime.now().isoformat(), 
          datetime.now().isoformat() if request.to_stage == JourneyStage.COMPLETED else None))
    
    conn.commit()
    conn.close()
    
    return JourneyEvent(
        id=event_id,
        doc_type=request.doc_type,
        doc_number=request.doc_number,
        from_stage=from_stage,
        to_stage=request.to_stage,
        event_type="transition",
        trigger=request.trigger,
        actor=request.actor,
        timestamp=datetime.now(),
        notes=request.notes
    )


@router.get("/journey/stats", response_model=JourneyStats)
def get_journey_stats():
    """Get journey statistics"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Total documents with journeys
    cursor.execute("SELECT COUNT(*) FROM document_journey")
    total_documents = cursor.fetchone()[0]
    
    # By stage
    cursor.execute("SELECT current_stage, COUNT(*) FROM document_journey GROUP BY current_stage")
    by_stage = {row[0]: row[1] for row in cursor.fetchall()}
    
    # By doc type
    cursor.execute("SELECT doc_type, COUNT(*) FROM document_journey GROUP BY doc_type")
    by_doc_type = {row[0]: row[1] for row in cursor.fetchall()}
    
    # Recent transitions
    cursor.execute("""
        SELECT * FROM journey_events 
        WHERE event_type = 'transition'
        ORDER BY timestamp DESC LIMIT 10
    """)
    recent_transitions = [
        {
            "doc_type": row[1],
            "doc_number": row[2],
            "from_stage": row[3],
            "to_stage": row[4],
            "trigger": row[6],
            "timestamp": row[8]
        }
        for row in cursor.fetchall()
    ]
    
    conn.close()
    
    return JourneyStats(
        total_documents=total_documents,
        by_stage=by_stage,
        by_doc_type=by_doc_type,
        recent_transitions=recent_transitions
    )
