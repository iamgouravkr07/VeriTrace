import json
import logging
import re
from typing import Any, Optional

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

logger = logging.getLogger(__name__)


def extract_json_from_text(text: str) -> Any:
    """Robustly parse JSON from raw LLM text output.

    Handles markdown code fences (```json ... ```) and leading/trailing whitespace.
    """
    if not text or not text.strip():
        raise LLMResponseMalformedError("Received empty response from LLM")

    cleaned = text.strip()

    # Match markdown code block ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if match:
        cleaned = match.group(1).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Try finding the first '[' or '{' and last ']' or '}'
        start_bracket = min(
            [i for i in [cleaned.find("{"), cleaned.find("[")] if i != -1],
            default=-1,
        )
        end_bracket = max(
            [cleaned.rfind("}"), cleaned.rfind("]")],
            default=-1,
        )
        if start_bracket != -1 and end_bracket != -1 and end_bracket > start_bracket:
            substring = cleaned[start_bracket : end_bracket + 1]
            try:
                return json.loads(substring)
            except json.JSONDecodeError:
                pass
        raise LLMResponseMalformedError(
            f"Failed to parse JSON from LLM response: {str(e)}"
        ) from e


class GeminiGateway(LLMGateway):
    """Google Gemini implementation of LLMGateway using the official google-genai SDK."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout: Optional[float] = None,
        client: Optional[Any] = None,
    ):
        raw_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.api_key = raw_key.strip() if raw_key else ""
        raw_model = (model_name or settings.GEMINI_MODEL).strip()
        if raw_model.startswith("models/"):
            raw_model = raw_model[len("models/"):]
        self.model_name = raw_model
        self.timeout = timeout if timeout is not None else settings.LLM_TIMEOUT_SECONDS
        self._client = client

    def _get_client(self):
        if self._client is not None:
            return self._client

        if not self.api_key:
            raise LLMConfigurationError(
                "GEMINI_API_KEY is not configured. Set the GEMINI_API_KEY environment variable."
            )

        try:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
            return self._client
        except Exception as e:
            logger.error("Failed to initialize Google GenAI client: %s", e)
            raise LLMConfigurationError(f"Could not initialize Gemini client: {e}") from e

    def _call_generate_content(self, client: Any, contents: Any, config: Any) -> Any:
        try:
            return client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config,
            )
        except Exception as e:
            err_str = str(e)
            is_recoverable_model_error = (
                "404" in err_str
                or "503" in err_str
                or "429" in err_str
                or "RESOURCE_EXHAUSTED" in err_str
                or "quota" in err_str.lower()
                or "NOT_FOUND" in err_str
                or "UNAVAILABLE" in err_str
                or "no longer available" in err_str.lower()
            )
            if is_recoverable_model_error:
                fallback_model = (
                    "gemini-3.5-flash"
                    if self.model_name in ("gemini-flash-latest", "gemini-3.8-flash")
                    else "gemini-flash-lite-latest"
                )
                logger.warning(
                    "Gemini model '%s' failed (%s); retrying with fallback model '%s'",
                    self.model_name,
                    err_str[:120],
                    fallback_model,
                )
                return client.models.generate_content(
                    model=fallback_model,
                    contents=contents,
                    config=config,
                )
            raise

    def _map_error(self, e: Exception) -> Exception:
        if isinstance(e, (LLMResponseMalformedError, LLMQuotaExceededError, LLMTimeoutError, LLMConfigurationError)):
            return e
        if isinstance(e, (httpx.TimeoutException, TimeoutError)):
            logger.warning("Gemini API call timed out: %s", e)
            return LLMTimeoutError(f"Gemini API request timed out after {self.timeout}s")

        error_str = str(e)
        logger.error("Gemini API error encountered: %s", error_str)

        if "401" in error_str or "403" in error_str or "API_KEY_INVALID" in error_str or "PERMISSION_DENIED" in error_str:
            return LLMConfigurationError("Gemini authentication failed: Invalid or unauthorized GEMINI_API_KEY.")

        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
            return LLMQuotaExceededError(f"Gemini quota exceeded: {error_str}")

        return LLMAPIError(f"Gemini API error: {error_str}")

    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> str:
        client = self._get_client()
        temp = temperature if temperature is not None else settings.LLM_TEMPERATURE

        try:
            from google.genai import types

            config = types.GenerateContentConfig(
                temperature=temp,
                system_instruction=system_instruction if system_instruction else None,
            )

            response = self._call_generate_content(
                client=client,
                contents=prompt,
                config=config,
            )

            if not response or not response.text:
                raise LLMResponseMalformedError("Gemini returned an empty text response")

            return response.text.strip()

        except Exception as e:
            raise self._map_error(e) from e

    def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        schema: Optional[Any] = None,
    ) -> Any:
        client = self._get_client()

        try:
            from google.genai import types

            config_kwargs = {
                "temperature": 0.0,
                "response_mime_type": "application/json",
            }
            if system_instruction:
                config_kwargs["system_instruction"] = system_instruction
            if schema is not None:
                config_kwargs["response_schema"] = schema

            config = types.GenerateContentConfig(**config_kwargs)

            response = self._call_generate_content(
                client=client,
                contents=prompt,
                config=config,
            )

            if not response or not response.text:
                raise LLMResponseMalformedError("Gemini returned an empty JSON response")

            return extract_json_from_text(response.text)

        except Exception as e:
            raise self._map_error(e) from e


# Alias for explicit naming
GeminiProvider = GeminiGateway
