from dataclasses import dataclass
import re
from typing import Any, List, Optional


@dataclass
class RankedEvidence:
    """
    Evidence item with a final retrieval score.
    """

    evidence: dict[str, Any]
    score: float


class Reranker:
    """
    Combines retrieval results from multiple sources, removes duplicates,
    applies lightweight entity/numerical match boosts, enforces minimum relevance thresholds,
    and returns the strongest evidence passages.
    """

    def __init__(
        self,
        top_k: int = 3,
        min_relevance_threshold: float = 0.15,
    ):
        self.top_k = top_k
        self.min_relevance_threshold = min_relevance_threshold

    @staticmethod
    def _normalize_text(text: str) -> str:
        """
        Normalize text for duplicate detection.
        """
        return " ".join(text.lower().split())

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

    def _calculate_boost(self, query: str, text: str) -> float:
        """
        Lightweight heuristic boost for exact named entity and numerical/year matches.
        """
        if not query or not text:
            return 0.0

        boost = 0.0
        text_lower = text.lower()

        # 1. Exact entity match boost (capitalized words in query >= 3 chars)
        stop_words = {"the", "and", "that", "this", "what", "which", "where", "when", "why", "who", "how", "are", "is"}
        query_words = query.split()
        capitalized_entities = [
            w.strip(".,;:?!'\"()[]")
            for w in query_words
            if w and w[0].isupper() and len(w) >= 3 and w.lower() not in stop_words
        ]
        if capitalized_entities:
            matched_entities = sum(1 for ent in capitalized_entities if ent.lower() in text_lower)
            boost += 0.08 * (matched_entities / len(capitalized_entities))

        # 2. Number / year match boost (digits in query)
        numbers = re.findall(r"\b\d+\b", query)
        if numbers:
            matched_numbers = sum(1 for num in numbers if num in text)
            boost += 0.08 * (matched_numbers / len(numbers))

        return min(0.15, boost)

    def rerank(
        self,
        evidence: list[dict[str, Any]],
        top_k: int | None = None,
        min_score: float | None = None,
        query: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Rank evidence by relevance score + query boosts, enforce minimum relevance threshold,
        and return the strongest items.
        """
        if not evidence:
            return []

        unique_evidence = self.deduplicate(evidence)
        threshold = min_score if min_score is not None else self.min_relevance_threshold
        scored_items: list[dict[str, Any]] = []

        for item in unique_evidence:
            base_score = item.get("relevance_score", 0.0)
            try:
                base_score = float(base_score)
            except (TypeError, ValueError):
                base_score = 0.0

            boost = self._calculate_boost(query, item.get("text", "")) if query else 0.0
            final_score = round(max(0.0, min(1.0, base_score + boost)), 4)
            item["relevance_score"] = final_score

            # Filter candidates failing minimum relevance threshold
            if final_score >= threshold:
                scored_items.append(item)

        ranked = sorted(
            scored_items,
            key=lambda it: it["relevance_score"],
            reverse=True,
        )

        limit = top_k if top_k is not None else self.top_k
        return ranked[:limit]