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
    """Helper to convert Member 3's raw dict outputs into validated EvidenceItem models."""
    evidence_items: List[EvidenceItem] = []
    for item in raw_results:
        if isinstance(item, EvidenceItem):
            evidence_items.append(item)
        elif isinstance(item, dict):
            evidence_items.append(
                EvidenceItem(
                    text=str(item.get("text") or item.get("evidence") or ""),
                    source=str(item.get("source") or item.get("document_name") or "Unknown Source"),
                    url=item.get("url"),
                    page=item.get("page"),
                    relevance_score=float(item.get("relevance_score", 0.0)),
                    document_id=item.get("document_id") or item.get("id"),
                    document_name=item.get("document_name") or item.get("source"),
                    chunk_id=item.get("chunk_id"),
                )
            )
    return evidence_items


_default_retriever: Optional[EvidenceRetriever] = None


def get_default_retriever() -> EvidenceRetriever:
    """Acquire the default EvidenceRetriever, using RetrievalOrchestrator preloaded with knowledge documents."""
    global _default_retriever
    if _default_retriever is None:
        try:
            from app.retrieval.orchestrator import RetrievalOrchestrator

            _default_retriever = RetrievalOrchestrator()
        except Exception as e:
            logger.error("Failed to load RetrievalOrchestrator: %s; falling back to StubRetriever", e)
            _default_retriever = StubRetriever()
    return _default_retriever
