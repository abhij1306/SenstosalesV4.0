import datetime
import os
import socket
from typing import Any


class ContextProvider:
    """
    Standardizes the capture of execution context for the SenstoSales ERP.
    Ensures every event is attached to systemic and operational metadata.
    """
    
    VERSION = "7.0.0"
    
    @staticmethod
    def get_context(
        module: str, 
        user_id: str = "SYSTEM", 
        role: str = "SYSTEM", 
        session_id: str | None = None
    ) -> dict[str, Any]:
        """
        Returns a structured dictionary of execution context.
        """
        return {
            "version": ContextProvider.VERSION,
            "module": module,
            "user_id": user_id,
            "role": role,
            "session_id": session_id or "NONE",
            "environment": os.environ.get("APP_ENV", "PRODUCTION"),
            "host": socket.gethostname(),
            "platform": "windows",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "pid": os.getpid()
        }

    @staticmethod
    def get_source() -> str:
        """
        Detects if running as an EXE or API.
        """
        # Simple heuristic based on environment or path
        import sys
        if getattr(sys, 'frozen', False):
            return "EXE"
        return "API"
