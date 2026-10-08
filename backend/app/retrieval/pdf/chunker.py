import re
from typing import Any, Dict, List, Optional


class TextChunker:
    """Chunks long texts or documents into bounded passages for indexing and retrieval."""

    def __init__(self, default_chunk_size: int = 300, default_overlap: int = 50):
        self.default_chunk_size = default_chunk_size
        self.default_overlap = default_overlap

    def chunk_text(
        self,
        text: str,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Split document text into clean, overlapping passages with metadata."""
        if not text or not text.strip():
            return []

        size = chunk_size or self.default_chunk_size
        overlap = chunk_overlap or self.default_overlap
        base_meta = dict(metadata) if metadata else {}

        cleaned = text.strip()
        # Split on paragraph breaks first if available
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", cleaned) if p.strip()]

        chunks: List[Dict[str, Any]] = []
        chunk_index = 1

        for para in paragraphs:
            words = para.split()
            if len(words) <= size:
                chunk_dict = {
                    "chunk_id": f"chunk_{chunk_index}",
                    "text": para,
                    "metadata": {**base_meta, "chunk_index": chunk_index},
                }
                chunks.append(chunk_dict)
                chunk_index += 1
            else:
                # Sliding window of words
                start = 0
                while start < len(words):
                    end = min(len(words), start + size)
                    window_text = " ".join(words[start:end])
                    chunks.append(
                        {
                            "chunk_id": f"chunk_{chunk_index}",
                            "text": window_text,
                            "metadata": {**base_meta, "chunk_index": chunk_index},
                        }
                    )
                    chunk_index += 1
                    if end >= len(words):
                        break
                    start += max(1, size - overlap)

        return chunks
