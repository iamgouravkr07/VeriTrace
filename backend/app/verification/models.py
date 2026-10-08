from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VerificationVerdict(str, Enum):
    """Controlled set of verdicts for claim verification against evidence."""
    SUPPORTED = "SUPPORTED"
    CONTRADICTED = "CONTRADICTED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class EvidenceReference(BaseModel):
    """Reference to an evidence passage associated with a verification verdict."""
    source_id: str = Field(..., description="Unique identifier of the evidence item")
    text: str = Field(..., description="Evidence text content")
    source: Optional[str] = Field(None, description="Source name or title")
    url: Optional[str] = Field(None, description="Source URL if available")
    page: Optional[int] = Field(None, description="Page number if applicable")
    relevance: float = Field(0.0, ge=0.0, le=1.0, description="Relevance score (0.0 - 1.0)")
    document_id: Optional[str] = Field(None, description="Document identifier")
    document_name: Optional[str] = Field(None, description="Document name")
    chunk_id: Optional[str] = Field(None, description="Chunk identifier")

    def to_citation(self) -> Any:
        from app.schemas.evidence import Citation
        return Citation(
            source=self.source or self.source_id or "Unknown Source",
            url=self.url,
            evidence=self.text,
            page=self.page,
            relevance_score=self.relevance,
            document_id=self.document_id,
            chunk_id=self.chunk_id,
        )


class SingleClaimVerificationResult(BaseModel):
    """Comprehensive verification result for a single factual claim."""
    claim: str = Field(..., description="The factual assertion being evaluated")
    verdict: VerificationVerdict = Field(..., description="Controlled verdict: SUPPORTED, CONTRADICTED, INSUFFICIENT_EVIDENCE")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Normalized verification confidence (0.0 - 1.0)")
    hallucination_risk: float = Field(..., ge=0.0, le=1.0, description="Estimated hallucination risk (0.0 - 1.0)")
    reasoning: str = Field(..., description="Strict, evidence-grounded explanation for verdict")
    supporting_evidence: List[EvidenceReference] = Field(
        default_factory=list,
        description="Evidence passages that directly entail or support the claim",
    )
    contradicting_evidence: List[EvidenceReference] = Field(
        default_factory=list,
        description="Evidence passages that directly refute or contradict the claim",
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with backward compatibility for Member 1 ClaimVerifier protocol."""
        status_val = "INSUFFICIENT" if self.verdict == VerificationVerdict.INSUFFICIENT_EVIDENCE else self.verdict.value
        return {
            "claim": self.claim,
            "verdict": self.verdict.value,
            # 'status' provides drop-in compatibility with Member 1's VerificationStatus
            "status": status_val,
            "confidence": self.confidence,
            "hallucination_risk": self.hallucination_risk,
            "reasoning": self.reasoning,
            "supporting_evidence": [e.model_dump() for e in self.supporting_evidence],
            "contradicting_evidence": [e.model_dump() for e in self.contradicting_evidence],
        }
