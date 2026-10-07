import logging
from typing import Any, Dict, List, Optional, Protocol, runtime_checkable

from app.schemas.evidence import EvidenceItem

logger = logging.getLogger(__name__)


@runtime_checkable
class EvidenceRetriever(Protocol):
    """Clean interface protocol for Member 3's Retrieval Engine.
    
    Member 3 can implement any vector store, hybrid search, or BM25 retriever
    satisfying this protocol without altering the orchestrator or API layer.
    """

    def retrieve_evidence(self, claim: str, top_k: int = 3) -> List[EvidenceItem]:
        """Retrieve relevant evidence snippets for an atomic claim."""
        ...


class StubRetriever:
    """Default fallback retriever when live retrieval engine is not connected.
    
    Returns an empty list or configured mock snippets.
    """

    def __init__(self, default_evidence: Optional[List[EvidenceItem]] = None):
        self.default_evidence = default_evidence or []

    def retrieve_evidence(self, claim: str, top_k: int = 3) -> List[EvidenceItem]:
        logger.debug("StubRetriever called for claim: '%s'", claim)
        return self.default_evidence[:top_k]


def normalize_retrieval_output(raw_results: List[Any]) -> List[EvidenceItem]:
    """Helper to convert Member 3's raw dict outputs into validated EvidenceItem models.
    
    Accepts:
    [
        {
            "text": "...",
            "source": "...",
            "url": "...",
            "page": 3,
            "relevance_score": 0.92
        }
    ]
    """
    evidence_items: List[EvidenceItem] = []
    for item in raw_results:
        if isinstance(item, EvidenceItem):
            evidence_items.append(item)
        elif isinstance(item, dict):
            evidence_items.append(
                EvidenceItem(
                    text=str(item.get("text") or item.get("evidence") or ""),
                    source=str(item.get("source") or "Unknown Source"),
                    url=item.get("url"),
                    page=item.get("page"),
                    relevance_score=float(item.get("relevance_score", 0.0)),
                )
            )
    return evidence_items
