from abc import ABC, abstractmethod
import logging
from typing import Any, Optional

from app.core.config import settings
from app.core.exceptions import LLMConfigurationError, LLMError

logger = logging.getLogger(__name__)


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


class FallbackLLMGateway(LLMGateway):
    """Decorator gateway providing explicit, non-silent fallback between providers when configured."""

    def __init__(self, primary: LLMGateway, fallback: Optional[LLMGateway] = None):
        self.primary = primary
        self.fallback = fallback

    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> str:
        try:
            return self.primary.generate_text(prompt, system_instruction, temperature)
        except LLMError as e:
            if self.fallback:
                logger.warning(
                    "Primary LLM provider failed with %s; failing over to configured fallback provider",
                    type(e).__name__,
                )
                return self.fallback.generate_text(prompt, system_instruction, temperature)
            raise

    def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        schema: Optional[Any] = None,
    ) -> Any:
        try:
            return self.primary.generate_json(prompt, system_instruction, schema)
        except LLMError as e:
            if self.fallback:
                logger.warning(
                    "Primary LLM provider failed with %s; failing over to configured fallback provider for JSON",
                    type(e).__name__,
                )
                return self.fallback.generate_json(prompt, system_instruction, schema)
            raise


def create_provider_gateway(provider_name: str) -> LLMGateway:
    """Instantiate a concrete LLM gateway for the specified provider name."""
    norm = (provider_name or "").strip().lower()
    if norm == "gemini":
        from app.llm.gemini import GeminiGateway

        return GeminiGateway()
    elif norm == "grok":
        from app.llm.grok import GrokGateway

        return GrokGateway()
    else:
        raise LLMConfigurationError(
            f"Unsupported LLM provider '{provider_name}'. Supported providers are: 'gemini', 'grok'."
        )


def get_llm_gateway(
    provider: Optional[str] = None,
    fallback_provider: Optional[str] = None,
) -> LLMGateway:
    """Factory to acquire the configured LLM gateway.

    Selects the primary provider from settings.LLM_PROVIDER (or override).
    If settings.LLM_FALLBACK_PROVIDER is set, wraps it in FallbackLLMGateway.
    """
    selected_provider = provider if provider is not None else settings.LLM_PROVIDER
    primary = create_provider_gateway(selected_provider)

    fb_name = fallback_provider if fallback_provider is not None else settings.LLM_FALLBACK_PROVIDER
    if fb_name and fb_name.strip().lower() != selected_provider.strip().lower():
        fallback_gateway = create_provider_gateway(fb_name)
        return FallbackLLMGateway(primary=primary, fallback=fallback_gateway)

    return primary
