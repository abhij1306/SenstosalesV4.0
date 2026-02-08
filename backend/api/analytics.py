"""
Procurement Intelligence & Analytics API Routes
Provides insights for spend optimization, quality tracking, and procurement risk analysis.
"""

import sqlite3
from typing import Any

from fastapi import APIRouter, Depends, Query

from backend.core.errors import internal_error
from backend.db.session import get_db
from backend.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/procurement")
def get_procurement_analytics(
    date_from: str | None = Query(None, description="Filter by PO date (from)"),
    date_to: str | None = Query(None, description="Filter by PO date (to)"),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    """
    Category Value Intelligence (Pareto Analysis)
    Groups materials by mtrl_cat and calculates total procurement value.
    Uses AnalyticsService for data consistency.
    """
    try:
        # Use AnalyticsService for procurement stats with date filtering
        stats = AnalyticsService.get_procurement_stats(db, start_date=date_from)

        # Calculate cumulative percentage for Pareto analysis
        total_value = sum(s["total_value"] for s in stats)
        cumulative = 0

        results = []
        for stat in stats:
            cumulative += stat["total_value"]
            results.append({
                **stat,
                "cumulative_value": cumulative,
                "cumulative_pct": round((cumulative / total_value * 100) if total_value > 0 else 0, 1)
            })

        return {
            "categories": results,
            "metadata": {
                "total_value": total_value,
                "total_categories": len(results),
                "pareto_80_pct": 0.8 * total_value if total_value > 0 else 0,
                "filters": {"date_from": date_from, "date_to": date_to}
            }
        }
    except Exception as e:
        raise internal_error(str(e), e)


@router.get("/quality")
def get_quality_analytics(
    date_from: str | None = Query(None, description="Filter by PO date (from)"),
    date_to: str | None = Query(None, description="Filter by PO date (to)"),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    """
    Quality & Rejection Risk Tracker
    Tracks rejection rates by category and identifies high-risk items.
    Uses AnalyticsService for data consistency.
    """
    try:
        # Use AnalyticsService for quality stats with date filtering
        categories = AnalyticsService.get_quality_stats(db, start_date=date_from)
        
        # High-risk categories (rejection rate > 5%)
        high_risk = [c for c in categories if c["rejection_rate"] > 5]
        
        # Top rejected material descriptions (additional query for detailed materials)
        material_query = """
            SELECT 
                poi.material_code,
                poi.material_description,
                poi.mtrl_cat,
                SUM(poi.rej_qty) as total_rejected,
                SUM(poi.rej_qty * poi.po_rate) as rejected_value,
                CASE 
                    WHEN SUM(poi.ord_qty) > 0 
                    THEN ROUND((SUM(poi.rej_qty) / SUM(poi.ord_qty) * 100), 2)
                    ELSE 0 
                END as rejection_rate
            FROM purchase_order_items poi
            WHERE poi.rej_qty > 0
            GROUP BY poi.id
            ORDER BY total_rejected DESC
            LIMIT 20
        """
        top_rejected = db.execute(material_query).fetchall()
        
        return {
            "categories": categories,
            "high_risk_categories": high_risk,
            "top_rejected_materials": [dict(r) for r in top_rejected],
            "metadata": {
                "total_rejected_value": sum(c["total_rej"] * 100 for c in categories),  # Approximate
                "avg_rejection_rate": sum(c["rejection_rate"] for c in categories) / len(categories) if categories else 0,
                "critical_categories_count": len(high_risk)
            }
        }
    except Exception as e:
        raise internal_error(str(e), e)


@router.get("/forecast")
def get_procurement_forecast(
    days: int = Query(30, ge=1, le=365),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, Any]:
    """
    Integrated Procurement Forecast
    Shows upcoming category load and stock-out risks.
    """
    try:
        # Category load in next N days
        forecast_query = f"""
            SELECT 
                poi.mtrl_cat,
                COUNT(DISTINCT pod.id) as delivery_count,
                SUM(pod.ord_qty) as total_due_qty,
                SUM(pod.ord_qty * poi.po_rate) as total_due_value,
                MIN(pod.dely_date) as first_delivery_date,
                MAX(pod.dely_date) as last_delivery_date
            FROM purchase_order_deliveries pod
            JOIN purchase_order_items poi ON pod.po_item_id = poi.id
            WHERE pod.dely_date IS NOT NULL
              AND date(pod.dely_date) >= date('now')
              AND date(pod.dely_date) <= date('now', '+{days} days')
              AND (COALESCE(pod.rcd_qty, 0) < pod.ord_qty OR COALESCE(pod.dsp_qty, 0) < pod.ord_qty)
            GROUP BY poi.mtrl_cat
            ORDER BY total_due_value DESC
        """
        forecast = db.execute(forecast_query).fetchall()
        
        # High-value items with no recent deliveries (> 30 days overdue)
        stockout_query = """
            SELECT 
                poi.material_code,
                poi.material_description,
                poi.mtrl_cat,
                poi.po_number,
                SUM(pod.ord_qty) as total_ordered,
                SUM(pod.rcd_qty) as total_received,
                MAX(pod.dely_date) as last_due_date,
                (SELECT MAX(dely_date) FROM purchase_order_deliveries WHERE po_item_id = poi.id) as latest_dely_date
            FROM purchase_order_items poi
            JOIN purchase_order_deliveries pod ON poi.id = pod.po_item_id
            WHERE pod.dely_date < date('now', '-30 days')
              AND pod.rcd_qty < pod.ord_qty
            GROUP BY poi.id
            ORDER BY total_ordered DESC
            LIMIT 20
        """
        stockout_risks = db.execute(stockout_query).fetchall()
        
        return {
            "forecast": [dict(r) for r in forecast],
            "stockout_risks": [dict(r) for r in stockout_risks],
            "metadata": {
                "forecast_days": days,
                "total_upcoming_value": sum(r[4] for r in forecast),
                "at_risk_items_count": len(stockout_risks)
            }
        }
    except Exception as e:
        raise internal_error(str(e), e)
