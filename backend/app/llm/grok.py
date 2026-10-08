import logging
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.core.exceptions import (
    LLMAPIError,
    LLMConfigurationError,
    LLMQuotaExceededError,
    LLMResponseMalformedError,
    LLMTimeoutError,
)
from app.llm.gateway import LLMGateway
from app.llm.gemini import extract_json_from_text

logger = logging.getLogger(__name__)


class GrokGateway(LLMGateway):
    """xAI Grok implementation of LLMGateway using the official OpenAI-compatible REST API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        client: Optional[httpx.Client] = None,
    ):
        raw_key = api_key if api_key is not None else settings.XAI_API_KEY
        self.api_key = raw_key.strip() if raw_key else ""
        self.model_name = (model_name or settings.GROK_MODEL).strip()
        self.base_url = (base_url or settings.XAI_BASE_URL).rstrip("/")
        self.timeout = timeout if timeout is not None else settings.LLM_TIMEOUT_SECONDS
        self._client = client

    def _get_client(self) -> httpx.Client:
        if self._client is not None:
            return self._client

        if not self.api_key:
            raise LLMConfigurationError(
                "XAI_API_KEY is not configured. Set the XAI_API_KEY environment variable."
            )

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=self.timeout,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )
        return self._client

    def _build_messages(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> List[Dict[str, str]]:
        messages = []
        if system_instruction and system_instruction.strip():
            messages.append({"role": "system", "content": system_instruction.strip()})
        messages.append({"role": "user", "content": prompt})
        return messages

    def _execute_chat_completion(self, payload: Dict[str, Any]) -> str:
        """Send chat completion request to xAI endpoint with robust error mapping."""
        client = self._get_client()
        endpoint = f"{self.base_url}/chat/completions"

        # Ensure authorization header is set if custom client was injected without default headers
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key and "Authorization" not in client.headers:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            response = client.post(endpoint, json=payload, headers=headers)
        except (httpx.TimeoutException, TimeoutError) as e:
            logger.warning("Grok API call timed out: %s", e)
            raise LLMTimeoutError(f"xAI Grok API request timed out after {self.timeout}s") from e
        except Exception as e:
            logger.error("Network or connection error communicating with xAI API: %s", e)
            raise LLMAPIError(f"Failed to communicate with xAI API: {type(e).__name__}") from e

        # Handle HTTP error statuses
        if response.status_code == 401:
            logger.error("xAI authentication failed (HTTP 401)")
            raise LLMConfigurationError("xAI authentication failed: Invalid or unauthorized XAI_API_KEY.")

        if response.status_code == 403:
            detail = ""
            try:
                err_data = response.json()
                detail = err_data.get("error") or err_data.get("message") or ""
            except Exception:
                detail = response.text[:200]
            logger.error("xAI access forbidden (HTTP 403): %s", detail)
            if "credit" in detail.lower() or "license" in detail.lower() or "permission-denied" in detail.lower():
                raise LLMQuotaExceededError(
                    f"xAI quota/license error (HTTP 403): {detail}. Please add credits at console.x.ai."
                )
            raise LLMConfigurationError(f"xAI authentication failed: {detail or 'Access denied'}")

        if response.status_code == 429:
            logger.warning("xAI rate limit / quota exceeded (HTTP 429)")
            raise LLMQuotaExceededError("xAI API rate limit or quota exceeded.")

        if response.status_code >= 400:
            error_body = response.text[:300]
            logger.error("xAI API error (HTTP %d): %s", response.status_code, error_body)
            raise LLMAPIError(f"xAI API returned HTTP {response.status_code}")

        # Parse JSON response envelope
        try:
            data = response.json()
        except Exception as e:
            logger.error("Failed to parse JSON response envelope from xAI: %s", e)
            raise LLMResponseMalformedError("xAI returned an unparseable response envelope") from e

        choices = data.get("choices")
        if not choices or not isinstance(choices, list) or len(choices) == 0:
            raise LLMResponseMalformedError("xAI returned no choices in response")

        message = choices[0].get("message")
        if not message or not isinstance(message, dict):
            raise LLMResponseMalformedError("xAI response choice missing message structure")

        content = message.get("content")
        if not content or not str(content).strip():
            raise LLMResponseMalformedError("xAI returned an empty message content")

        return str(content).strip()

    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> str:
        temp = temperature if temperature is not None else settings.LLM_TEMPERATURE
        messages = self._build_messages(prompt, system_instruction)
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temp,
        }
        return self._execute_chat_completion(payload)

    def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        schema: Optional[Any] = None,
    ) -> Any:
        messages = self._build_messages(prompt, system_instruction)
        payload: Dict[str, Any] = {
            "model": self.model_name,
            "messages": messages,
            "temperature": 0.0,
            "response_format": {"type": "json_object"},
        }
        content = self._execute_chat_completion(payload)
        return extract_json_from_text(content)


# Alias for explicit naming
GrokProvider = GrokGateway
