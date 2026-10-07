from pathlib import Path


class PDFExtractor:
    """
    Extracts text from PDF documents while preserving page boundaries.
    """

    def extract(self, file_path: str | Path) -> list[dict]:
        """
        Extract text from each page of a PDF.

        Returns:
            A list of dictionaries containing page number and extracted text.
        """

        from pypdf import PdfReader

        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"PDF not found: {path}")

        if path.suffix.lower() != ".pdf":
            raise ValueError(f"Expected a PDF file, got: {path.suffix}")

        reader = PdfReader(str(path))

        pages = []

        for page_number, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""

            text = text.strip()

            if text:
                pages.append(
                    {
                        "page_number": page_number,
                        "text": text,
                    }
                )

        return pages