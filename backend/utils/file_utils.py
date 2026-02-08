"""
File Utility Functions
Common file handling operations for the application.
"""

import sqlite3


def get_save_path(
    db: sqlite3.Connection,
    key: str,
    table: str = "user_download_prefs"
) -> str | None:
    """
    Get the save path for file downloads from user preferences.
    
    Args:
        db: Database connection
        key: Column name for the save path
        table: Table name (default: user_download_prefs)
    
    Returns:
        Save path string or None if not found
    """
    try:
        from backend.api.reports import get_save_path
        return get_save_path(db, key)
    except Exception:
        row = db.execute(f"SELECT {key} FROM {table} ORDER BY id DESC LIMIT 1").fetchone()
        if row and row[key]:
            return row[key]
    return None


def ensure_directory(path: str) -> None:
    """
    Ensure the directory exists, creating it if necessary.
    
    Args:
        path: Directory path to ensure exists
    """
    import os
    os.makedirs(path, exist_ok=True)
