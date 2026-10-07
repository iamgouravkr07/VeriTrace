import re
from typing import List


def clean_text(text: str) -> str:
    """Normalize whitespace and strip leading/trailing spaces."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def split_sentences(text: str) -> List[str]:
    """Simple rule-based sentence tokenizer for fallback claim extraction."""
    if not text:
        return []
    cleaned = clean_text(text)
    # Split on sentence terminals followed by space or end of string
    raw_sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    sentences = [s.strip() for s in raw_sentences if s.strip()]
    return sentences
