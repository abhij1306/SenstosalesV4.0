# Backend Tests

Test suite for SenstoSales backend services and APIs.

## Setup

### Install Dependencies

```bash
cd backend
pip install -r requirements.txt
pip install pytest pytest-cov  # Add testing dependencies
```

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=html

# Run specific test file
pytest tests/test_status_service.py

# Run specific test
pytest tests/test_status_service.py::TestCalculateEntityStatus::test_pending_status_no_dispatch

# Run with verbose output
pytest -v
```

## Test Structure

```
tests/
├── __init__.py
├── conftest.py          # Pytest fixtures and configuration
├── test_status_service.py
├── test_validation_service.py  # TODO
├── test_dc_service.py          # DC creation and validation tests
├── test_invoice_service.py     # Invoice creation and tax calculation tests
└── integration/                # Integration tests
    └── test_po_flow.py         # PO → DC → Invoice flow tests
```

## Test Categories

- **Unit Tests**: Fast, isolated tests for individual functions
- **Integration Tests**: Tests that require database or external dependencies
- **Critical Path Tests**: Tests for core business logic

## Writing Tests

### Example Unit Test

```python
def test_calculate_status():
    from backend.services.status_service import calculate_entity_status
    
    status = calculate_entity_status(
        total_ordered=100.0,
        total_dispatched=50.0,
        total_received=0.0,
    )
    assert status == "Pending"
```

### Using Fixtures

```python
def test_with_database(test_db):
    # test_db is an in-memory SQLite connection
    test_db.execute("INSERT INTO purchase_orders ...")
    # ... test code
```

## Coverage Goals

- **Current**: 0% (just starting)
- **Phase 1 Goal**: 50% coverage on critical paths
- **Phase 2 Goal**: 70% coverage on all services
- **Target**: 80%+ coverage on business logic

## Critical Paths to Test

1. **Status Calculation** ✅ (test_status_service.py)
2. **DC Creation** (test_dc_service.py) - Tests for DC validation and creation
3. **Invoice Creation** (test_invoice_service.py) - Tests for invoice and tax calculations
4. **PO Ingestion** - To be implemented
5. **Validation Logic** (test_validation_service.py) - Tests for business rule validation
6. **PO → DC → Invoice Flow** (integration/test_po_flow.py) - End-to-end flow tests

## Notes

- Tests use in-memory SQLite database by default
- Use fixtures for database setup
- Keep tests fast and isolated
- Mock external dependencies when possible
