# Backend Architecture

**Version:** 5.0 (Hardened)  
**Last Updated:** 2026-01-24

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI + Python 3.11+ |
| Database | SQLite (WAL mode, FK enforced, 30s Busy Timeout) |
| Frontend | Next.js 16 + TypeScript |

---

## Directory Structure

```
backend/
├── api/                # HTTP Routers (no business logic)
│   ├── po.py          # PO list, detail, upload
│   ├── dc.py          # DC CRUD
│   ├── invoice.py     # Invoice CRUD
│   ├── srv.py         # SRV upload
│   ├── reports.py     # Excel exports
│   ├── settings.py    # System settings
│   ├── bhel_ingest.py # PO/SRV HTML Parser
│   ├── dashboard.py   # Analytics & KPI aggregation
│   ├── deviations.py  # Quality Control deviations
│   ├── search.py      # Global Search
│   ├── health.py      # System Health & Connectivity
│   ├── system.py      # OS-level operations
│   ├── buyers.py      # Buyer management
│   └── common.py      # Shared UI utilities
│
├── services/          # Business Logic (HTTP-agnostic)
│   ├── po_service.py           # PO queries
│   ├── dc.py                   # DC creation with guardrails
│   ├── invoice.py              # Invoice creation
│   ├── srv_ingestion_optimized.py  # SRV parsing
│   ├── reconciliation_v2.py    # Quantity sync
│   └── status_service.py       # Status calculation
│
├── core/              # Shared Utilities
│   ├── config.py      # DATABASE_PATH (canonical)
│   └── number_utils.py # Quantity parsing
│
└── db/                # Database Layer
    ├── session.py     # Connection management
    └── models.py      # Pydantic models
```

---

## Key Rules

### 1. Routers Never Contain Logic
```python
# ✅ CORRECT
@router.post("/dc")
def create_dc(data, db = Depends(get_db)):
    return DCService.create_dc(db, data)

# ❌ WRONG
@router.post("/dc")
def create_dc(data, db = Depends(get_db)):
    total = sum(item.qty for item in data.items)  # NO!
```

### 2. Database Path
Always use `from backend.core.config import DATABASE_PATH`. Never hardcode paths.

### 3. Transactions
Use `BEGIN IMMEDIATE` for DC/Invoice creation to prevent race conditions.

---

**Data Reconciliation (Reactive):**
Logic is centralized in `backend/services/reconciliation_v2.py`.
- `DC Service` → `sync_po()` (Updates `dsp_qty`)
- `SRV Service` → `sync_po()` (Updates `rcd_qty`)

**Observability:**
Every sync event is tracked in `system_reconciliation_logs` for auditability.

---

## Status Logic

See [status_service.py](../backend/services/status_service.py):

| Status | Condition |
|--------|-----------|
| Pending | dispatch < ordered |
| Delivered | dispatch ≥ ordered (Decimal exact) |

Tolerance: 0.001 for float comparison.

---

## Performance

Indexes applied via `migrations/add_performance_indexes.sql`:
- `idx_po` on `purchase_orders(po_number)`
- `idx_poi` on `purchase_order_items(po_number, po_item_no)`
- `idx_dc_item` on `delivery_challan_items(po_item_id)`
- `idx_srv` on `srv_items(po_number, po_item_no)`
## Data Persistence & EXE Portability

The system uses a **Frozen-Aware Configuration** (`backend/core/config.py`) to handle persistence across development and distribution:

1. **Development Mode**: Database lives in `/db/business.db` within the project root.
2. **Production (EXE)**: On first boot, the system extracts a seed database from the internal bundle (`sys._MEIPASS`) to a folder `db/` created adjacent to the `.exe` file. This ensures user data persists across application updates.

---

## Module Topology (Live Inventory)

The following inventory reflects the real-time operational status of the backend logic.

### API Layer (Entry Points)
- **bhel_ingest**: Ingestion flow control and HTML parsing.
- **buyers**: Master data management for buyers.
- **dc**: Delivery Challan lifecycle (Creation, Listing, Detail).
- **invoice**: GST Invoice management (Creation, Preview, Export).
- **po**: Purchase Order orchestration and HTML upload.
- **reports**: Automated Excel register generation.
- **srv**: Batch SRV processing.
- **intelligence**: System Log and Forensic diagnostics.

### Service Layer (Business Logic)
- **analytics_service**: High-level supply health and lead-time KPIs.
- **dc**: Validation guardrails and link management.
- **reconciliation_v2**: Quantity sync across PO/DC/SRV.
- **srv_ingestion_optimized**: Rapid processing for bulk SRV uploads.
- **status_service**: Canonical source for "Pending" vs "Delivered" logic.
- **tax_service**: GST computation and invoice re-averaging.
- **validation_service**: Global integrity checks for cross-entity links.
