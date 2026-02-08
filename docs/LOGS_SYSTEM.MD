# Unified Logging & Diagnostics Architecture

This document outlines the consolidated logging system for SenstoSales. The architecture has been unified into a single, high-performance, and fail-safe system.

## Overview

The logging system is built around `Diagnostics` (aliased as `LedgerLogger`), which serves as the single source of truth for all system events, document audit trails, and runtime error forensics.

### Core Principles
1. **Single Entry Point**: All logging and error capturing must go through `LedgerLogger`.
2. **Fail-Safe**: Logging operations are wrapped in try-except blocks to ensure that if logging fails, the business transaction does not.
3. **Structured Context**: Every log entry automatically captures module path, source version, and request context (where applicable).
4. **AI-Visible**: Logs are written to `logs/diagnostics.log` using a dedicated logger for AI observability.

## API surface (backend.core.intelligence)

### Posting Events
Standard business events like document creation, updates, and deletions.

```python
from backend.core.intelligence import LedgerLogger

LedgerLogger.record(
    db=db,
    event_class="PO_INGESTED",
    module_path="backend.services.po",
    entity_type="PURCHASE_ORDER",
    entity_id="PO12345",
    payload={"value": 50000.0},
    actor="SYSTEM",
    severity="INFO"
)
```

### Capturing Errors
Replacing standard `logger.exception` with structured error forensics.

```python
try:
    # Business Logic
except Exception as e:
    LedgerLogger.capture_error(
        db=db,
        error=e,
        severity=ErrorSeverity.HIGH,
        error_type=ErrorType.LOGIC,
        module="backend.services.dc",
        entity_id=dc_number
    )
```

### Specialized Record Helpers
Pre-configured methods for common patterns:
- `record_document_create(...)`
- `record_quantity_change(...)`
- `record_deviation(...)`
- `record_status_transition(...)`
- `justify(...)`: For recording evidence-based decisions (e.g., flagging deviations).
- `timer(...)`: Context manager for performance monitoring.

## Data Storage

Logs are persisted in the SQLite database across two main tables:
1. `instance_ledger`: Atomic event log for audit trails.
2. `runtime_errors`: Detailed forensics including stack traces and mapped human summaries.

## Forensic Mappings
The system includes `ERROR_RULES` which map common technical exceptions (e.g., `IntegrityError`) to human-readable summaries and suggested fixes, visible in the System Audit Ledger.
