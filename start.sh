#!/bin/bash
set -e

echo "Starting SenstoSales ERP Backend..."

# Create database if not exists
if [ ! -f "db/business.db" ]; then
    echo "Creating database..."
    cd backend
    python -c "from db.bootstrap import bootstrap_db; bootstrap_db()"
    cd ..
fi

# Run the backend
cd backend
exec python -m uvicorn main:app --host 0.0.0.0 --port $PORT
