import contextlib
import sqlite3
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from backend.db.session import get_db
from backend.main import app

# -----------------------------------------------------------------------------
# FIXTURES
# -----------------------------------------------------------------------------

@pytest.fixture(scope="function")
def db_connection() -> Generator[sqlite3.Connection, None, None]:
    """
    Creates a fresh IN-MEMORY SQLite database for each test function.
    Fast, isolated, and safe.
    """
    # 1. Connect to memory
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    
    # 2. Optimized Settings (Simulate Production)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA foreign_keys = ON")
    
    # 3. Apply Schema (Bootstrap Manual)
    from backend.db.bootstrap import get_base_path
    
    base_path = get_base_path()
    schema_path = base_path / "migrations" / "v2_consolidated_schema.sql"
    seed_path = base_path / "migrations" / "v3_seed_data.sql"
    
    with open(schema_path, encoding="utf-8") as f:
        conn.executescript(f.read())
        
    if seed_path.exists():
        with open(seed_path, encoding="utf-8") as f:
            conn.executescript(f.read())

    # 4. Apply Runtime Error Migration (v6)
    error_migration = base_path / "migrations" / "v6_runtime_errors.sql"
    if error_migration.exists():
        with open(error_migration, encoding="utf-8") as f:
            conn.executescript(f.read())

    # 5. Apply Error Intelligence Upgrade (v8)
    intel_migration = base_path / "migrations" / "v8_error_intelligence_upgrade.sql"
    if intel_migration.exists():
        with open(intel_migration, encoding="utf-8") as f:
             # Handle potential duplicates if re-running (less likely in memory but good practice)
             with contextlib.suppress(sqlite3.OperationalError):
                 conn.executescript(f.read())
            
    conn.commit()

    yield conn
    
    # 4. Cleanup
    conn.close()

@pytest.fixture(scope="function")
def client(db_connection: sqlite3.Connection) -> Generator[TestClient, None, None]:
    """
    FastAPI Test Client with overridden DB dependency.
    """
    # Override the dependency to use our in-memory fixture
    def override_get_db():
        try:
            yield db_connection
        except Exception:
            db_connection.rollback()
            raise

    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as c:
        yield c
    
    # Clean up overrides
    app.dependency_overrides.clear()
