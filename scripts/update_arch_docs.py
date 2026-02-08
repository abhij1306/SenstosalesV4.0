import os
import sqlite3
import datetime
import sys

# Add root to path
sys.path.append(os.getcwd())

def update_arch_docs():
    """
    Scans the system to generate living architecture documentation.
    Ensures that documentation remains in sync with the codebase.
    """
    docs_dir = "docs"
    os.makedirs(docs_dir, exist_ok=True)
    
    # 1. API Index Generation
    from backend.main import app
    api_lines = ["# API Operational Index\n\n", f"Generated on: {datetime.datetime.now().isoformat()}\n\n"]
    api_lines.append("| Method | Path | Summary | Tags |\n| --- | --- | --- | --- |\n")
    
    for route in app.routes:
        if hasattr(route, "methods"):
            summary = getattr(route, "summary", "No summary")
            tags = ", ".join(getattr(route, "tags", []))
            api_lines.append(f"| {list(route.methods)[0]} | `{route.path}` | {summary} | {tags} |\n")
            
    with open(os.path.join(docs_dir, "API_INDEX.md"), "w") as f:
        f.writelines(api_lines)
        
    # 2. Data Lineage (Tables and Indices)
    db_path = "db/business.db"
    if os.path.exists(db_path):
        db = sqlite3.connect(db_path)
        try:
            lineage_lines = ["# System Data Lineage\n\n", "Automated scan of active database entities.\n\n"]
            tables = db.execute("SELECT name, sql FROM sqlite_master WHERE type='table'").fetchall()
            for table_name, sql in tables:
                lineage_lines.append(f"## Table: `{table_name}`\n")
                lineage_lines.append(f"```sql\n{sql}\n```\n\n")
                
            with open(os.path.join(docs_dir, "DATA_LINEAGE.md"), "w") as f:
                f.writelines(lineage_lines)
        finally:
            db.close()

    print("Successfully updated architecture docs (API_INDEX.md, DATA_LINEAGE.md)")

if __name__ == "__main__":
    update_arch_docs()
