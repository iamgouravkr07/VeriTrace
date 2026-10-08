import math
from typing import Any, Dict, List, Optional, Tuple, Union

from app.core.config import settings
from app.schemas.claim import ClaimVerificationResult
from app.schemas.verification import RiskLevel, VerificationStatus


def _clean_float(val: Any, default: float = 0.0) -> float:
    """Safely convert any value to float, replacing NaN and Inf with default."""
    try:
        f = float(val)
        return default if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return default


def determine_risk_level(
    risk_score: float,
    threshold_low: Optional[float] = None,
    threshold_medium: Optional[float] = None,
    threshold_high: Optional[float] = None,
) -> RiskLevel:
    """Classify a 0-100 risk score into a categorical RiskLevel."""
    score = _clean_float(risk_score, 0.0)
    low_max = _clean_float(threshold_low if threshold_low is not None else settings.THRESHOLD_LOW_MAX, 20.0)
    med_max = _clean_float(threshold_medium if threshold_medium is not None else settings.THRESHOLD_MEDIUM_MAX, 50.0)
    high_max = _clean_float(threshold_high if threshold_high is not None else settings.THRESHOLD_HIGH_MAX, 80.0)

    if score <= low_max:
        return RiskLevel.LOW
    elif score <= med_max:
        return RiskLevel.MEDIUM
    elif score <= high_max:
        return RiskLevel.HIGH
    else:
        return RiskLevel.CRITICAL


def calculate_overall_risk(
    claims: List[Union[ClaimVerificationResult, VerificationStatus, str]],
    penalty_map: Optional[Dict[str, float]] = None,
) -> Tuple[float, RiskLevel]:
    """Calculate overall hallucination risk from a list of verified claims.

    Prototype Logic:
        SUPPORTED    -> 0.0 penalty
        INSUFFICIENT -> 0.5 penalty
        CONTRADICTED -> 1.0 penalty

        overall_risk = (penalty_sum / count) * 100
    """
    if not claims:
        return 0.0, RiskLevel.LOW

    penalties = penalty_map if penalty_map is not None else settings.RISK_PENALTY_MAP

    total_penalty = 0.0
    for claim in claims:
        if isinstance(claim, ClaimVerificationResult):
            status_key = claim.status.value
        elif isinstance(claim, VerificationStatus):
            status_key = claim.value
        elif isinstance(claim, str):
            status_key = claim.upper()
        else:
            status_key = "INSUFFICIENT"

        raw_penalty = penalties.get(status_key, 0.5)
        total_penalty += _clean_float(raw_penalty, 0.5)

    raw_risk = (total_penalty / len(claims)) * 100.0
    risk_score = round(max(0.0, min(100.0, _clean_float(raw_risk, 0.0))), 2)
    level = determine_risk_level(risk_score)
    return risk_score, level
