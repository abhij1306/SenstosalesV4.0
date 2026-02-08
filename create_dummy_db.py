#!/usr/bin/env python3
"""
Create a SQLite database with the full schema.
Uses the actual migration files for correctness.
"""
import sqlite3
import os
from pathlib import Path

DB_PATH = 'db/business.db'
PROJECT_ROOT = Path(__file__).parent
MIGRATIONS_DIR = PROJECT_ROOT / "migrations"


def run_migration(db: sqlite3.Connection, migration_file: Path):
    """Run a single SQL migration file."""
    if not migration_file.exists():
        print(f"Warning: Migration not found: {migration_file}")
        return
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql = f.read()
    db.executescript(sql)
    print(f"Applied: {migration_file.name}")


def create_db():
    """Create database with full schema."""
    # Remove old database
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"Removed old: {DB_PATH}")

    # Ensure db directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA foreign_keys = ON")

    print("Creating database schema...")

    # Run schema and seed data
    run_migration(conn, MIGRATIONS_DIR / "v2_consolidated_schema.sql")
    run_migration(conn, MIGRATIONS_DIR / "v3_seed_data.sql")

    # Verify tables
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cursor.fetchall()]
    print(f"[OK] Tables created: {len(tables)}")

    conn.close()
    print(f"[OK] Database created: {DB_PATH}")
    print("[OK] Run 'python -m uvicorn backend.main:app' to start the backend")


if __name__ == '__main__':
    create_db()
