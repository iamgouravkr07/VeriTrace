from abc import ABC, abstractmethod
from typing import Any, Optional


class LLMGateway(ABC):
    """Abstract interface for LLM operations.

    Decouples higher-level logic (e.g. claim extractor) from concrete LLM SDK implementations.
    """

    @abstractmethod
    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> str:
        """Generate text completion from LLM."""
        pass

    @abstractmethod
    def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        schema: Optional[Any] = None,
    ) -> Any:
        """Generate structured JSON completion parsed into Python dict/list."""
        pass
