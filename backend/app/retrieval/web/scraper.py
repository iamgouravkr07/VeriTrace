from dataclasses import dataclass
from typing import Optional
import httpx
import logging

logger = logging.getLogger(__name__)


@dataclass
class ScrapedPage:
    url: str
    title: str
    text: str


class WebScraper:
    """Scrapes raw web pages for retrieval evidence passages."""

    def __init__(self, timeout: float = 5.0):
        self.timeout = timeout

    def scrape(self, url: str) -> Optional[ScrapedPage]:
        """Safely fetch and extract text from a web page."""
        if not url or not url.startswith(("http://", "https://")):
            return None

        try:
            with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    text = resp.text[:5000]
                    return ScrapedPage(url=url, title=url, text=text)
        except Exception as e:
            logger.debug("Web scrape skipped for %s: %s", url, e)

        return None
