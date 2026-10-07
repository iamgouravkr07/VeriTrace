from typing import Optional
from pydantic import BaseModel, Field


class Citation(BaseModel):
    source: str = Field(..., description="Name or identifier of the source")
    url: Optional[str] = Field(None, description="URL of the source if available")
    evidence: str = Field(..., description="Supporting or contradicting text snippet")
    page: Optional[int] = Field(None, description="Page number if applicable")
    relevance_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Relevance score of citation to the claim",
    )


class EvidenceItem(BaseModel):
    """Internal model for retrieved evidence snippets before formatting as citations."""
    text: str = Field(..., description="Evidence text content")
    source: str = Field(..., description="Source name or document identifier")
    url: Optional[str] = Field(None, description="Source URL")
    page: Optional[int] = Field(None, description="Page number")
    relevance_score: float = Field(0.0, ge=0.0, le=1.0, description="Relevance score")

    def to_citation(self) -> Citation:
        return Citation(
            source=self.source,
            url=self.url,
            evidence=self.text,
            page=self.page,
            relevance_score=self.relevance_score,
        )
