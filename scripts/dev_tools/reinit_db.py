
import os
import sqlite3
import sys

# Add current dir to path to find backend module
sys.path.append(os.getcwd())
from backend.core.config import DATABASE_PATH

DB_PATH = str(DATABASE_PATH)
SCHEMA_PATH = "migrations/v2_consolidated_schema.sql"

def init_db():
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
            print(f"🗑️ Deleted existing database: {DB_PATH}")
        except PermissionError:
            print(f"❌ Error: Cannot delete {DB_PATH}. Is it open in another program?")
            sys.exit(1)

    print(f"🛠️ Initializing new database at {DB_PATH} ...")
    
    # Ensure db directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema_script = f.read()
        
        cursor.executescript(schema_script)
        print("✅ Schema applied successfully.")
        
        # Apply Default Settings Seed
        seed_path = "migrations/v3_seed_data.sql"
        if os.path.exists(seed_path):
            with open(seed_path, "r", encoding="utf-8") as f:
                seed_script = f.read()
            cursor.executescript(seed_script)
            print("✅ Default settings seeded successfully.")
        else:
            print(f"⚠️ Warning: Seed script {seed_path} not found.")

        conn.commit()
        
        # Verify tables
        tables = [
            "purchase_orders", "purchase_order_items", "purchase_order_deliveries",
            "delivery_challans", "delivery_challan_items",
            "gst_invoices", "gst_invoice_items",
            "srvs", "srv_items",
            "settings", "buyers", "deviations"
        ]
        found = 0
        for t in tables:
            cur = cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{t}'")
            if cur.fetchone():
                found += 1
        
        if found == len(tables):
            print("✅ Database verification passed: All core tables created.")
        else:
            print(f"⚠️ Warning: Only found {found}/{len(tables)} expected tables.")

    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
