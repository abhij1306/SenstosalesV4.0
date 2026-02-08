import decimal
from decimal import ROUND_HALF_UP, Decimal

from backend.core.constants import QUANTITY_TOLERANCE

"""
Number utility functions for Sales Manager
"""



def to_int(value: str | int | float | None) -> int | None:
    """
    Convert value to integer, handling None and string inputs

    Args:
        value: Value to convert (can be str, int, float, or None)

    Returns:
        Integer value or None if conversion fails
    """
    if value is None:
        return None

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        return int(value)

    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None

        # Remove common formatting characters
        value = value.replace(",", "").replace(" ", "")

        try:
            # Try converting to float first (handles decimals), then to int
            return int(float(value))
        except (ValueError, TypeError):
            return None

    return None


def to_float(value: str | int | float | None) -> float | None:
    """
    Convert value to float, handling None and string inputs

    Args:
        value: Value to convert (can be str, int, float, or None)

    Returns:
        Float value or None if conversion fails
    """
    if value is None:
        return None

    if isinstance(value, (int, float)):
        return float(value)

    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None

        # Remove common formatting characters
        value = value.replace(",", "").replace(" ", "")

        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    return None


def safe_to_float(value: str | int | float | None, default: float = 0.0, label: str = "numeric") -> float:
    """
    Convert to float with a default value and warning on failure.
    """
    val = to_float(value)
    if val is None:
        if value is not None and str(value).strip() != "":
            import logging
            logging.getLogger(__name__).warning(f"⚠️ Corrupt {label} value: '{value}'. Defaulting to {default}")
        return default
    return val


def safe_to_int(value: str | int | float | None, default: int = 0, label: str = "numeric") -> int:
    """
    Convert to int with a default value and warning on failure.
    """
    val = to_int(value)
    if val is None:
        if value is not None and str(value).strip() != "":
            import logging
            logging.getLogger(__name__).warning(f"⚠️ Corrupt {label} value: '{value}'. Defaulting to {default}")
        return default
    return val


def to_decimal(value: str | int | float | None, precision: int = 3) -> Decimal:
    """
    Convert value to Decimal with specific precision for accurate math.
    Returns Decimal("0") if conversion fails.
    """
    if value is None or str(value).strip() == "":
        return Decimal("0").quantize(Decimal(f"0.{'0' * precision}") if precision > 0 else Decimal("1"))
    
    try:
        # Convert via string for absolute precision
        s_val = str(value).replace(",", "").replace(" ", "")
        d = Decimal(s_val)
        if precision >= 0:
            target = Decimal(f"0.{'0' * precision}") if precision > 0 else Decimal("1")
            return d.quantize(target, rounding=ROUND_HALF_UP)
        return d
    except (ValueError, TypeError, decimal.InvalidOperation):
        return Decimal("0")


def to_qty(value: str | int | float | None) -> float | None:
    """
    Convert value to float rounded to 3 decimal places using Decimal math
    to avoid binary floating point errors (Ghost Balance).
    """
    if value is None:
        return None
    
    d = to_decimal(value, precision=3)
    return float(d)


# ============================================================
# TOLERANCE-BASED COMPARISONS (Per BUSINESS_LOGIC_SPEC)
# ============================================================

TOLERANCE = Decimal(str(QUANTITY_TOLERANCE))


def qty_equal(a: float, b: float) -> bool:
    """
    Check if two quantities are equal using Decimal math.
    Eliminates binary float drift issues in status calculations.
    """
    da = to_decimal(a, precision=3)
    db = to_decimal(b, precision=3)
    return da == db


def qty_gte(a: float, b: float) -> bool:
    """
    Check if quantity a >= b using Decimal math.
    """
    da = to_decimal(a, precision=3)
    db = to_decimal(b, precision=3)
    return da >= db


def qty_gt(a: float, b: float) -> bool:
    """
    Check if quantity a > b using Decimal math.
    """
    da = to_decimal(a, precision=3)
    db = to_decimal(b, precision=3)
    return da > db
