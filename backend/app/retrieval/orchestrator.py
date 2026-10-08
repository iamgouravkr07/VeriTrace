import logging
from pathlib import Path
from typing import Any, List, Optional, Union

from .pdf.retriever import PDFRetriever
from .ranking.reranker import Reranker
from .web.retriever import WebRetriever

logger = logging.getLogger(__name__)


class RetrievalOrchestrator:
    """Coordinates evidence retrieval from local indexed documents (PDF/Text) and web sources.

    Implements both Member 3's retrieve() contract and Member 1's retrieve_evidence() protocol.
    """

    def __init__(
        self,
        top_k: Optional[int] = None,
        candidate_k: Optional[int] = None,
        min_relevance: Optional[float] = None,
        documents_dir: Optional[Union[str, Path]] = None,
        auto_load_documents: bool = True,
    ):
        from app.core.config import settings

        self.candidate_k = candidate_k if candidate_k is not None else getattr(settings, "RETRIEVAL_TOP_K_CANDIDATES", 10)
        self.top_k = top_k if top_k is not None else getattr(settings, "RETRIEVAL_TOP_K_EVIDENCE", 3)
        self.min_relevance = min_relevance if min_relevance is not None else getattr(settings, "RETRIEVAL_MIN_RELEVANCE", 0.15)

        self.pdf_retriever = PDFRetriever()
        self.web_retriever = WebRetriever()
        self.reranker = Reranker(top_k=self.top_k, min_relevance_threshold=self.min_relevance)

        if auto_load_documents:
            self._load_default_documents(documents_dir)

    def _find_documents_dir(self) -> Optional[Path]:
        """Locate project knowledge base documents directory."""
        candidates = [
            Path("documents"),
            Path(__file__).resolve().parent.parent.parent.parent / "documents",
            Path(__file__).resolve().parent.parent.parent / "documents",
        ]
        for c in candidates:
            if c.is_dir():
                return c
        return None

    def _load_default_documents(self, custom_dir: Optional[Union[str, Path]] = None) -> int:
        """Automatically load and index documents from the knowledge base directory."""
        target_dir = Path(custom_dir) if custom_dir else self._find_documents_dir()
        if not target_dir or not target_dir.is_dir():
            logger.debug("No knowledge base documents directory found to auto-load.")
            return 0

        indexed_count = 0
        supported_extensions = {".txt", ".md", ".pdf", ".json"}
        for file_path in target_dir.glob("*.*"):
            if file_path.suffix.lower() in supported_extensions and not file_path.name.startswith("."):
                chunks = self.pdf_retriever.ingest(file_path)
                indexed_count += len(chunks)

        logger.info("RetrievalOrchestrator indexed %d chunks from %s", indexed_count, target_dir)
        return indexed_count

    def ingest_pdf(
        self,
        file_path: Union[str, Path],
    ) -> int:
        """Ingest a PDF or document into the retrieval system."""
        chunks = self.pdf_retriever.ingest(file_path)
        return len(chunks)

    def retrieve(
        self,
        claim: str,
        include_web: bool = False,
        top_k: Optional[int] = None,
        candidate_k: Optional[int] = None,
        min_score: Optional[float] = None,
    ) -> list[dict]:
        """Retrieve candidate evidence (Top-K=10) and rank strongest passages (Top-K=3)."""
        if not claim or not claim.strip():
            return []

        c_limit = candidate_k if candidate_k is not None else self.candidate_k
        out_limit = top_k if top_k is not None else self.top_k
        threshold = min_score if min_score is not None else self.min_relevance
        evidence: list[dict] = []

        # 1. Local indexed document evidence candidates (Top-K = 10)
        pdf_evidence = self.pdf_retriever.retrieve(
            query=claim,
            top_k=c_limit,
        )
        evidence.extend(pdf_evidence)

        # 2. Web search evidence if requested
        if include_web:
            web_evidence = self.web_retriever.retrieve(
                query=claim,
                top_k=c_limit,
            )
            evidence.extend(web_evidence)

        # 3. Combine, deduplicate, boost, threshold filter, and rank (Top-K = 3)
        return self.reranker.rerank(
            evidence,
            top_k=out_limit,
            min_score=threshold,
            query=claim,
        )

    def retrieve_evidence(
        self,
        claim: str,
        top_k: Optional[int] = None,
    ) -> Any:
        """Member 1 EvidenceRetriever protocol method returning validated EvidenceItem models."""
        from app.retrieval.interface import normalize_retrieval_output

        raw_results = self.retrieve(
            claim=claim,
            include_web=False,
            top_k=top_k if top_k is not None else self.top_k,
        )
        return normalize_retrieval_output(raw_results)

    def retrieve_evidence_timed(
        self,
        claim: str,
        top_k: Optional[int] = None,
    ) -> tuple[Any, float, float]:
        """Retrieve evidence returning (evidence_items, retrieval_ms, reranking_ms)."""
        import time
        from app.retrieval.interface import normalize_retrieval_output

        if not claim or not claim.strip():
            return [], 0.0, 0.0

        c_limit = self.candidate_k
        out_limit = top_k if top_k is not None else self.top_k
        threshold = self.min_relevance

        # Candidate retrieval
        t0 = time.perf_counter()
        candidates = self.pdf_retriever.retrieve(query=claim, top_k=c_limit)
        retrieval_ms = round((time.perf_counter() - t0) * 1000.0, 3)

        # Reranking & threshold filtering
        t1 = time.perf_counter()
        ranked = self.reranker.rerank(
            candidates,
            top_k=out_limit,
            min_score=threshold,
            query=claim,
        )
        reranking_ms = round((time.perf_counter() - t1) * 1000.0, 3)

        return normalize_retrieval_output(ranked), retrieval_ms, reranking_ms
