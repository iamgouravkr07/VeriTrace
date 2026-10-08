import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from ..embeddings.vector_store import VectorDocument, VectorStore
from .chunker import TextChunker
from .extractor import PDFExtractor

logger = logging.getLogger(__name__)


class PDFRetriever:
    """Document retriever indexing PDFs and local text documents into an in-memory vector store."""

    def __init__(self, vector_store: Optional[VectorStore] = None, chunker: Optional[TextChunker] = None):
        self.vector_store = vector_store or VectorStore()
        self.chunker = chunker or TextChunker()
        self.extractor = PDFExtractor()

    def ingest(
        self,
        file_path: Union[str, Path],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Ingest a PDF or text document into the retrieval vector store."""
        path = Path(file_path)
        if not path.exists():
            logger.warning("Ingest target file does not exist: %s", path)
            return []

        doc_meta = dict(metadata) if metadata else {}
        doc_meta.setdefault("source", path.name)
        doc_meta.setdefault("document_name", path.name)
        doc_meta.setdefault("document_id", path.stem)
        doc_meta.setdefault("file_path", str(path))

        chunks: List[Dict[str, Any]] = []

        if path.suffix.lower() == ".pdf":
            try:
                pages = self.extractor.extract(path)
                for page in pages:
                    page_num = page.get("page_number", 1)
                    page_text = page.get("text", "")
                    page_meta = {**doc_meta, "page": page_num}
                    page_chunks = self.chunker.chunk_text(page_text, metadata=page_meta)
                    chunks.extend(page_chunks)
            except Exception as e:
                logger.warning("Failed to extract PDF %s via pypdf (%s); attempting raw text fallback", path, e)
                try:
                    raw_text = path.read_text(encoding="utf-8", errors="ignore")
                    chunks = self.chunker.chunk_text(raw_text, metadata=doc_meta)
                except Exception as inner_e:
                    logger.error("Could not read file %s: %s", path, inner_e)
                    return []
        else:
            # Handle .txt, .md, .json, etc.
            try:
                raw_text = path.read_text(encoding="utf-8", errors="ignore")
                chunks = self.chunker.chunk_text(raw_text, metadata=doc_meta)
            except Exception as e:
                logger.error("Failed to read text file %s: %s", path, e)
                return []

        # Convert chunk dicts into VectorDocument models and add to vector store
        docs = []
        for idx, ch in enumerate(chunks, start=len(self.vector_store) + 1):
            chunk_id = ch.get("chunk_id", f"chunk_{idx}")
            chunk_meta = dict(ch.get("metadata", {}))
            chunk_meta.setdefault("document_id", path.stem)
            chunk_meta.setdefault("document_name", path.name)
            chunk_meta.setdefault("chunk_id", chunk_id)
            chunk_meta.setdefault("source", path.name)

            vd = VectorDocument(
                document_id=f"{path.stem}_{idx}",
                text=ch["text"],
                metadata=chunk_meta,
            )
            docs.append(vd)

        self.vector_store.add(docs)
        logger.info("Ingested %d chunks from %s into PDFRetriever", len(docs), path.name)
        return chunks

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Retrieve most relevant chunks from indexed documents matching query."""
        if not query or not query.strip():
            return []
        return self.vector_store.search(query=query.strip(), top_k=top_k)
