from typing import List, Optional
from pydantic import BaseModel, Field, model_validator

from app.schemas.evidence import Citation
from app.schemas.verification import VerificationStatus


class ExtractedClaim(BaseModel):
    id: str = Field(..., description="Unique claim identifier e.g. c1")
    text: str = Field(..., min_length=1, description="Atomic factual statement")


class ClaimVerificationResult(BaseModel):
    id: str = Field(..., description="Identifier matching extracted claim")
    text: str = Field(..., description="Atomic factual statement text")
    status: VerificationStatus = Field(..., description="Verification verdict")
    verdict: Optional[VerificationStatus] = Field(
        None,
        description="Controlled verification verdict (synonym for status)",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score for this verification verdict (0.0 to 1.0)",
    )
    hallucination_risk: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Estimated hallucination risk for this claim (0.0 to 1.0)",
    )
    citations: List[Citation] = Field(
        default_factory=list,
        description="Supporting or refuting evidence citations",
    )
    supporting_evidence: List[Citation] = Field(
        default_factory=list,
        description="Directly supporting evidence citations",
    )
    contradicting_evidence: List[Citation] = Field(
        default_factory=list,
        description="Directly contradicting evidence citations",
    )
    reasoning: Optional[str] = Field(
        None,
        description="Brief natural language rationale for the verdict",
    )

    @model_validator(mode="after")
    def sync_verdict_and_status(self) -> "ClaimVerificationResult":
        if self.verdict is None and self.status is not None:
            self.verdict = self.status
        elif self.status is None and self.verdict is not None:
            self.status = self.verdict
        return self
