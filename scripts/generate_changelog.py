import sqlite3
import json
import datetime
import os

def generate_changelog(db_path: str = "db/business.db", output_path: str = "CHANGELOG.md"):
    """
    Derives a structured CHANGELOG.md from the instance_ledger events.
    """
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    
    try:
        # Fetch events grouped by version
        rows = db.execute("""
            SELECT 
                source_version, 
                event_class, 
                entity_type, 
                json_extract(payload_json, '$.decision') as decision,
                json_extract(payload_json, '$.error_msg') as error,
                created_at 
            FROM instance_ledger 
            WHERE source_version IS NOT NULL
            ORDER BY source_version DESC, created_at DESC
        """).fetchall()

        if not rows:
            print("No versioned events found in ledger.")
            return

        changelog = ["# Project Changelog\n\n", "Automated forensic journal of system evolutions.\n\n"]
        
        current_version = None
        for row in rows:
            version = row['source_version']
            if version != current_version:
                current_version = version
                changelog.append(f"## Version {version} ({datetime.date.today().isoformat()})\n")
            
            e_class = row['event_class']
            e_type = row['entity_type']
            timestamp = row['created_at']
            
            if e_class == 'AGENT_DECISION':
                changelog.append(f"- **[Nexus Intelligence]**: {row['decision']} ({e_type})\n")
            elif e_class == 'SYSTEM_ERROR':
                changelog.append(f"- **[Security/Risk]**: Resolved regression: {row['error'][:60]}...\n")
            elif e_class in ['DC_CREATED', 'INVOICE_GENERATED', 'SRV_BATCH_INGESTED']:
                changelog.append(f"- **[Core Flow]**: Successfully processed {e_type} events at {timestamp}\n")
            elif e_class == 'DOC_DELETED':
                changelog.append(f"- **[Forensics]**: Audited deletion of {e_type} record.\n")

        with open(output_path, "w") as f:
            f.writelines(changelog)
            
        print(f"Successfully generated {output_path}")

    finally:
        db.close()

if __name__ == "__main__":
    generate_changelog()
