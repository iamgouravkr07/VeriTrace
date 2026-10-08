import unittest
from unittest.mock import MagicMock, patch

import httpx

from app.core.exceptions import (
    LLMAPIError,
    LLMConfigurationError,
    LLMQuotaExceededError,
    LLMResponseMalformedError,
    LLMTimeoutError,
)
from app.llm.claim_extractor import ClaimExtractor
from app.llm.gateway import (
    FallbackLLMGateway,
    create_provider_gateway,
    get_llm_gateway,
)
from app.llm.gemini import GeminiGateway
from app.llm.grok import GrokGateway, GrokProvider


class TestGrokGateway(unittest.TestCase):
    def test_missing_api_key_raises_configuration_error(self):
        gw = GrokGateway(api_key="")
        with self.assertRaises(LLMConfigurationError) as ctx:
            gw.generate_text("test prompt")
        self.assertIn("XAI_API_KEY is not configured", str(ctx.exception))

    def test_generate_text_mocked_success(self):
        mock_client = MagicMock(spec=httpx.Client)
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "This is a response from Grok."
                    }
                }
            ]
        }
        mock_client.post.return_value = mock_response

        gw = GrokGateway(api_key="xai-test-key", client=mock_client)
        result = gw.generate_text("Hello Grok", system_instruction="Be concise")

        self.assertEqual(result, "This is a response from Grok.")
        mock_client.post.assert_called_once()
        call_kwargs = mock_client.post.call_args.kwargs
        self.assertEqual(call_kwargs["json"]["model"], "grok-2-latest")
        self.assertEqual(len(call_kwargs["json"]["messages"]), 2)
        self.assertEqual(call_kwargs["json"]["messages"][0]["role"], "system")
        self.assertEqual(call_kwargs["json"]["messages"][1]["role"], "user")

    def test_generate_json_mocked_success(self):
        mock_client = MagicMock(spec=httpx.Client)
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": '{"claims": [{"id": "c1", "text": "Canberra is the capital of Australia."}]}'
                    }
                }
            ]
        }
        mock_client.post.return_value = mock_response

        gw = GrokGateway(api_key="xai-test-key", client=mock_client)
        data = gw.generate_json("Extract claims")

        self.assertIn("claims", data)
        self.assertEqual(len(data["claims"]), 1)
        self.assertEqual(data["claims"][0]["id"], "c1")
        call_kwargs = mock_client.post.call_args.kwargs
        self.assertEqual(call_kwargs["json"]["response_format"], {"type": "json_object"})

    def test_generate_json_markdown_wrapped(self):
        mock_client = MagicMock(spec=httpx.Client)
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "```json\n[{\"id\": \"c1\", \"text\": \"Sydney is in Australia.\"}]\n```"
                    }
                }
            ]
        }
        mock_client.post.return_value = mock_response

        gw = GrokGateway(api_key="xai-test-key", client=mock_client)
        data = gw.generate_json("Extract claims")

        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["text"], "Sydney is in Australia.")

    def test_http_401_authentication_error(self):
        mock_client = MagicMock(spec=httpx.Client)
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 401
        mock_response.text = '{"error": "Unauthorized"}'
        mock_client.post.return_value = mock_response

        gw = GrokGateway(api_key="invalid-xai-key", client=mock_client)
        with self.assertRaises(LLMConfigurationError) as ctx:
            gw.generate_text("test")
        self.assertIn("xAI authentication failed", str(ctx.exception))
        # Ensure secret is not in exception
        self.assertNotIn("invalid-xai-key", str(ctx.exception))

    def test_http_403_permission_denied_credits_error(self):
        mock_client = MagicMock(spec=httpx.Client)
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 403
        mock_response.json.return_value = {
            "code": "permission-denied",
            "error": "Your newly created team doesn't have any credits or licenses yet.",
        }
        mock_client.post.return_value = mock_response

        gw = GrokGateway(api_key="valid-team-no-credits-key", client=mock_client)
        with self.assertRaises(LLMQuotaExceededError) as ctx:
            gw.generate_text("test")
        self.assertIn("credits", str(ctx.exception).lower())
        self.assertNotIn("valid-team-no-credits-key", str(ctx.exception))

    def test_http_429_rate_limit(self):
        mock_client = MagicMock(spec=httpx.Client)
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 429
        mock_response.text = '{"error": "Rate limit exceeded"}'
        mock_client.post.return_value = mock_response

        gw = GrokGateway(api_key="xai-test-key", client=mock_client)
        with self.assertRaises(LLMQuotaExceededError):
            gw.generate_text("test")

    def test_timeout_error(self):
        mock_client = MagicMock(spec=httpx.Client)
        mock_client.post.side_effect = httpx.TimeoutException("Connection timed out")

        gw = GrokGateway(api_key="xai-test-key", client=mock_client)
        with self.assertRaises(LLMTimeoutError):
            gw.generate_text("test")

    def test_server_500_error(self):
        mock_client = MagicMock(spec=httpx.Client)
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_client.post.return_value = mock_response

        gw = GrokGateway(api_key="xai-test-key", client=mock_client)
        with self.assertRaises(LLMAPIError):
            gw.generate_text("test")

    def test_malformed_response_empty_choices(self):
        mock_client = MagicMock(spec=httpx.Client)
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {"choices": []}
        mock_client.post.return_value = mock_response

        gw = GrokGateway(api_key="xai-test-key", client=mock_client)
        with self.assertRaises(LLMResponseMalformedError):
            gw.generate_text("test")


class TestGatewayProviderSelection(unittest.TestCase):
    @patch("app.core.config.settings.LLM_PROVIDER", "gemini")
    @patch("app.core.config.settings.LLM_FALLBACK_PROVIDER", None)
    def test_provider_selection_gemini(self):
        gw = get_llm_gateway()
        self.assertIsInstance(gw, GeminiGateway)

    @patch("app.core.config.settings.LLM_PROVIDER", "grok")
    @patch("app.core.config.settings.LLM_FALLBACK_PROVIDER", None)
    def test_provider_selection_grok(self):
        gw = get_llm_gateway()
        self.assertIsInstance(gw, GrokGateway)

    def test_unsupported_provider_raises(self):
        with self.assertRaises(LLMConfigurationError) as ctx:
            create_provider_gateway("openai")
        self.assertIn("Unsupported LLM provider 'openai'", str(ctx.exception))

    def test_claim_extractor_with_grok_gateway(self):
        mock_client = MagicMock(spec=httpx.Client)
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": '[{"id": "c1", "text": "Paris is the capital of France."}]'
                    }
                }
            ]
        }
        mock_client.post.return_value = mock_response

        grok_gw = GrokGateway(api_key="xai-test-key", client=mock_client)
        extractor = ClaimExtractor(gateway=grok_gw)
        claims = extractor.extract_claims("Paris is the capital of France.")

        self.assertEqual(len(claims), 1)
        self.assertEqual(claims[0].id, "c1")
        self.assertEqual(claims[0].text, "Paris is the capital of France.")

    def test_fallback_gateway_when_configured(self):
        mock_primary = MagicMock(spec=GrokGateway)
        mock_primary.generate_text.side_effect = LLMTimeoutError("Primary timed out")

        mock_fallback = MagicMock(spec=GeminiGateway)
        mock_fallback.generate_text.return_value = "Fallback succeeded"

        fallback_gw = FallbackLLMGateway(primary=mock_primary, fallback=mock_fallback)
        result = fallback_gw.generate_text("test")

        self.assertEqual(result, "Fallback succeeded")
        mock_primary.generate_text.assert_called_once()
        mock_fallback.generate_text.assert_called_once()

    def test_no_fallback_when_unconfigured_raises(self):
        mock_primary = MagicMock(spec=GrokGateway)
        mock_primary.generate_text.side_effect = LLMTimeoutError("Primary timed out")

        fallback_gw = FallbackLLMGateway(primary=mock_primary, fallback=None)
        with self.assertRaises(LLMTimeoutError):
            fallback_gw.generate_text("test")


if __name__ == "__main__":
    unittest.main()
