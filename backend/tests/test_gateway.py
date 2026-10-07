import unittest
from unittest.mock import MagicMock

import httpx

from app.core.exceptions import (
    LLMAPIError,
    LLMConfigurationError,
    LLMQuotaExceededError,
    LLMResponseMalformedError,
    LLMTimeoutError,
)
from app.llm.gemini import GeminiGateway, extract_json_from_text


class TestLLMGateway(unittest.TestCase):
    def test_missing_api_key_raises_configuration_error(self):
        gw = GeminiGateway(api_key="")
        with self.assertRaises(LLMConfigurationError):
            gw.generate_text("test prompt")

    def test_extract_json_plain(self):
        raw = '{"key": "value", "list": [1, 2, 3]}'
        res = extract_json_from_text(raw)
        self.assertEqual(res, {"key": "value", "list": [1, 2, 3]})

    def test_extract_json_markdown_wrapped(self):
        raw = "```json\n[{\"id\": \"c1\", \"text\": \"Paris is the capital of France.\"}]\n```"
        res = extract_json_from_text(raw)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["id"], "c1")

    def test_extract_json_empty_raises(self):
        with self.assertRaises(LLMResponseMalformedError):
            extract_json_from_text("   ")

    def test_extract_json_invalid_raises(self):
        with self.assertRaises(LLMResponseMalformedError):
            extract_json_from_text("This is not JSON at all.")

    def test_generate_text_mocked_success(self):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Hello world response"
        mock_client.models.generate_content.return_value = mock_response

        gw = GeminiGateway(api_key="mock_key", client=mock_client)
        result = gw.generate_text("say hello")
        self.assertEqual(result, "Hello world response")

    def test_generate_json_mocked_success(self):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = '{"status": "ok", "value": 42}'
        mock_client.models.generate_content.return_value = mock_response

        gw = GeminiGateway(api_key="mock_key", client=mock_client)
        result = gw.generate_json("get data")
        self.assertEqual(result, {"status": "ok", "value": 42})

    def test_generate_text_mocked_timeout(self):
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = TimeoutError("Timed out")

        gw = GeminiGateway(api_key="mock_key", client=mock_client)
        with self.assertRaises(LLMTimeoutError):
            gw.generate_text("slow call")

    def test_generate_text_mocked_quota(self):
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = Exception("429 RESOURCE_EXHAUSTED: quota exceeded")

        gw = GeminiGateway(api_key="mock_key", client=mock_client)
        with self.assertRaises(LLMQuotaExceededError):
            gw.generate_text("rate limited")

    def test_generate_text_mocked_api_error(self):
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = Exception("500 Internal Server Error")

        gw = GeminiGateway(api_key="mock_key", client=mock_client)
        with self.assertRaises(LLMAPIError):
            gw.generate_text("broken")


if __name__ == "__main__":
    unittest.main()
