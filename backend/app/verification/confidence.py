import math
from typing import Any, Optional

from app.core.config import settings


def _clean_float(val: Any, default: float = 0.0) -> float:
    """Safely convert any value to float, replacing NaN and Inf with default."""
    try:
        f = float(val)
        return default if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return default


def calculate_confidence(
    nli_confidence: float,
    retrieval_relevance: float = 0.0,
    source_reliability: float = 1.0,
    w_nli: Optional[float] = None,
    w_retrieval: Optional[float] = None,
    w_source: Optional[float] = None,
) -> float:
    """Calculate combined verification confidence.

    Formula:
        confidence = w_nli * nli_confidence + w_retrieval * retrieval_relevance + w_source * source_reliability

    Weights are configurable via parameters or settings.
    Result is strictly clamped between 0.0 and 1.0 and will never return NaN.
    """
    safe_nli = max(0.0, min(1.0, _clean_float(nli_confidence, 0.5)))
    safe_ret = max(0.0, min(1.0, _clean_float(retrieval_relevance, 0.0)))
    safe_src = max(0.0, min(1.0, _clean_float(source_reliability, 1.0)))

    weight_nli = max(0.0, _clean_float(w_nli if w_nli is not None else settings.WEIGHT_NLI, 0.5))
    weight_retrieval = max(0.0, _clean_float(w_retrieval if w_retrieval is not None else settings.WEIGHT_RETRIEVAL, 0.3))
    weight_source = max(0.0, _clean_float(w_source if w_source is not None else settings.WEIGHT_SOURCE, 0.2))

    total_weight = weight_nli + weight_retrieval + weight_source
    if total_weight <= 0.0:
        return round(safe_nli, 4)

    raw_confidence = (
        (weight_nli * safe_nli)
        + (weight_retrieval * safe_ret)
        + (weight_source * safe_src)
    ) / total_weight

    clamped = max(0.0, min(1.0, _clean_float(raw_confidence, safe_nli)))
    return round(clamped, 4)
