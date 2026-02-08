"""
Centralized Status Logic Service
Enforces global status invariants across PO, DC, and Invoice modules.
"""


from backend.core.number_utils import qty_gte


def calculate_entity_status(total_ordered: float, total_dispatched: float, total_received: float) -> str:
    """
    Calculate entity status based on standardized quantity checks.
    Uses Decimal-safe comparisons to prevent 'Ghost Balance' issues.

    Rules:
    1. Delivered: Physically Shipped (All items dispatched).
    2. Pending: Not complete (Zero or partial dispatch).
    """
    # 10.005 - 3.335 - 3.335 - 3.335 = 0.000 (Exactly, via Decimal)
    if qty_gte(total_dispatched, total_ordered):
        return "Delivered"

    # Any other state is Pending
    return "Pending"


def translate_raw_status(raw_status: str) -> str:
    """Maps numeric ERP codes to human readable strings."""
    s = str(raw_status or "").strip()
    if s == "0":
        return "Open"
    if s == "2":
        return "Closed"
    return s or "Pending"


def calculate_pending_quantity(ordered: float, fulfilled: float) -> float:
    """
    Calculate Pending Quantity (Balance).

    Invariant: Balance = Ordered - Fulfilled
    - At PO level, 'Fulfilled' is typically Total Dispatched.
    - At Invoice/DC level, 'Fulfilled' could be Total Received.
    """
    from backend.core.number_utils import to_qty

    ordered_val = float(ordered or 0)
    fulfilled_val = float(fulfilled or 0)
    return to_qty(max(0.0, ordered_val - fulfilled_val))
