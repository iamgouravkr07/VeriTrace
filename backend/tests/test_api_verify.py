import unittest
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.api.verify import get_orchestrator
from app.core.exceptions import (
    ClaimExtractionError,
    LLMConfigurationError,
    LLMQuotaExceededError,
    LLMTimeoutError,
)
from app.main import app
from app.schemas.claim import ClaimVerificationResult
from app.schemas.response import VerifyResponse
from app.schemas.verification import RiskLevel, VerificationStatus
from app.services.orchestrator import VerificationOrchestrator


class TestVerifyAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_verify_demo_mode_endpoint(self):
        payload = {
            "question": "What is the capital of Australia?",
            "answer": "Sydney is the capital of Australia.",
            "demo_mode": True,
        }
        response = self.client.post("/api/v1/verify", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["overall_risk"], 100.0)
        self.assertEqual(data["risk_level"], "CRITICAL")
        self.assertEqual(len(data["claims"]), 1)
        self.assertEqual(data["claims"][0]["status"], "CONTRADICTED")
        self.assertTrue(data["is_demo"])

    def test_verify_validation_error_empty_question(self):
        payload = {
            "question": "   ",
            "answer": "Valid answer text.",
        }
        response = self.client.post("/api/v1/verify", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_verify_validation_error_empty_answer(self):
        payload = {
            "question": "Valid question?",
            "answer": "",
        }
        response = self.client.post("/api/v1/verify", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_verify_mocked_success(self):
        mock_orchestrator = MagicMock(spec=VerificationOrchestrator)
        mock_orchestrator.verify_answer.return_value = VerifyResponse(
            overall_risk=0.0,
            risk_level=RiskLevel.LOW,
            claims=[
                ClaimVerificationResult(
                    id="c1",
                    text="Paris is the capital of France.",
                    status=VerificationStatus.SUPPORTED,
                    confidence=0.99,
                    citations=[],
                )
            ],
            is_demo=False,
        )

        app.dependency_overrides[get_orchestrator] = lambda: mock_orchestrator
        try:
            payload = {
                "question": "What is the capital of France?",
                "answer": "Paris is the capital of France.",
            }
            response = self.client.post("/api/v1/verify", json=payload)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["overall_risk"], 0.0)
            self.assertEqual(data["risk_level"], "LOW")
            self.assertEqual(len(data["claims"]), 1)
            self.assertEqual(data["claims"][0]["status"], "SUPPORTED")
        finally:
            app.dependency_overrides.clear()

    def test_verify_llm_configuration_error_returns_503(self):
        mock_orchestrator = MagicMock(spec=VerificationOrchestrator)
        mock_orchestrator.verify_answer.side_effect = LLMConfigurationError("API key missing")

        app.dependency_overrides[get_orchestrator] = lambda: mock_orchestrator
        try:
            payload = {
                "question": "Question",
                "answer": "Answer",
            }
            response = self.client.post("/api/v1/verify", json=payload)
            self.assertEqual(response.status_code, 503)
            self.assertIn("LLM service is unconfigured", response.json()["detail"])
        finally:
            app.dependency_overrides.clear()

    def test_verify_llm_quota_error_returns_429(self):
        mock_orchestrator = MagicMock(spec=VerificationOrchestrator)
        mock_orchestrator.verify_answer.side_effect = LLMQuotaExceededError("Quota exceeded")

        app.dependency_overrides[get_orchestrator] = lambda: mock_orchestrator
        try:
            payload = {
                "question": "Question",
                "answer": "Answer",
            }
            response = self.client.post("/api/v1/verify", json=payload)
            self.assertEqual(response.status_code, 429)
            self.assertIn("quota exceeded", response.json()["detail"].lower())
        finally:
            app.dependency_overrides.clear()

    def test_verify_llm_timeout_returns_504(self):
        mock_orchestrator = MagicMock(spec=VerificationOrchestrator)
        mock_orchestrator.verify_answer.side_effect = LLMTimeoutError("Timed out")

        app.dependency_overrides[get_orchestrator] = lambda: mock_orchestrator
        try:
            payload = {
                "question": "Question",
                "answer": "Answer",
            }
            response = self.client.post("/api/v1/verify", json=payload)
            self.assertEqual(response.status_code, 504)
        finally:
            app.dependency_overrides.clear()

    def test_verify_claim_extraction_error_returns_502(self):
        mock_orchestrator = MagicMock(spec=VerificationOrchestrator)
        mock_orchestrator.verify_answer.side_effect = ClaimExtractionError("Extraction failure")

        app.dependency_overrides[get_orchestrator] = lambda: mock_orchestrator
        try:
            payload = {
                "question": "Question",
                "answer": "Answer",
            }
            response = self.client.post("/api/v1/verify", json=payload)
            self.assertEqual(response.status_code, 502)
        finally:
            app.dependency_overrides.clear()

    def test_verify_unexpected_error_returns_500_without_leak(self):
        mock_orchestrator = MagicMock(spec=VerificationOrchestrator)
        mock_orchestrator.verify_answer.side_effect = RuntimeError("secret_token_leaked_database_crash")

        app.dependency_overrides[get_orchestrator] = lambda: mock_orchestrator
        try:
            payload = {
                "question": "Question",
                "answer": "Answer",
            }
            response = self.client.post("/api/v1/verify", json=payload)
            self.assertEqual(response.status_code, 500)
            self.assertNotIn("secret_token", response.text)
            self.assertEqual(response.json()["detail"], "Internal server error occurred.")
        finally:
            app.dependency_overrides.clear()


if __name__ == "__main__":
    unittest.main()
