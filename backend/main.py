"""
FastAPI Main Application
Production Configuration
"""

import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import Routers
from backend.api import (
    analytics,
    buyers,
    common,
    dashboard,
    dc,
    delivery_tracker,
    deviations,
    health,
    intelligence,
    invoice,
    po,
    reports,
    search,
    settings,
    srv,
    system,
)
from backend.core.intelligence import ErrorSeverity, ErrorType, EventClass, LedgerLogger
from backend.db.session import get_connection

# Standardized app identification
CURRENT_VERSION = "2.5.0"

# Allowed CORS origins (configure for production)
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events."""
    # Startup
    logging.info(f"SenstoSales ERP v{CURRENT_VERSION} starting up...")
    
    db = None
    try:
        db = get_connection()
        db.execute("SELECT 1")
        LedgerLogger.record(
            db,
            event_class=EventClass.SYSTEM_BOOT,
            module_path="backend.main",
            entity_type="SYSTEM",
            entity_id="STARTUP",
            payload={"version": CURRENT_VERSION},
            actor="SYSTEM"
        )
    except Exception as e:
        logging.error(f"Startup DB check failed: {e}")
    finally:
        if db:
            db.close()
    
    yield  # Application runs here
    
    # Shutdown (if needed)
    logging.info(f"SenstoSales ERP v{CURRENT_VERSION} shutting down...")


app = FastAPI(
    title="SenstoSales ERP",
    description="Unified Manufacturing & Logistics Intelligence",
    version=CURRENT_VERSION,
    lifespan=lifespan
)

# CORS Configuration - Restricted origins for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(po.router, prefix="/api/po", tags=["Purchase Orders"])
app.include_router(dc.router, prefix="/api/dc", tags=["Delivery Challans"])
app.include_router(srv.router, prefix="/api/srv", tags=["Service Reports"])
app.include_router(invoice.router, prefix="/api/invoice", tags=["Invoices"])
app.include_router(buyers.router, prefix="/api/buyers", tags=["Buyers"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(delivery_tracker.router, prefix="/api/delivery-tracker", tags=["Delivery Tracker"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(common.router, prefix="/api/common", tags=["Common"])
app.include_router(deviations.router, prefix="/api/deviations", tags=["Deviations"])
app.include_router(health.router, prefix="/api/health", tags=["Health"])
app.include_router(system.router, prefix="/api/system", tags=["System Control"])
app.include_router(settings.router, prefix="/api/settings", tags=["Configuration"])
app.include_router(intelligence.router, prefix="/api/intelligence", tags=["Intelligence"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])



@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Final safety net for all unhandled exceptions.
    Logs to both standard logging and safe Diagnostics ledger.
    """
    tb = traceback.format_exc()
    logging.error(f"Global Exception: {exc!s}\n{tb}")

    # Fail-safe recording to Diagnostics
    db = None
    try:
        db = get_connection()
        LedgerLogger.capture_error(
            db=db,
            error=exc,
            severity=ErrorSeverity.CRITICAL,
            error_type=ErrorType.RUNTIME,
            module="backend.main",
            context={"url": str(request.url), "method": request.method}
        )
    except Exception as e:
        logging.error(f"Double fault: Failed to log global exception to Diagnostics: {e}")
    finally:
        if db:
            db.close()

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "message": str(exc),
            "type": type(exc).__name__
        },
    )


@app.get("/health_check")
def basic_health():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "version": CURRENT_VERSION,
        "diagnostics": "unified"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)