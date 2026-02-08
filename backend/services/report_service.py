import sqlite3
import typing


def get_reports(
    report_type: str,
    start_date: str | None,
    end_date: str | None,
    db: sqlite3.Connection,
    **kwargs
) -> typing.Any:
    """Unified report fetcher"""
    if report_type == "reconciliation":
        return get_po_reconciliation_by_date(start_date, end_date, db, **kwargs)

    elif report_type == "dc_register":
        return get_dc_register(start_date, end_date, db)
    elif report_type == "invoice_register":
        return get_invoice_register(start_date, end_date, db)
    elif report_type == "pending":
        return get_pending_po_items(db)
    elif report_type == "po_register":
        return get_po_register(start_date, end_date, db)
    else:
        raise ValueError(f"Unknown report type: {report_type}")


def get_pending_po_items(
    db: sqlite3.Connection,
    limit: int = 100,
    offset: int = 0,
    sort_by: str = "po_number",
    order: str = "asc"
) -> tuple[list[dict], int]:
    """
    Get items where pending_qty > 0 with full details (DC, Invoice, etc).
    """
    sort_map = {
        "po_number": "poi.po_number",
        "description": "description",
        "ord_qty": "poi.ord_qty",
        "dispatch_delivered": "dispatch_delivered"
    }
    db_sort_col = sort_map.get(sort_by, "poi.po_number")
    db_order = "DESC" if order.lower() == "desc" else "ASC"

    # Base where clause
    where_clause = "WHERE (poi.ord_qty - COALESCE(poi.rcd_qty, 0)) > 0.001"

    # Count query
    count_query = f"SELECT COUNT(*) FROM purchase_order_items poi {where_clause}"
    total_count = db.execute(count_query).fetchone()[0]

    query = f"""
    WITH doc_aggregates AS (
        SELECT 
            dci.po_item_id,
            SUM(COALESCE(dci.no_of_packets, 0)) as total_packets,
            GROUP_CONCAT(DISTINCT dc.dc_number) as dc_numbers,
            GROUP_CONCAT(DISTINCT inv.invoice_number) as invoice_numbers,
            GROUP_CONCAT(DISTINCT inv.gemc_number) as gemc_numbers
        FROM delivery_challan_items dci
        JOIN delivery_challans dc ON dci.dc_number = dc.dc_number
        LEFT JOIN gst_invoices inv ON dc.dc_number = inv.dc_number
        GROUP BY dci.po_item_id
    )
    SELECT 
        poi.id as unique_id,
        poi.id,
        poi.po_number,
        COALESCE(poi.material_description, poi.material_code, 'No Description') as description,
        COALESCE(poi.material_code, '') as item_code,
        poi.ord_qty,
        (poi.ord_qty - COALESCE(poi.rcd_qty, 0)) as pending_qty,
        COALESCE(poi.rcd_qty, 0) as received_qty,
        poi.unit,
        COALESCE(da.total_packets, 0) as no_of_packets,
        COALESCE(da.gemc_numbers, '') as gemc_number,
        COALESCE(da.invoice_numbers, '') as invoice_number,
        COALESCE(da.dc_numbers, '') as dc_number,
        COALESCE(poi.dsp_qty, 0) as dispatch_delivered
    FROM purchase_order_items poi
    LEFT JOIN doc_aggregates da ON poi.id = da.po_item_id
    {where_clause}
    ORDER BY {db_sort_col} {db_order}
    LIMIT ? OFFSET ?;
    """
    rows = db.execute(query, (limit, offset)).fetchall()
    return [dict(row) for row in rows], total_count

def get_selected_items_details(item_ids: list[str], db: sqlite3.Connection) -> list[dict]:
    """
    Get detailed data for specific items for Export.
    """
    if not item_ids:
        return []

    
    # 1. Determine Match Logic (Full vs Truncated)
    match_col_poi, match_col_dci = _get_id_match_clauses(item_ids)
    
    placeholders = ",".join(["?"] * len(item_ids))
    
    query = f"""
    WITH doc_aggregates AS (
        SELECT 
            dci.po_item_id, 
            SUM(dci.dsp_qty) as total_dispatched,
            SUM(dci.no_of_packets) as total_packets,
            GROUP_CONCAT(DISTINCT dc.dc_number) as dc_numbers,
            GROUP_CONCAT(DISTINCT inv.invoice_number) as invoice_numbers,
            GROUP_CONCAT(DISTINCT inv.gemc_number) as gemc_numbers
        FROM delivery_challan_items dci
        JOIN delivery_challans dc ON dci.dc_number = dc.dc_number
        LEFT JOIN gst_invoices inv ON dc.dc_number = inv.dc_number
        WHERE {match_col_dci} IN ({placeholders})
        GROUP BY dci.po_item_id
    )
    SELECT 
        poi.id,
        COALESCE(poi.material_description, poi.material_code, '') as description,
        poi.ord_qty, 
        poi.unit,
        poi.po_number,
        COALESCE(da.gemc_numbers, '') as gemc_number,
        COALESCE(da.total_dispatched, 0) as dispatch_delivered,
        COALESCE(da.total_packets, 0) as no_of_packets,
        COALESCE(da.dc_numbers, '') as dc_number,
        COALESCE(da.invoice_numbers, '') as invoice_number
    FROM purchase_order_items poi
    LEFT JOIN doc_aggregates da ON poi.id = da.po_item_id
    WHERE {match_col_poi} IN ({placeholders})
    ORDER BY poi.po_number, poi.po_item_no;
    """
    
    # We pass placeholders twice (CTE and Main Query)
    params = item_ids + item_ids
    rows = db.execute(query, params).fetchall()
    
    return [
        {
            **dict(row),
            "ord_qty": float(row["ord_qty"] or 0),
            "dispatch_delivered": float(row["dispatch_delivered"] or 0),
            "no_of_packets": float(row["no_of_packets"] or 0)
        }
        for row in rows
    ]

def _get_id_match_clauses(item_ids: list[str]) -> tuple[str, str]:
    """
    Returns the appropriate SQL column identifiers for matching IDs.
    Handles truncated (12-char) IDs from frontend vs full UUIDs.
    """
    if not item_ids:
        return "poi.id", "dci.po_item_id"

    # Check for short ID usage (e.g. 12 char truncated from frontend)
    is_short_id = len(str(item_ids[0])) == 12
    
    match_col_poi = "SUBSTR(poi.id, 1, 12)" if is_short_id else "poi.id"
    match_col_dci = "SUBSTR(dci.po_item_id, 1, 12)" if is_short_id else "dci.po_item_id"
    
    return match_col_poi, match_col_dci


def get_po_reconciliation_by_date(
    start: str, 
    end: str, 
    db: sqlite3.Connection,
    limit: int = 100,
    offset: int = 0,
    sort_by: str = "po_date",
    order: str = "desc"
) -> tuple[list[dict], int]:
    """Detailed PO Item Reconciliation with LIVE aggregates and Pagination"""
    
    # Sort mapping
    sort_map = {
        "po_number": "poi.po_number",
        "po_date": "po.po_date",
        "item_description": "item_description",
        "ordered_qty": "ordered_qty",
        "total_dispatched": "total_dispatched",
        "total_accepted": "total_accepted",
        "total_rejected": "total_rejected",
        "pending_qty": "pending_qty"
    }
    db_sort_col = sort_map.get(sort_by, "po.po_date")
    db_order = "DESC" if order.lower() == "desc" else "ASC"

    # Base query parts
    cte_part = """
    WITH dsp_aggregates AS (
        SELECT po_item_id, SUM(dsp_qty) as total_dispatched
        FROM delivery_challan_items
        GROUP BY po_item_id
    ),
    rcv_aggregates AS (
        SELECT po_number, po_item_no, SUM(CAST(rcd_qty AS REAL)) as total_received, SUM(CAST(rej_qty AS REAL)) as total_rejected
        FROM srv_items
        GROUP BY po_number, po_item_no
    )
    """
    
    # 1. Get Total Count first
    count_query = f"""
    {cte_part}
    SELECT COUNT(*)
    FROM purchase_order_items poi
    INNER JOIN purchase_orders po ON poi.po_number = po.po_number
    WHERE date(po.po_date) BETWEEN date(?) AND date(?)
    """
    total_count = db.execute(count_query, (start, end)).fetchone()[0]

    # 2. Get Data with Sort & Pagination
    query = f"""
    {cte_part}
    SELECT 
        poi.id,
        poi.po_number,
        poi.po_item_no,
        po.po_date,
        COALESCE(poi.material_description, poi.material_code, '') as item_description,
        COALESCE(poi.ord_qty, 0) as ordered_qty,
        COALESCE(da.total_dispatched, 0) as total_dispatched,
        COALESCE(ra.total_received, 0) as total_accepted,
        COALESCE(ra.total_rejected, 0) as total_rejected,
        (COALESCE(poi.ord_qty, 0) - COALESCE(da.total_dispatched, 0)) as pending_qty
    FROM purchase_order_items poi
    INNER JOIN purchase_orders po ON poi.po_number = po.po_number
    LEFT JOIN dsp_aggregates da ON poi.id = da.po_item_id
    LEFT JOIN rcv_aggregates ra ON poi.po_number = ra.po_number AND CAST(poi.po_item_no AS TEXT) = CAST(ra.po_item_no AS TEXT)
    WHERE date(po.po_date) BETWEEN date(?) AND date(?)
    ORDER BY {db_sort_col} {db_order}
    LIMIT ? OFFSET ?
    """
    
    rows = db.execute(query, (start, end, limit, offset)).fetchall()
    return [dict(row) for row in rows], total_count

def get_reconciliation_lots(po: str, db: sqlite3.Connection) -> list[dict]:
    """Get lot-wise reconciliation for a specific PO"""
    query = """
    SELECT 
        l.lot_no,
        l.dely_date,
        l.ord_qty as lot_qty,
        l.dsp_qty as lot_delivered,
        l.rcd_qty as lot_received
    FROM purchase_order_deliveries l
    JOIN purchase_order_items poi ON l.po_item_id = poi.id
    WHERE poi.po_number = ?
    ORDER BY l.lot_no
    """
    rows = db.execute(query, (po,)).fetchall()
    return [dict(row) for row in rows]


def get_reconciliation_by_item_ids(item_ids: list[str], db: sqlite3.Connection) -> list[dict]:
    """
    Get reconciliation data for specific PO item IDs.
    Used for exporting selected reconciliation items.
    """
    if not item_ids:
        return []
    
    # Determine match logic (Full vs Truncated)
    is_short_id = len(str(item_ids[0])) == 12
    match_col_poi = "SUBSTR(poi.id, 1, 12)" if is_short_id else "poi.id"
    
    placeholders = ",".join(["?"] * len(item_ids))
    
    query = f"""
    WITH dsp_aggregates AS (
        SELECT po_item_id, SUM(dsp_qty) as total_dispatched
        FROM delivery_challan_items
        GROUP BY po_item_id
    ),
    rcv_aggregates AS (
        SELECT po_number, po_item_no, SUM(CAST(rcd_qty AS REAL)) as total_received, SUM(CAST(rej_qty AS REAL)) as total_rejected
        FROM srv_items
        GROUP BY po_number, po_item_no
    )
    SELECT 
        poi.id,
        poi.po_number,
        poi.po_item_no,
        po.po_date,
        COALESCE(poi.material_description, poi.material_code, '') as item_description,
        COALESCE(poi.ord_qty, 0) as ordered_qty,
        COALESCE(da.total_dispatched, 0) as total_dispatched,
        COALESCE(ra.total_received, 0) as total_accepted,
        COALESCE(ra.total_rejected, 0) as total_rejected,
        (COALESCE(poi.ord_qty, 0) - COALESCE(da.total_dispatched, 0)) as pending_qty
    FROM purchase_order_items poi
    INNER JOIN purchase_orders po ON poi.po_number = po.po_number
    LEFT JOIN dsp_aggregates da ON poi.id = da.po_item_id
    LEFT JOIN rcv_aggregates ra ON poi.po_number = ra.po_number AND CAST(poi.po_item_no AS TEXT) = CAST(ra.po_item_no AS TEXT)
    WHERE {match_col_poi} IN ({placeholders})
    ORDER BY poi.po_number, poi.po_item_no
    """
    
    rows = db.execute(query, item_ids).fetchall()
    return [
        {
            **dict(row),
            "ordered_qty": float(row["ordered_qty"] or 0),
            "total_dispatched": float(row["total_dispatched"] or 0),
            "total_accepted": float(row["total_accepted"] or 0),
            "total_rejected": float(row["total_rejected"] or 0),
            "pending_qty": float(row["pending_qty"] or 0)
        }
        for row in rows
    ]


def get_dc_register(
    start: str, 
    end: str, 
    db: sqlite3.Connection,
    limit: int = 100,
    offset: int = 0,
    sort_by: str = "dc_date",
    order: str = "desc"
) -> tuple[list[dict], int]:
    """DC Register with Pagination"""
    sort_map = {
        "dc_date": "dc.dc_date",
        "dc_number": "dc.dc_number",
        "po_number": "dc.po_number",
        "consignee_name": "dc.consignee_name",
        "total_qty": "total_qty"
    }
    db_sort_col = sort_map.get(sort_by, "dc.dc_date")
    db_order = "DESC" if order.lower() == "desc" else "ASC"

    where_clause = "WHERE date(dc.dc_date) BETWEEN date(?) AND date(?)"
    params = [start, end]

    # Count query
    count_query = f"SELECT COUNT(DISTINCT dc_number) FROM delivery_challans dc {where_clause}"
    total_count = db.execute(count_query, params).fetchone()[0]

    query = f"""
    SELECT 
        dc.dc_number,
        dc.dc_date,
        dc.po_number,
        dc.consignee_name,
        COUNT(dci.id) as item_count,
        SUM(dci.dsp_qty) as total_qty
    FROM delivery_challans dc
    LEFT JOIN delivery_challan_items dci ON dc.dc_number = dci.dc_number
    {where_clause}
    GROUP BY dc.dc_number
    ORDER BY {db_sort_col} {db_order}
    LIMIT ? OFFSET ?
    """
    rows = db.execute(query, [*params, limit, offset]).fetchall()
    return [dict(row) for row in rows], total_count

def get_invoice_register(
    start: str, 
    end: str, 
    db: sqlite3.Connection,
    limit: int = 100,
    offset: int = 0,
    sort_by: str = "invoice_date",
    order: str = "desc"
) -> tuple[list[dict], int]:
    """Invoice Register with Pagination"""
    sort_map = {
        "invoice_date": "i.invoice_date",
        "invoice_number": "i.invoice_number",
        "po_number": "po_number",
        "dc_number": "i.dc_number",
        "total_amount": "i.total_invoice_value"
    }
    db_sort_col = sort_map.get(sort_by, "i.invoice_date")
    db_order = "DESC" if order.lower() == "desc" else "ASC"

    where_clause = "WHERE date(i.invoice_date) BETWEEN date(?) AND date(?)"
    params = [start, end]

    # Count query
    count_query = f"SELECT COUNT(*) FROM gst_invoices i {where_clause}"
    total_count = db.execute(count_query, params).fetchone()[0]

    query = f"""
    SELECT 
        i.invoice_number,
        i.invoice_date,
        i.po_numbers as po_number,
        i.dc_number,
        i.total_invoice_value as total_amount,
        i.taxable_value as taxable_amount,
        i.cgst + i.sgst + i.igst as total_tax
    FROM gst_invoices i
    {where_clause}
    ORDER BY {db_sort_col} {db_order}
    LIMIT ? OFFSET ?
    """
    rows = db.execute(query, [*params, limit, offset]).fetchall()
    return [dict(row) for row in rows], total_count

def get_po_register(start: str, end: str, db: sqlite3.Connection) -> list[dict]:
    """PO Register"""
    query = """
    SELECT 
        po.po_number,
        po.po_date,
        po.supplier_name,
        po.po_value,
        po.po_status,
        COUNT(poi.id) as items_count,
        SUM(poi.ord_qty) as total_qty
    FROM purchase_orders po
    LEFT JOIN purchase_order_items poi ON po.po_number = poi.po_number
    WHERE date(po.po_date) BETWEEN date(?) AND date(?)
    GROUP BY po.po_number
    ORDER BY po.po_date DESC
    """
    rows = db.execute(query, (start, end)).fetchall()
    return [dict(row) for row in rows]
