from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.schemas.claim import ClaimVerificationResult
from app.schemas.verification import RiskLevel


class VerifyResponse(BaseModel):
    overall_risk: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Overall hallucination risk score from 0 to 100",
    )
    risk_level: RiskLevel = Field(
        ...,
        description="Categorical risk tier: LOW, MEDIUM, HIGH, CRITICAL",
    )
    claims: List[ClaimVerificationResult] = Field(
        default_factory=list,
        description="List of extracted claims with verification status and evidence citations",
    )
    execution_time_ms: Optional[float] = Field(
        None,
        description="Total verification pipeline execution time in milliseconds",
    )
    is_demo: bool = Field(
        default=False,
        description="Whether this verification was processed via demo mode",
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional execution metadata (claim counts, model info, etc.)",
    )
