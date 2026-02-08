#!/bin/bash
set -e

echo "Starting SenstoSales ERP Backend..."

# Create database if not exists
if [ ! -f "db/business.db" ]; then
    echo "Creating database..."
    cd backend
    python3 -c "from db.bootstrap import bootstrap_db; bootstrap_db()"
    cd ..
fi

# Run the backend
cd backend
exec python3 -m uvicorn main:app --host 0.0.0.0 --port $PORT
