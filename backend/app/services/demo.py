import logging
from typing import List, Optional

from app.schemas.claim import ClaimVerificationResult
from app.schemas.evidence import Citation
from app.schemas.request import VerifyRequest
from app.schemas.response import VerifyResponse
from app.schemas.verification import RiskLevel, VerificationStatus
from app.scoring.risk import calculate_overall_risk
from app.utils.text import split_sentences

logger = logging.getLogger(__name__)


# Deterministic, clearly labelled precomputed evidence fixtures
DEMO_SCENARIOS = {
    # Scenario 1: Contradicted claim
    "australia": {
        "claims": [
            ClaimVerificationResult(
                id="c1",
                text="Sydney is the capital of Australia.",
                status=VerificationStatus.CONTRADICTED,
                confidence=0.98,
                reasoning="The retrieved official gazette states that Canberra is the designated capital of Australia, directly contradicting Sydney.",
                citations=[
                    Citation(
                        source="Australian Government Directory (Precomputed Demo Evidence)",
                        url="https://www.australia.gov.au/about-government",
                        evidence="Canberra was selected as the location for the national capital in 1908 as a compromise between Sydney and Melbourne.",
                        relevance_score=0.96,
                    )
                ],
            )
        ]
    },
    # Scenario 2: Supported claim
    "france": {
        "claims": [
            ClaimVerificationResult(
                id="c1",
                text="Paris is the capital of France.",
                status=VerificationStatus.SUPPORTED,
                confidence=0.97,
                reasoning="Retrieved verified geographical records affirm that Paris is the capital city of France.",
                citations=[
                    Citation(
                        source="French National Geographic Institute (Precomputed Demo Evidence)",
                        url="https://www.ign.fr",
                        evidence="Paris is the capital and most populous city of the French Republic.",
                        relevance_score=0.98,
                    )
                ],
            )
        ]
    },
    # Scenario 3: Mixed claims
    "mixed": {
        "claims": [
            ClaimVerificationResult(
                id="c1",
                text="Paris is the capital of France.",
                status=VerificationStatus.SUPPORTED,
                confidence=0.97,
                reasoning="Supported by official records.",
                citations=[
                    Citation(
                        source="French National Geographic Institute (Precomputed Demo Evidence)",
                        url="https://www.ign.fr",
                        evidence="Paris is the capital and most populous city of the French Republic.",
                        relevance_score=0.98,
                    )
                ],
            ),
            ClaimVerificationResult(
                id="c2",
                text="Sydney is the capital of Australia.",
                status=VerificationStatus.CONTRADICTED,
                confidence=0.98,
                reasoning="Contradicted: Canberra is the actual capital.",
                citations=[
                    Citation(
                        source="Australian Government Directory (Precomputed Demo Evidence)",
                        url="https://www.australia.gov.au/about-government",
                        evidence="Canberra was selected as the location for the national capital in 1908.",
                        relevance_score=0.95,
                    )
                ],
            ),
        ]
    },
}


class DemoService:
    """Provides deterministic, offline-capable verification runs for live hackathon presentations."""

    def run_demo(self, request: VerifyRequest) -> VerifyResponse:
        logger.info("Executing verification in deterministic demo mode")
        answer_lower = request.answer.lower()
        question_lower = request.question.lower()

        # Check for mixed scenario
        if ("paris" in answer_lower or "france" in answer_lower) and (
            "sydney" in answer_lower or "australia" in answer_lower
        ):
            claims = DEMO_SCENARIOS["mixed"]["claims"]
        # Check for Australia contradicted scenario
        elif "sydney" in answer_lower or "australia" in answer_lower:
            claims = DEMO_SCENARIOS["australia"]["claims"]
        # Check for France supported scenario
        elif "paris" in answer_lower or "france" in answer_lower:
            claims = DEMO_SCENARIOS["france"]["claims"]
        else:
            # Deterministic heuristic fallback for arbitrary demo queries
            sentences = split_sentences(request.answer)
            if not sentences:
                sentences = [request.answer]

            claims = []
            for idx, sentence in enumerate(sentences, start=1):
                claims.append(
                    ClaimVerificationResult(
                        id=f"c{idx}",
                        text=sentence,
                        status=VerificationStatus.SUPPORTED if idx % 2 != 0 else VerificationStatus.INSUFFICIENT,
                        confidence=0.90 if idx % 2 != 0 else 0.50,
                        reasoning="Deterministic evaluation from precomputed demo knowledge base.",
                        citations=[
                            Citation(
                                source="VeriTrace Demo Reference Archive",
                                url="https://veritrace.internal/demo",
                                evidence=f"Verified reference statement corresponding to: {sentence}",
                                relevance_score=0.85,
                            )
                        ],
                    )
                )

        overall_risk, risk_level = calculate_overall_risk(claims)

        return VerifyResponse(
            overall_risk=overall_risk,
            risk_level=risk_level,
            claims=claims,
            execution_time_ms=5.0,
            is_demo=True,
            metadata={
                "mode": "deterministic_demo",
                "simulated": True,
                "note": "Precomputed demo evidence was used. No live LLM or external network was queried.",
            },
        )
