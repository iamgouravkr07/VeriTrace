from pathlib import Path

from .pdf.retriever import PDFRetriever
from .ranking.reranker import Reranker
from .web.retriever import WebRetriever


class RetrievalOrchestrator:
    """
    Coordinates evidence retrieval from PDF and web sources.
    """

    def __init__(
        self,
        top_k: int = 8,
    ):
        self.pdf_retriever = PDFRetriever()
        self.web_retriever = WebRetriever()
        self.reranker = Reranker(
            top_k=top_k,
        )

    def ingest_pdf(
        self,
        file_path: str | Path,
    ) -> int:
        """
        Ingest a PDF into the retrieval system.

        Returns:
            Number of chunks indexed.
        """

        chunks = self.pdf_retriever.ingest(
            file_path,
        )

        return len(chunks)

    def retrieve(
        self,
        claim: str,
        include_web: bool = True,
        top_k: int = 8,
    ) -> list[dict]:
        """
        Retrieve and rank evidence for a claim.

        Sources:
            - Indexed PDFs
            - Web search results
        """

        if not claim or not claim.strip():
            return []

        evidence: list[dict] = []

        # PDF evidence
        pdf_evidence = self.pdf_retriever.retrieve(
            query=claim,
            top_k=top_k,
        )

        evidence.extend(
            pdf_evidence,
        )

        # Web evidence
        if include_web:
            web_evidence = self.web_retriever.retrieve(
                query=claim,
                top_k=top_k,
            )

            evidence.extend(
                web_evidence,
            )

        # Combine, deduplicate, and rank
        return self.reranker.rerank(
            evidence,
            top_k=top_k,
        )