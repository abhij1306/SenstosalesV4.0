import logging
import sqlite3
import sys
from pathlib import Path

# Add project root to sys.path for imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.core.config import settings  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use settings for portable path
db_path = Path(settings.DATABASE_URL.replace("sqlite:///", ""))

def fix_db():
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    try:
        # Check if purchase_orders table exists
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='purchase_orders'")
        if not cursor.fetchone():
            print("Table purchase_orders does not exist yet. It will be created during first run.")
            return

        # Check if our_ref column exists
        cursor = conn.execute("PRAGMA table_info(purchase_orders)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "our_ref" not in columns:
            print("Adding our_ref column to purchase_orders...")
            conn.execute("ALTER TABLE purchase_orders ADD COLUMN our_ref TEXT")
            conn.commit()
            print("Column added successfully.")
        else:
            print("Column our_ref already exists.")
            
    except Exception as e:
        print(f"Error fixing database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_db()
