from ..embeddings.embedder import Embedder
from ..embeddings.vector_store import VectorDocument, VectorStore
from .scraper import WebScraper
from .search import SearchResult, WebSearch


class WebRetriever:
    """
    Retrieves and ranks evidence from web sources.
    """

    def __init__(
        self,
        embedding_model: str = "all-MiniLM-L6-v2",
    ):
        self.searcher = WebSearch()
        self.scraper = WebScraper()
        self.embedder = Embedder(
            model_name=embedding_model,
        )
        self.vector_store = VectorStore()

        self._metadata: dict[str, dict] = {}

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
    ) -> list[dict]:
        """
        Search the web, scrape relevant pages, embed their content,
        and return the most semantically relevant evidence.
        """

        if not query or not query.strip():
            return []

        search_results = self.searcher.search(
            query=query,
            max_results=max(top_k * 2, 5),
        )

        if not search_results:
            return []

        documents = []
        texts = []
        metadata = []

        for index, result in enumerate(search_results):
            page = self.scraper.scrape(result.url)

            if page is None or not page.text:
                continue

            document_id = f"web_{index}"

            texts.append(page.text)

            metadata.append(
                {
                    "id": document_id,
                    "title": page.title or result.title,
                    "url": result.url,
                    "source_type": "web",
                }
            )

        if not texts:
            return []

        embeddings = self.embedder.embed(texts)

        for text, embedding, item in zip(
            texts,
            embeddings,
            metadata,
        ):
            documents.append(
                VectorDocument(
                    document_id=item["id"],
                    text=text,
                    embedding=embedding,
                    metadata=item,
                )
            )

            self._metadata[item["id"]] = item

        self.vector_store.clear()
        self.vector_store.add(documents)

        query_embedding = self.embedder.embed_one(query)

        results = self.vector_store.search(
            query_embedding=query_embedding,
            top_k=top_k,
        )

        evidence = []

        for document, score in results:
            item = self._metadata.get(
                document.document_id,
                {},
            )

            evidence.append(
                {
                    "id": document.document_id,
                    "text": document.text,
                    "source_type": "web",
                    "title": item.get("title"),
                    "url": item.get("url"),
                    "relevance_score": round(
                        score,
                        4,
                    ),
                }
            )

        return evidence