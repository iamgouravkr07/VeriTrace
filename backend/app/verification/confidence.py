from typing import Optional

from app.core.config import settings


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
    Result is normalized and clamped between 0.0 and 1.0.
    """
    weight_nli = w_nli if w_nli is not None else settings.WEIGHT_NLI
    weight_retrieval = w_retrieval if w_retrieval is not None else settings.WEIGHT_RETRIEVAL
    weight_source = w_source if w_source is not None else settings.WEIGHT_SOURCE

    total_weight = weight_nli + weight_retrieval + weight_source
    if total_weight <= 0:
        return round(max(0.0, min(1.0, nli_confidence)), 4)

    raw_confidence = (
        (weight_nli * nli_confidence)
        + (weight_retrieval * retrieval_relevance)
        + (weight_source * source_reliability)
    ) / total_weight

    clamped = max(0.0, min(1.0, raw_confidence))
    return round(clamped, 4)
