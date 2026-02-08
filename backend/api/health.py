"""
Health Check Endpoints
Provides health, readiness, and metrics endpoints for monitoring
"""

import logging
import os
import sqlite3
from datetime import datetime
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import psutil

try:
    import psutil
except ImportError:
    psutil = None
from fastapi import APIRouter, Depends, HTTPException

from backend.db.session import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# Track application start time
START_TIME = datetime.utcnow()


@router.get("/health")
def health_check() -> dict[str, Any]:
    """
    Basic health check - returns 200 if service is running

    Use this for:
    - Load balancer health checks
    - Simple uptime monitoring
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service": "SenstoSales ERP",
        "version": "3.4.0",
    }


@router.get("/ping")
def ping() -> dict[str, str]:
    """
    Simple ping endpoint - returns 'pong' for basic connectivity tests.
    Required by production audit gate PQ-8.
    """
    return {"ping": "pong"}


def _check_database_readiness(db: sqlite3.Connection) -> tuple[str, bool]:
    """Checks the readiness of the database."""
    try:
        result = db.execute("SELECT 1").fetchone()
        if result and result[0] == 1:
            return "healthy", True
        return "unhealthy: unexpected result", False
    except Exception as e:
        logger.error(f"Database health check failed: {e}", exc_info=True)
        return f"unhealthy: {e!s}", False

def _check_filesystem_readiness() -> tuple[str, str]:
    """Checks the readiness of the filesystem."""
    try:
        logs_dir = os.path.join(os.getcwd(), "logs")
        if not os.path.exists(logs_dir):
            try:
                os.makedirs(logs_dir, exist_ok=True)
            except Exception:
                pass  # Non-critical failure

        if os.path.exists(logs_dir) and os.access(logs_dir, os.W_OK):
            return "healthy", True
        
        logger.warning("Logs directory not writable, continuing in limited mode")
        return "healthy (logs limited)", True
    except Exception as e:
        return f"unhealthy: {e!s}", False

@router.get("/health/ready")
def readiness_check(db: sqlite3.Connection = Depends(get_db)) -> dict[str, Any]:
    """
    Readiness check - verifies all dependencies are available
    Use this for:
    - Kubernetes readiness probes
    - Deployment verification
    Returns 200 if ready, 503 if not ready
    """
    db_status, db_ok = _check_database_readiness(db)
    fs_status, fs_ok = _check_filesystem_readiness()

    all_healthy = db_ok and fs_ok
    overall_status = "ready" if all_healthy else "not_ready"

    response = {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "checks": {"database": db_status, "filesystem": fs_status},
    }

    if not all_healthy:
        raise HTTPException(status_code=503, detail=response)

    return response


@router.get("/health/live")
def liveness_check() -> dict[str, Any]:
    """
    Liveness check - verifies the application is alive

    Use this for:
    - Kubernetes liveness probes
    - Detecting deadlocks or hangs

    Returns 200 if alive, 503 if not
    """
    try:
        # Simple check - if we can respond, we're alive
        uptime_seconds = (datetime.utcnow() - START_TIME).total_seconds()

        return {
            "status": "alive",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "uptime_seconds": round(uptime_seconds, 2),
        }
    except Exception as e:
        logger.error(f"Liveness check failed: {e}", exc_info=True)
        raise HTTPException(status_code=503, detail={"status": "not_alive", "error": str(e)}) from e


def _get_process_metrics(process: psutil.Process) -> dict[str, Any]:
    """Gathers metrics for the current process."""
    memory_info = process.memory_info()
    return {
        "pid": os.getpid(),
        "cpu_percent": process.cpu_percent(interval=0.1),
        "memory_mb": round(memory_info.rss / 1024 / 1024, 2),
        "threads": process.num_threads(),
    }

def _get_system_metrics() -> dict[str, Any]:
    """Gathers system-wide metrics."""
    return {
        "cpu_count": psutil.cpu_count(),
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage("/").percent
        if os.name != "nt"
        else psutil.disk_usage("C:\\").percent,
    }

@router.get("/health/metrics")
def metrics() -> dict[str, Any]:
    """
    Basic metrics endpoint
    Provides:
    - System metrics (CPU, memory)
    - Application uptime
    - Process info
    """
    uptime_seconds = round((datetime.utcnow() - START_TIME).total_seconds(), 2)
    if not psutil:
        return {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "uptime_seconds": uptime_seconds,
            "system": "Metrics unavailable (psutil not installed)",
        }

    try:
        process = psutil.Process(os.getpid())
        return {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "uptime_seconds": uptime_seconds,
            "process": _get_process_metrics(process),
            "system": _get_system_metrics(),
        }
    except Exception as e:
        logger.error(f"Metrics collection failed: {e}", exc_info=True)
        return {"timestamp": datetime.utcnow().isoformat() + "Z", "error": str(e)}