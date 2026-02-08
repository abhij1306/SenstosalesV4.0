#!/bin/bash
set -e

echo "Starting SenstoSales ERP Backend..."

# Change to project root
cd /app

# Create database if not exists
if [ ! -f "db/business.db" ]; then
    echo "Creating database..."
    python3 -c "from db.bootstrap import bootstrap_db; bootstrap_db()"
fi

# Run the backend from project root
exec python3 -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT
