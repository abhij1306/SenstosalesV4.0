"""
Delivery Tracker API Routes
Provides endpoints for tracking deliveries by date ranges and viewing overdue alerts.
"""

import sqlite3
from typing import Any

from fastapi import APIRouter, Depends, Query

from backend.core.errors import internal_error
from backend.db.session import get_db
from backend.repositories.delivery_tracker_repository import DeliveryTrackerRepository

router = APIRouter()


@router.get("/alerts")
def get_delivery_alerts(db: sqlite3.Connection = Depends(get_db)) -> dict[str, Any]:
    """Get alert counts for top-bar badge."""
    try:
        repo = DeliveryTrackerRepository(db)
        return repo.get_alert_counts()
    except Exception as e:
        raise internal_error(str(e), e)


@router.get("/stats")
def get_tracker_stats(
    due_date_from: str | None = Query(None),
    due_date_to: str | None = Query(None),
    entry_date_from: str | None = Query(None),
    entry_date_to: str | None = Query(None),
    status: str = Query("all"),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    """Get KPIs for the tracker page."""
    try:
        repo = DeliveryTrackerRepository(db)
        return repo.get_tracker_stats(
            due_date_from=due_date_from,
            due_date_to=due_date_to,
            entry_date_from=entry_date_from,
            entry_date_to=entry_date_to,
            status=status,
        )
    except Exception as e:
        raise internal_error(str(e), e)


@router.get("/")
def list_deliveries(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("dely_date"),
    order: str = Query("ASC"),
    due_date_from: str | None = Query(None),
    due_date_to: str | None = Query(None),
    entry_date_from: str | None = Query(None),
    entry_date_to: str | None = Query(None),
    value_min: float | None = Query(None),
    value_max: float | None = Query(None),
    status: str = Query("all"),
    search: str | None = Query(None),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    """List deliveries with filters and pagination."""
    try:
        repo = DeliveryTrackerRepository(db)
        offset = (page - 1) * limit
        
        items = repo.list_deliveries(
            limit=limit,
            offset=offset,
            sort_by=sort,
            order=order,
            due_date_from=due_date_from,
            due_date_to=due_date_to,
            entry_date_from=entry_date_from,
            entry_date_to=entry_date_to,
            value_min=value_min,
            value_max=value_max,
            status=status,
            search=search,
        )
        
        total_count = repo.count_deliveries(
            due_date_from=due_date_from,
            due_date_to=due_date_to,
            entry_date_from=entry_date_from,
            entry_date_to=entry_date_to,
            value_min=value_min,
            value_max=value_max,
            status=status,
            search=search,
        )
        
        stats = repo.get_tracker_stats(
            due_date_from=due_date_from,
            due_date_to=due_date_to,
            entry_date_from=entry_date_from,
            entry_date_to=entry_date_to,
            status=status,
        )
        
        return {
            "items": items,
            "metadata": {
                **stats,
                "total_count": total_count,
                "page": page,
                "limit": limit,
            },
        }
    except Exception as e:
        raise internal_error(str(e), e)
