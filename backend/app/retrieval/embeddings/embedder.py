from typing import Sequence


class Embedder:
    """
    Converts text into vector embeddings.

    The actual embedding model is loaded lazily so importing
    the retrieval package does not immediately require a model.
    """

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
    ):
        self.model_name = model_name
        self._model = None

    @property
    def model(self):
        """
        Load the embedding model only when it is first needed.
        """
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:
                raise RuntimeError(
                    "sentence-transformers is required for embeddings. "
                    "Install it with: pip install sentence-transformers"
                ) from exc

            self._model = SentenceTransformer(self.model_name)

        return self._model

    def embed(
        self,
        texts: Sequence[str],
    ) -> list[list[float]]:
        """
        Generate embeddings for multiple text strings.
        """

        if not texts:
            return []

        cleaned_texts = [
            text.strip()
            for text in texts
            if text and text.strip()
        ]

        if not cleaned_texts:
            return []

        embeddings = self.model.encode(
            cleaned_texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        return embeddings.tolist()

    def embed_one(self, text: str) -> list[float]:
        """
        Generate an embedding for a single text string.
        """

        if not text or not text.strip():
            raise ValueError("Text cannot be empty.")

        return self.embed([text])[0]