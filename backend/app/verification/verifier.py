import logging
from typing import Any, Dict, List, Optional, Protocol, Tuple, runtime_checkable

from app.schemas.evidence import EvidenceItem
from app.schemas.verification import VerificationStatus

logger = logging.getLogger(__name__)


@runtime_checkable
class ClaimVerifier(Protocol):
    """Clean interface protocol for Member 4's NLI Verification Model.

    Member 4 can plug in any cross-encoder, DeBERTa, or custom NLI model
    satisfying this interface without touching orchestrator or API code.
    """

    def verify_claim(
        self,
        claim: str,
        evidence: List[EvidenceItem],
    ) -> Dict[str, Any]:
        """Verify an atomic claim against retrieved evidence snippets.

        Expected return format:
        {
            "status": "SUPPORTED" | "CONTRADICTED" | "INSUFFICIENT",
            "confidence": 0.94,
            "reasoning": "Optional explanation"
        }
        """
        ...


class StubClaimVerifier:
    """Default fallback verifier when live NLI engine is not connected."""

    def __init__(self, default_status: VerificationStatus = VerificationStatus.INSUFFICIENT, default_confidence: float = 0.5):
        self.default_status = default_status
        self.default_confidence = default_confidence

    def verify_claim(
        self,
        claim: str,
        evidence: List[EvidenceItem],
    ) -> Dict[str, Any]:
        logger.debug("StubClaimVerifier called for claim: '%s' with %d evidence items", claim, len(evidence))
        if not evidence:
            return {
                "status": VerificationStatus.INSUFFICIENT.value,
                "confidence": 0.5,
                "reasoning": "No evidence retrieved to support or refute the claim.",
            }
        return {
            "status": self.default_status.value,
            "confidence": self.default_confidence,
            "reasoning": "Evaluated via fallback stub verifier.",
        }


def normalize_verification_output(
    raw_result: Dict[str, Any],
) -> Tuple[VerificationStatus, float, Optional[str]]:
    """Safely parse Member 4's verification output into validated status and confidence."""
    raw_status = str(raw_result.get("status", "INSUFFICIENT")).upper().strip()
    try:
        status = VerificationStatus(raw_status)
    except ValueError:
        logger.warning("Unrecognized verification status '%s'; defaulting to INSUFFICIENT", raw_status)
        status = VerificationStatus.INSUFFICIENT

    raw_conf = raw_result.get("confidence", 0.5)
    try:
        confidence = round(max(0.0, min(1.0, float(raw_conf))), 4)
    except (ValueError, TypeError):
        confidence = 0.5

    reasoning = raw_result.get("reasoning")
    if reasoning is not None:
        reasoning = str(reasoning)

    return status, confidence, reasoning
