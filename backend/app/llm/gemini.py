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
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL
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

            response = client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config,
            )

            if not response or not response.text:
                raise LLMResponseMalformedError("Gemini returned an empty text response")

            return response.text.strip()

        except LLMResponseMalformedError:
            raise
        except (httpx.TimeoutException, TimeoutError) as e:
            logger.warning("Gemini API call timed out: %s", e)
            raise LLMTimeoutError(f"Gemini API request timed out after {self.timeout}s") from e
        except Exception as e:
            error_str = str(e)
            logger.error("Gemini API error encountered: %s", error_str)

            # Detect quota / rate-limiting errors
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
                raise LLMQuotaExceededError(f"Gemini quota exceeded: {error_str}") from e

            # Other SDK / API errors
            raise LLMAPIError(f"Gemini API error: {error_str}") from e

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

            response = client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config,
            )

            if not response or not response.text:
                raise LLMResponseMalformedError("Gemini returned an empty JSON response")

            return extract_json_from_text(response.text)

        except (LLMResponseMalformedError, LLMQuotaExceededError, LLMTimeoutError):
            raise
        except (httpx.TimeoutException, TimeoutError) as e:
            logger.warning("Gemini JSON API call timed out: %s", e)
            raise LLMTimeoutError(f"Gemini API request timed out after {self.timeout}s") from e
        except Exception as e:
            error_str = str(e)
            logger.error("Gemini API error during JSON generation: %s", error_str)

            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
                raise LLMQuotaExceededError(f"Gemini quota exceeded: {error_str}") from e

            raise LLMAPIError(f"Gemini API error: {error_str}") from e


# Alias for explicit naming
GeminiProvider = GeminiGateway
