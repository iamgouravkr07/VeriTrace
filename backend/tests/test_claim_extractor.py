import unittest
from unittest.mock import MagicMock

from app.core.exceptions import ClaimExtractionError, LLMTimeoutError
from app.llm.claim_extractor import ClaimExtractor
from app.llm.gateway import LLMGateway


class TestClaimExtractor(unittest.TestCase):
    def test_extract_claims_from_valid_list(self):
        mock_gateway = MagicMock(spec=LLMGateway)
        mock_gateway.generate_json.return_value = [
            {"id": "c1", "text": "Paris is the capital of France."},
            {"id": "c2", "text": "France is located in Europe."},
        ]

        extractor = ClaimExtractor(gateway=mock_gateway)
        claims = extractor.extract_claims("Paris is the capital of France. France is located in Europe.")

        self.assertEqual(len(claims), 2)
        self.assertEqual(claims[0].id, "c1")
        self.assertEqual(claims[0].text, "Paris is the capital of France.")
        self.assertEqual(claims[1].id, "c2")
        self.assertEqual(claims[1].text, "France is located in Europe.")

    def test_extract_claims_from_dict_wrapper(self):
        mock_gateway = MagicMock(spec=LLMGateway)
        mock_gateway.generate_json.return_value = {
            "claims": [
                {"id": "c1", "text": "Canberra is the capital of Australia."}
            ]
        }

        extractor = ClaimExtractor(gateway=mock_gateway)
        claims = extractor.extract_claims("Canberra is the capital of Australia.")

        self.assertEqual(len(claims), 1)
        self.assertEqual(claims[0].text, "Canberra is the capital of Australia.")

    def test_extract_claims_empty_answer(self):
        mock_gateway = MagicMock(spec=LLMGateway)
        extractor = ClaimExtractor(gateway=mock_gateway)
        claims = extractor.extract_claims("   ")
        self.assertEqual(claims, [])
        mock_gateway.generate_json.assert_not_called()

    def test_extract_claims_llm_error_fallback(self):
        mock_gateway = MagicMock(spec=LLMGateway)
        mock_gateway.generate_json.side_effect = LLMTimeoutError("Request timed out")

        extractor = ClaimExtractor(gateway=mock_gateway, allow_rule_fallback=True)
        claims = extractor.extract_claims("Sydney is in Australia. Melbourne is also in Australia.")

        self.assertEqual(len(claims), 2)
        self.assertEqual(claims[0].text, "Sydney is in Australia.")
        self.assertEqual(claims[1].text, "Melbourne is also in Australia.")

    def test_extract_claims_llm_error_no_fallback_raises(self):
        mock_gateway = MagicMock(spec=LLMGateway)
        mock_gateway.generate_json.side_effect = LLMTimeoutError("Request timed out")

        extractor = ClaimExtractor(gateway=mock_gateway, allow_rule_fallback=False)
        with self.assertRaises(ClaimExtractionError):
            extractor.extract_claims("Sydney is in Australia.")


if __name__ == "__main__":
    unittest.main()
