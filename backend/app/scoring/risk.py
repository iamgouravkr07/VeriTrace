from typing import Dict, List, Optional, Tuple, Union

from app.core.config import settings
from app.schemas.claim import ClaimVerificationResult
from app.schemas.verification import RiskLevel, VerificationStatus


def determine_risk_level(
    risk_score: float,
    threshold_low: Optional[float] = None,
    threshold_medium: Optional[float] = None,
    threshold_high: Optional[float] = None,
) -> RiskLevel:
    """Classify a 0-100 risk score into a categorical RiskLevel."""
    low_max = threshold_low if threshold_low is not None else settings.THRESHOLD_LOW_MAX
    med_max = threshold_medium if threshold_medium is not None else settings.THRESHOLD_MEDIUM_MAX
    high_max = threshold_high if threshold_high is not None else settings.THRESHOLD_HIGH_MAX

    if risk_score <= low_max:
        return RiskLevel.LOW
    elif risk_score <= med_max:
        return RiskLevel.MEDIUM
    elif risk_score <= high_max:
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

    Note: These are initial heuristic thresholds and scoring rules meant
    to be calibrated against evaluation benchmarks.
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

        penalty = penalties.get(status_key, 0.5)
        total_penalty += penalty

    raw_risk = (total_penalty / len(claims)) * 100.0
    risk_score = round(max(0.0, min(100.0, raw_risk)), 2)
    level = determine_risk_level(risk_score)
    return risk_score, level
