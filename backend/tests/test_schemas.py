import unittest
from pydantic import ValidationError

from app.schemas import (
    Citation,
    ClaimVerificationResult,
    ExtractedClaim,
    RiskLevel,
    VerificationStatus,
    VerifyRequest,
    VerifyResponse,
)


class TestSchemas(unittest.TestCase):
    def test_verify_request_valid(self):
        req = VerifyRequest(
            question="What is the capital of Australia?",
            answer="Sydney is the capital of Australia.",
        )
        self.assertEqual(req.question, "What is the capital of Australia?")
        self.assertEqual(req.answer, "Sydney is the capital of Australia.")
        self.assertFalse(req.demo_mode)

    def test_verify_request_empty_question(self):
        with self.assertRaises(ValidationError):
            VerifyRequest(question="   ", answer="Sydney is the capital of Australia.")

    def test_verify_request_empty_answer(self):
        with self.assertRaises(ValidationError):
            VerifyRequest(question="What is the capital of Australia?", answer="   ")

    def test_verify_response_serialization(self):
        resp = VerifyResponse(
            overall_risk=100.0,
            risk_level=RiskLevel.CRITICAL,
            claims=[
                ClaimVerificationResult(
                    id="c1",
                    text="Sydney is the capital of Australia.",
                    status=VerificationStatus.CONTRADICTED,
                    confidence=0.98,
                    citations=[
                        Citation(
                            source="Example Source",
                            url="https://example.com",
                            evidence="Canberra is the capital of Australia.",
                            relevance_score=0.95,
                        )
                    ],
                )
            ],
        )
        d = resp.model_dump()
        self.assertEqual(d["overall_risk"], 100.0)
        self.assertEqual(d["risk_level"], "CRITICAL")
        self.assertEqual(len(d["claims"]), 1)
        self.assertEqual(d["claims"][0]["status"], "CONTRADICTED")
        self.assertEqual(d["claims"][0]["confidence"], 0.98)
        self.assertEqual(d["claims"][0]["citations"][0]["relevance_score"], 0.95)

    def test_extracted_claim(self):
        c = ExtractedClaim(id="c1", text="Paris is the capital of France.")
        self.assertEqual(c.id, "c1")
        self.assertEqual(c.text, "Paris is the capital of France.")


if __name__ == "__main__":
    unittest.main()
