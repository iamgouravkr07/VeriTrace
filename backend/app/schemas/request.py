from typing import Any, Dict, List, Union
from pydantic import BaseModel, Field, field_validator

from app.schemas.evidence import EvidenceItem


class VerifyRequest(BaseModel):
    question: str = Field(
        ...,
        description="The query/prompt asked by the user",
        examples=["What is the capital of Australia?"],
    )
    answer: str = Field(
        ...,
        description="The LLM-generated answer to verify",
        examples=["Sydney is the capital of Australia."],
    )
    demo_mode: bool = Field(
        default=False,
        description="Run in deterministic demo mode without external dependencies",
    )

    @field_validator("question")
    @classmethod
    def validate_question_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("question cannot be empty or whitespace only")
        return stripped

    @field_validator("answer")
    @classmethod
    def validate_answer_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("answer cannot be empty or whitespace only")
        return stripped


class VerifyClaimRequest(BaseModel):
    """Direct standalone verification request for an individual claim against evidence."""
    claim: str = Field(
        ...,
        description="The factual claim to verify",
        examples=["Sydney is the capital of Australia."],
    )
    evidence: List[Union[EvidenceItem, Dict[str, Any]]] = Field(
        default_factory=list,
        description="List of retrieved evidence passages",
    )

    @field_validator("claim")
    @classmethod
    def validate_claim_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("claim cannot be empty or whitespace only")
        return stripped
