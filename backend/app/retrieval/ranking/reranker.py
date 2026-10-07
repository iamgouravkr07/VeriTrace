from dataclasses import dataclass
from typing import Any


@dataclass
class RankedEvidence:
    """
    Evidence item with a final retrieval score.
    """

    evidence: dict[str, Any]
    score: float


class Reranker:
    """
    Combines retrieval results from multiple sources,
    removes duplicates, and returns the strongest evidence.
    """

    def __init__(
        self,
        top_k: int = 8,
    ):
        self.top_k = top_k

    @staticmethod
    def _normalize_text(text: str) -> str:
        """
        Normalize text for duplicate detection.
        """

        return " ".join(
            text.lower().split()
        )

    def deduplicate(
        self,
        evidence: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Remove exact/near-identical evidence based on normalized text.
        """

        seen: set[str] = set()
        unique: list[dict[str, Any]] = []

        for item in evidence:
            text = item.get("text", "")

            if not text:
                continue

            normalized = self._normalize_text(text)

            if normalized in seen:
                continue

            seen.add(normalized)
            unique.append(item)

        return unique

    def rerank(
        self,
        evidence: list[dict[str, Any]],
        top_k: int | None = None,
    ) -> list[dict[str, Any]]:
        """
        Rank evidence by relevance score and return the strongest items.
        """

        if not evidence:
            return []

        unique_evidence = self.deduplicate(evidence)

        for item in unique_evidence:
            score = item.get(
                "relevance_score",
                0.0,
            )

            try:
                item["relevance_score"] = float(score)
            except (TypeError, ValueError):
                item["relevance_score"] = 0.0

        ranked = sorted(
            unique_evidence,
            key=lambda item: item["relevance_score"],
            reverse=True,
        )

        limit = top_k if top_k is not None else self.top_k

        return ranked[:limit]