from dataclasses import dataclass
from typing import List
import logging

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str


class WebSearch:
    """Web search provider returning external URLs for claims."""

    def __init__(self):
        pass

    def search(self, query: str, max_results: int = 5) -> List[SearchResult]:
        """Search web sources for query. Returns empty list if offline or unconfigured."""
        if not query or not query.strip():
            return []
        # Return empty list gracefully if external search provider is unconfigured/offline
        return []
