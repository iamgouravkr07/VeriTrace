from dataclasses import dataclass, field
import math
import re
from typing import Any, Dict, List, Optional, Sequence, Union


@dataclass
class VectorDocument:
    """Document snippet stored with text, metadata, and optional vector embedding."""
    document_id: str
    text: str
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


def _tokenize(text: str) -> List[str]:
    """Lowercase and extract alphanumeric word tokens."""
    return re.findall(r"\b[a-zA-Z0-9_]+\b", text.lower())


class VectorStore:
    """In-memory document vector and lexical retrieval store.

    Provides hybrid semantic search:
    - If query and document embeddings are available, computes cosine similarity.
    - If text query is provided or embeddings are absent, computes BM25 token relevance.
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self._documents: List[VectorDocument] = []
        self.k1 = k1
        self.b = b

    def clear(self) -> None:
        """Remove all documents from the store."""
        self._documents.clear()

    def add(self, documents: Sequence[VectorDocument]) -> None:
        """Add documents to the store."""
        for doc in documents:
            if doc.text and doc.text.strip():
                self._documents.append(doc)

    @property
    def documents(self) -> List[VectorDocument]:
        return list(self._documents)

    def __len__(self) -> int:
        return len(self._documents)

    def search(
        self,
        query: Union[str, Sequence[float]],
        query_embedding: Optional[Sequence[float]] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Search the store for the top-k most relevant documents.

        Args:
            query: Query text string or query vector.
            query_embedding: Optional embedding vector if query is a text string.
            top_k: Maximum number of results to return.
        """
        if not self._documents:
            return []

        # 1. Vector cosine similarity path if embedding is supplied
        target_vector = None
        if isinstance(query, (list, tuple)) and query and isinstance(query[0], (int, float)):
            target_vector = query
        elif query_embedding is not None and len(query_embedding) > 0:
            target_vector = query_embedding

        if target_vector is not None:
            vector_results = self._search_vector(target_vector, top_k)
            if vector_results:
                return vector_results

        # 2. Text BM25 lexical search path
        query_text = query if isinstance(query, str) else ""
        return self._search_bm25(query_text, top_k)

    def _search_vector(
        self,
        query_vec: Sequence[float],
        top_k: int,
    ) -> List[Dict[str, Any]]:
        """Compute cosine similarity against document embeddings."""
        q_norm = math.sqrt(sum(x * x for x in query_vec))
        if q_norm == 0.0:
            return []

        scored = []
        for doc in self._documents:
            if not doc.embedding:
                continue
            d_vec = doc.embedding
            if len(d_vec) != len(query_vec):
                continue

            dot = sum(a * b for a, b in zip(query_vec, d_vec))
            d_norm = math.sqrt(sum(x * x for x in d_vec))
            if d_norm > 0.0:
                sim = dot / (q_norm * d_norm)
                # Map [-1.0, 1.0] to [0.0, 1.0]
                norm_score = max(0.0, min(1.0, (sim + 1.0) / 2.0))
            else:
                norm_score = 0.0

            scored.append((norm_score, doc))

        if not scored:
            return []

        scored.sort(key=lambda x: x[0], reverse=True)
        return [self._format_result(doc, score) for score, doc in scored[:top_k]]

    def _search_bm25(self, query_text: str, top_k: int) -> List[Dict[str, Any]]:
        """Compute BM25 relevance score for query text across all documents."""
        q_tokens = _tokenize(query_text)
        if not q_tokens or not self._documents:
            return []

        n_docs = len(self._documents)
        doc_tokens_list = [_tokenize(doc.text) for doc in self._documents]
        doc_lens = [len(tokens) for tokens in doc_tokens_list]
        avg_doc_len = (sum(doc_lens) / n_docs) if n_docs > 0 else 1.0

        # Term document frequency
        df: Dict[str, int] = {}
        for tokens in doc_tokens_list:
            unique_terms = set(tokens)
            for term in unique_terms:
                df[term] = df.get(term, 0) + 1

        # Calculate BM25 score for each document
        scored = []
        for idx, doc in enumerate(self._documents):
            tokens = doc_tokens_list[idx]
            d_len = doc_lens[idx]
            if d_len == 0:
                continue

            tf_map: Dict[str, int] = {}
            for t in tokens:
                tf_map[t] = tf_map.get(t, 0) + 1

            doc_score = 0.0
            matched_terms = 0
            for q_term in q_tokens:
                if q_term not in tf_map:
                    continue
                matched_terms += 1
                doc_freq = df.get(q_term, 1)
                # Probabilistic IDF with smoothing
                idf = math.log(1.0 + (n_docs - doc_freq + 0.5) / (doc_freq + 0.5))
                if idf < 0:
                    idf = 0.01

                tf = tf_map[q_term]
                numerator = tf * (self.k1 + 1.0)
                denominator = tf + self.k1 * (1.0 - self.b + self.b * (d_len / avg_doc_len))
                term_score = idf * (numerator / denominator)
                doc_score += term_score

            if doc_score > 0.0:
                # Normalize BM25 score smoothly into [0.0, 1.0]
                # High coverage boost: if most query terms match, scale higher
                coverage = matched_terms / len(q_tokens)
                normalized = 1.0 - math.exp(-doc_score / (2.0 + len(q_tokens)))
                final_score = round(max(0.1, min(1.0, normalized * (0.5 + 0.5 * coverage))), 4)
                scored.append((final_score, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [self._format_result(doc, score) for score, doc in scored[:top_k]]

    def _format_result(self, doc: VectorDocument, score: float) -> Dict[str, Any]:
        source = (
            doc.metadata.get("source")
            or doc.metadata.get("document_name")
            or doc.metadata.get("title")
            or "Verified Document"
        )
        return {
            "id": doc.document_id,
            "document_id": doc.metadata.get("document_id") or doc.document_id,
            "document_name": doc.metadata.get("document_name") or source,
            "chunk_id": doc.metadata.get("chunk_id") or doc.document_id,
            "text": doc.text,
            "source": source,
            "url": doc.metadata.get("url"),
            "page": doc.metadata.get("page") or doc.metadata.get("page_number"),
            "relevance_score": round(max(0.0, min(1.0, score)), 4),
            "metadata": doc.metadata,
        }
