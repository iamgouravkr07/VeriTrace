"""Natural Language Inference (NLI) Verification Module (Member 4).

Provides the core NLI entailment logic and VerificationService.
"""

from app.verification.service import VerificationService
from app.verification.models import (
    EvidenceReference,
    SingleClaimVerificationResult,
    VerificationVerdict,
)

# Export aliases for flexible member integration
NLIVerifier = VerificationService
NLIClaimVerifier = VerificationService

__all__ = [
    "VerificationService",
    "NLIVerifier",
    "NLIClaimVerifier",
    "VerificationVerdict",
    "SingleClaimVerificationResult",
    "EvidenceReference",
]
