from typing import List, Optional
from pydantic import BaseModel, Field

from app.schemas.evidence import Citation
from app.schemas.verification import VerificationStatus


class ExtractedClaim(BaseModel):
    id: str = Field(..., description="Unique claim identifier e.g. c1")
    text: str = Field(..., min_length=1, description="Atomic factual statement")


class ClaimVerificationResult(BaseModel):
    id: str = Field(..., description="Identifier matching extracted claim")
    text: str = Field(..., description="Atomic factual statement text")
    status: VerificationStatus = Field(..., description="Verification verdict")
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score for this verification verdict (0.0 to 1.0)",
    )
    citations: List[Citation] = Field(
        default_factory=list,
        description="Supporting or refuting evidence citations",
    )
    reasoning: Optional[str] = Field(
        None,
        description="Brief natural language rationale for the verdict",
    )
