import logging
from typing import Any, Dict, List, Optional, Tuple, Union

from app.core.exceptions import LLMError
from app.llm.gateway import LLMGateway, get_llm_gateway
from app.llm.gemini import GeminiGateway
from app.schemas.evidence import EvidenceItem
from app.verification.models import (
    EvidenceReference,
    SingleClaimVerificationResult,
    VerificationVerdict,
)
from app.verification.prompts import (
    VERIFICATION_SYSTEM_PROMPT,
    VERIFICATION_USER_PROMPT,
)

logger = logging.getLogger(__name__)

# Security constants for untrusted inputs
MAX_SNIPPET_LENGTH = 2000
MAX_SNIPPETS_COUNT = 10


class VerificationService:
    """NLI and evidence verification engine (Member 4 responsibility).
    
    Evaluates claims against retrieved evidence using strict grounding,
    calibrated confidence, hallucination risk assessment, and prompt-injection defense.
    """

    def __init__(self, gateway: Optional[LLMGateway] = None):
        self.gateway = gateway or get_llm_gateway()

    def verify(
        self,
        claim: str,
        evidence: List[Union[EvidenceItem, Dict[str, Any], EvidenceReference]],
    ) -> SingleClaimVerificationResult:
        """Verify an individual factual claim against retrieved evidence passages."""
        # 1. Input validation & sanitization for claim
        if not claim or not claim.strip():
            logger.warning("Empty or whitespace claim passed to VerificationService")
            return SingleClaimVerificationResult(
                claim=claim or "",
                verdict=VerificationVerdict.INSUFFICIENT_EVIDENCE,
                confidence=0.0,
                hallucination_risk=1.0,
                reasoning="Empty or invalid claim provided for verification.",
                supporting_evidence=[],
                contradicting_evidence=[],
            )

        sanitized_claim = claim.strip()

        # 2. Input validation & sanitization for evidence
        normalized_evidence = self._normalize_evidence(evidence)

        # Handle empty or uninformative evidence safely
        if not normalized_evidence:
            logger.info("No usable evidence passages provided for claim: '%s'", sanitized_claim[:60])
            return SingleClaimVerificationResult(
                claim=sanitized_claim,
                verdict=VerificationVerdict.INSUFFICIENT_EVIDENCE,
                confidence=0.1,
                hallucination_risk=0.95,
                reasoning="No evidence was provided to substantiate or refute the claim.",
                supporting_evidence=[],
                contradicting_evidence=[],
            )

        # 3. Construct strictly isolated prompt
        prompt = self._build_verification_prompt(sanitized_claim, normalized_evidence)

        # 4. Query configured LLMGateway
        try:
            raw_response = self.gateway.generate_json(
                prompt=prompt,
                system_instruction=VERIFICATION_SYSTEM_PROMPT,
            )
            return self._parse_and_validate_output(
                sanitized_claim,
                normalized_evidence,
                raw_response,
            )

        except LLMError as e:
            logger.warning("LLM gateway error during claim verification: %s", e)
            return SingleClaimVerificationResult(
                claim=sanitized_claim,
                verdict=VerificationVerdict.INSUFFICIENT_EVIDENCE,
                confidence=0.2,
                hallucination_risk=0.85,
                reasoning=f"Verification model temporarily unavailable: {type(e).__name__}.",
                supporting_evidence=[],
                contradicting_evidence=[],
            )
        except Exception as e:
            logger.error("Unexpected error during claim verification: %s", e)
            return SingleClaimVerificationResult(
                claim=sanitized_claim,
                verdict=VerificationVerdict.INSUFFICIENT_EVIDENCE,
                confidence=0.15,
                hallucination_risk=0.90,
                reasoning="An error occurred while evaluating the evidence against the claim.",
                supporting_evidence=[],
                contradicting_evidence=[],
            )

    def verify_claim(
        self,
        claim: str,
        evidence: List[EvidenceItem],
    ) -> Dict[str, Any]:
        """Method satisfying Member 1's ClaimVerifier protocol interface.
        
        Allows drop-in integration with VerificationOrchestrator.
        """
        result = self.verify(claim, evidence)
        return result.to_dict()

    def _normalize_evidence(
        self,
        raw_evidence: List[Any],
    ) -> List[EvidenceReference]:
        """Sanitize, truncate, and normalize input evidence into structured references."""
        normalized: List[EvidenceReference] = []

        for idx, item in enumerate(raw_evidence[:MAX_SNIPPETS_COUNT], start=1):
            source_id = f"e{idx}"
            text = ""
            source = "Unknown Source"
            url = None
            page = None
            relevance = 0.0
            doc_id = None
            doc_name = None
            chunk_id = None

            if isinstance(item, EvidenceReference):
                source_id = item.source_id or source_id
                text = item.text
                source = item.source or source
                url = item.url
                page = item.page
                relevance = item.relevance
                doc_id = item.document_id
                doc_name = item.document_name
                chunk_id = item.chunk_id
            elif isinstance(item, EvidenceItem):
                text = item.text
                source = item.source or source
                url = item.url
                page = item.page
                relevance = item.relevance_score
                doc_id = item.document_id
                doc_name = item.document_name
                chunk_id = item.chunk_id
            elif isinstance(item, dict):
                source_id = str(item.get("source_id") or item.get("id") or source_id)
                text = str(item.get("text") or item.get("evidence") or "")
                source = str(item.get("source") or item.get("document_name") or source)
                url = item.get("url")
                page = item.get("page")
                raw_rel = item.get("relevance") or item.get("relevance_score") or 0.0
                doc_id = item.get("document_id")
                doc_name = item.get("document_name")
                chunk_id = item.get("chunk_id")
                try:
                    relevance = float(raw_rel)
                except (ValueError, TypeError):
                    relevance = 0.0
            elif isinstance(item, str):
                text = item

            # Strip and limit text length for safety
            text = text.strip()
            if not text:
                continue

            if len(text) > MAX_SNIPPET_LENGTH:
                text = text[:MAX_SNIPPET_LENGTH] + "... [truncated]"

            normalized.append(
                EvidenceReference(
                    source_id=source_id,
                    text=text,
                    source=source,
                    url=url,
                    page=page,
                    relevance=round(max(0.0, min(1.0, relevance)), 4),
                    document_id=doc_id,
                    document_name=doc_name,
                    chunk_id=chunk_id,
                )
            )

        return normalized

    def _build_verification_prompt(
        self,
        claim: str,
        evidence: List[EvidenceReference],
    ) -> str:
        """Build structured prompt with XML boundary markers to resist prompt injection."""
        blocks = []
        for item in evidence:
            source_info = f' source="{item.source}"' if item.source else ""
            block = (
                f'<untrusted_evidence_item id="{item.source_id}"{source_info}>\n'
                f"{item.text}\n"
                f"</untrusted_evidence_item>"
            )
            blocks.append(block)

        evidence_section = "\n\n".join(blocks)
        return VERIFICATION_USER_PROMPT.format(
            claim=claim,
            evidence_blocks=evidence_section,
        )

    def _parse_and_validate_output(
        self,
        claim: str,
        evidence: List[EvidenceReference],
        raw_output: Any,
    ) -> SingleClaimVerificationResult:
        """Validate LLM output schema, clamp confidence/risk, and attribute evidence."""
        if not isinstance(raw_output, dict):
            logger.warning("LLM returned non-dictionary response: %s", raw_output)
            return self._build_safe_recovery_result(claim, evidence, "Malformed verification output structure.")

        # 1. Parse and validate verdict
        raw_verdict = str(raw_output.get("verdict") or raw_output.get("status") or "").upper().strip()
        if raw_verdict in ("SUPPORTED", "ENTAILMENT"):
            verdict = VerificationVerdict.SUPPORTED
        elif raw_verdict in ("CONTRADICTED", "CONTRADICTION", "REFUTED"):
            verdict = VerificationVerdict.CONTRADICTED
        elif raw_verdict in ("INSUFFICIENT", "INSUFFICIENT_EVIDENCE", "NEUTRAL", "UNVERIFIED"):
            verdict = VerificationVerdict.INSUFFICIENT_EVIDENCE
        else:
            logger.warning("Unrecognized verdict string '%s'; recovering with INSUFFICIENT_EVIDENCE", raw_verdict)
            verdict = VerificationVerdict.INSUFFICIENT_EVIDENCE

        # 2. Validate and clamp confidence [0.0 - 1.0]
        try:
            raw_conf = float(raw_output.get("confidence", 0.5))
            confidence = round(max(0.0, min(1.0, raw_conf)), 4)
        except (ValueError, TypeError):
            confidence = 0.85 if verdict != VerificationVerdict.INSUFFICIENT_EVIDENCE else 0.35

        # 3. Validate and clamp hallucination risk [0.0 - 1.0]
        try:
            raw_risk = float(raw_output.get("hallucination_risk", 0.5))
            hallucination_risk = round(max(0.0, min(1.0, raw_risk)), 4)
        except (ValueError, TypeError):
            if verdict == VerificationVerdict.SUPPORTED:
                hallucination_risk = round(1.0 - confidence, 4)
            elif verdict == VerificationVerdict.CONTRADICTED:
                hallucination_risk = 0.95
            else:
                hallucination_risk = 0.85

        # 4. Validate reasoning
        raw_reasoning = raw_output.get("reasoning")
        reasoning = str(raw_reasoning).strip() if raw_reasoning else "Evaluated against supplied evidence."

        # 5. Map evidence attribution
        evidence_by_id = {e.source_id: e for e in evidence}
        supporting_ids = raw_output.get("supporting_source_ids", [])
        contradicting_ids = raw_output.get("contradicting_source_ids", [])

        supporting_evidence = [
            evidence_by_id[sid]
            for sid in supporting_ids
            if isinstance(sid, str) and sid in evidence_by_id
        ]
        contradicting_evidence = [
            evidence_by_id[cid]
            for cid in contradicting_ids
            if isinstance(cid, str) and cid in evidence_by_id
        ]

        # Fallback evidence attribution if LLM omitted specific IDs
        if verdict == VerificationVerdict.SUPPORTED and not supporting_evidence:
            supporting_evidence = evidence[:1]
        elif verdict == VerificationVerdict.CONTRADICTED and not contradicting_evidence:
            contradicting_evidence = evidence[:1]

        return SingleClaimVerificationResult(
            claim=claim,
            verdict=verdict,
            confidence=confidence,
            hallucination_risk=hallucination_risk,
            reasoning=reasoning,
            supporting_evidence=supporting_evidence,
            contradicting_evidence=contradicting_evidence,
        )

    def _build_safe_recovery_result(
        self,
        claim: str,
        evidence: List[EvidenceReference],
        reason: str,
    ) -> SingleClaimVerificationResult:
        """Safe recovery object when model output cannot be reliably decoded."""
        return SingleClaimVerificationResult(
            claim=claim,
            verdict=VerificationVerdict.INSUFFICIENT_EVIDENCE,
            confidence=0.2,
            hallucination_risk=0.85,
            reasoning=reason,
            supporting_evidence=[],
            contradicting_evidence=[],
        )
