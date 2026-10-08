import logging
import time
from typing import List, Optional

from app.core.config import settings
from app.core.exceptions import (
    ClaimExtractionError,
    RetrievalError,
    VerificationError,
    VeriTraceException,
)
from app.llm.claim_extractor import ClaimExtractor
from app.retrieval.interface import (
    EvidenceRetriever,
    StubRetriever,
    get_default_retriever,
    normalize_retrieval_output,
)
from app.schemas.claim import ClaimVerificationResult, ExtractedClaim
from app.schemas.evidence import Citation, convert_to_citations
from app.schemas.request import VerifyRequest
from app.schemas.response import VerifyResponse
from app.schemas.verification import RiskLevel, VerificationStatus
from app.scoring.risk import calculate_overall_risk
from app.services.demo import DemoService
from app.verification.confidence import calculate_confidence
from app.verification.service import VerificationService
from app.verification.verifier import (
    ClaimVerifier,
    normalize_verification_output,
)

logger = logging.getLogger(__name__)


class VerificationOrchestrator:
    """Main verification integration pipeline coordinating claim extraction, retrieval, and verification."""

    def __init__(
        self,
        claim_extractor: Optional[ClaimExtractor] = None,
        retriever: Optional[EvidenceRetriever] = None,
        verifier: Optional[ClaimVerifier] = None,
        demo_service: Optional[DemoService] = None,
    ):
        self.claim_extractor = claim_extractor or ClaimExtractor()
        self.retriever = retriever if retriever is not None else get_default_retriever()
        self.verifier = verifier or VerificationService()
        self.demo_service = demo_service or DemoService()
        self._verification_cache = {}

    def verify_answer(self, request: VerifyRequest) -> VerifyResponse:
        """Execute the end-to-end verification pipeline on the provided request."""
        start_time = time.perf_counter()

        # Route to demo mode if requested or configured as default
        if request.demo_mode or settings.DEMO_MODE_DEFAULT:
            logger.info("Executing verification in demo mode")
            return self.demo_service.run_demo(request)

        # 1. Claim extraction stage
        t_extract_start = time.perf_counter()
        try:
            extracted_claims: List[ExtractedClaim] = self.claim_extractor.extract_claims(
                answer=request.answer,
                question=request.question,
            )
        except Exception as e:
            logger.error("Claim extraction phase failed: %s", e)
            raise ClaimExtractionError(f"Failed to extract claims: {str(e)}") from e
        claim_extraction_ms = (time.perf_counter() - t_extract_start) * 1000.0

        # Handle case where no factual claims were identified in answer
        if not extracted_claims:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            return VerifyResponse(
                overall_risk=0.0,
                risk_level=RiskLevel.LOW,
                claims=[],
                execution_time_ms=elapsed_ms,
                is_demo=False,
                metadata={
                    "message": "No verifiable factual claims detected in input text.",
                    "claim_count": 0,
                    "latency_breakdown": {
                        "claim_extraction_ms": round(claim_extraction_ms, 2),
                        "retrieval_ms": 0.0,
                        "reranking_ms": 0.0,
                        "nli_ms": 0.0,
                        "scoring_ms": 0.0,
                        "total_ms": elapsed_ms,
                    },
                },
            )

        # 2 & 3. Evidence retrieval, reranking, and verification per claim
        verified_claims: List[ClaimVerificationResult] = []
        retrieval_ms = 0.0
        reranking_ms = 0.0
        nli_ms = 0.0
        scoring_ms = 0.0

        for claim in extracted_claims:
            # 2. Retrieve & rerank evidence
            try:
                timed_method = getattr(self.retriever, "retrieve_evidence_timed", None)
                used_timed = False
                if callable(timed_method):
                    try:
                        timed_res = timed_method(claim.text)
                        if isinstance(timed_res, (tuple, list)) and len(timed_res) == 3:
                            evidence_items, r_ms, rr_ms = timed_res
                            retrieval_ms += float(r_ms)
                            reranking_ms += float(rr_ms)
                            used_timed = True
                    except Exception as e:
                        logger.debug("timed retrieval fallback: %s", e)
                        used_timed = False

                if not used_timed:
                    t_r = time.perf_counter()
                    raw_evidence = self.retriever.retrieve_evidence(claim.text)
                    evidence_items = normalize_retrieval_output(raw_evidence)
                    retrieval_ms += (time.perf_counter() - t_r) * 1000.0
            except Exception as e:
                logger.error("Retrieval failed for claim '%s': %s", claim.text, e)
                evidence_items = []

            # 3. Verify claim against evidence using Member 4 Verifier (with cache)
            hallucination_risk = None
            supporting_citations: List[Citation] = []
            contradicting_citations: List[Citation] = []
            status = VerificationStatus.INSUFFICIENT
            nli_conf = 0.5
            reasoning = "Verification model could not process claim."

            cache_key = (claim.text.strip().lower(), tuple(sorted(e.text.strip() for e in evidence_items)))

            t_nli = time.perf_counter()
            if cache_key in self._verification_cache:
                raw_verification = self._verification_cache[cache_key]
            else:
                try:
                    raw_verification = self.verifier.verify_claim(claim.text, evidence_items)
                    self._verification_cache[cache_key] = raw_verification
                except Exception as e:
                    logger.error("Verification failed for claim '%s': %s", claim.text, e)
                    raw_verification = {
                        "status": "INSUFFICIENT",
                        "verdict": "INSUFFICIENT_EVIDENCE",
                        "confidence": 0.5,
                        "hallucination_risk": 0.9,
                        "reasoning": f"Verification model error: {type(e).__name__}.",
                        "supporting_evidence": [],
                        "contradicting_evidence": [],
                    }
            nli_ms += (time.perf_counter() - t_nli) * 1000.0

            t_score = time.perf_counter()
            try:
                status, nli_conf, reasoning = normalize_verification_output(raw_verification)
                if isinstance(raw_verification, dict):
                    hallucination_risk = raw_verification.get("hallucination_risk")
                    raw_supporting = raw_verification.get("supporting_evidence")
                    raw_contradicting = raw_verification.get("contradicting_evidence")
                    supporting_citations = convert_to_citations(raw_supporting)
                    contradicting_citations = convert_to_citations(raw_contradicting)
            except Exception as e:
                logger.error("Failed to parse verification output for claim '%s': %s", claim.text, e)

            # Calculate confidence score combining NLI confidence and retrieval relevance
            top_relevance = (
                max([item.relevance_score for item in evidence_items])
                if evidence_items
                else 0.0
            )
            combined_confidence = calculate_confidence(
                nli_confidence=nli_conf,
                retrieval_relevance=top_relevance,
                source_reliability=1.0,
            )

            # Build citations (existing retrieval citations behavior remains unchanged)
            citations = [item.to_citation() for item in evidence_items]

            verified_claims.append(
                ClaimVerificationResult(
                    id=claim.id,
                    text=claim.text,
                    status=status,
                    verdict=status,
                    confidence=combined_confidence,
                    hallucination_risk=hallucination_risk,
                    citations=citations,
                    supporting_evidence=supporting_citations,
                    contradicting_evidence=contradicting_citations,
                    reasoning=reasoning,
                )
            )
            scoring_ms += (time.perf_counter() - t_score) * 1000.0

        # 4. Calculate overall hallucination risk
        t_overall_risk = time.perf_counter()
        overall_risk, risk_level = calculate_overall_risk(verified_claims)
        scoring_ms += (time.perf_counter() - t_overall_risk) * 1000.0

        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        latency_breakdown = {
            "claim_extraction_ms": round(claim_extraction_ms, 2),
            "retrieval_ms": round(retrieval_ms, 2),
            "reranking_ms": round(reranking_ms, 2),
            "nli_ms": round(nli_ms, 2),
            "scoring_ms": round(scoring_ms, 2),
            "total_ms": elapsed_ms,
        }

        return VerifyResponse(
            overall_risk=overall_risk,
            risk_level=risk_level,
            claims=verified_claims,
            execution_time_ms=elapsed_ms,
            is_demo=False,
            metadata={
                "claim_count": len(verified_claims),
                "latency_breakdown": latency_breakdown,
            },
        )
