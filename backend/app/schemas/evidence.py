from typing import Any, List, Optional
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


def convert_to_citations(raw_items: Any) -> List[Citation]:
    """Safely convert evidence references or dictionaries into validated Citation objects.

    If evidence attribution cannot be safely converted or lacks valid text,
    it is safely skipped without inventing data.
    """
    if not raw_items or not isinstance(raw_items, (list, tuple)):
        return []

    citations: List[Citation] = []
    for item in raw_items:
        try:
            if isinstance(item, Citation):
                citations.append(item)
            elif hasattr(item, "to_citation") and callable(item.to_citation):
                citations.append(item.to_citation())
            elif isinstance(item, dict):
                text = str(item.get("evidence") or item.get("text") or "").strip()
                if not text:
                    # Do not invent text data if missing
                    continue
                source = str(item.get("source") or item.get("source_id") or "Unknown Source").strip()
                raw_rel = item.get("relevance_score")
                if raw_rel is None:
                    raw_rel = item.get("relevance", 0.0)
                relevance = float(raw_rel)
                relevance = max(0.0, min(1.0, relevance))
                citations.append(
                    Citation(
                        source=source or "Unknown Source",
                        url=item.get("url"),
                        evidence=text,
                        page=item.get("page"),
                        relevance_score=round(relevance, 4),
                    )
                )
        except Exception:
            continue
    return citations
