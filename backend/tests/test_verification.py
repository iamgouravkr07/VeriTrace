import unittest

from app.retrieval.interface import (
    EvidenceRetriever,
    StubRetriever,
    normalize_retrieval_output,
)
from app.schemas.evidence import EvidenceItem
from app.schemas.verification import VerificationStatus
from app.verification.verifier import (
    ClaimVerifier,
    StubClaimVerifier,
    normalize_verification_output,
)


class TestVerificationInterfaces(unittest.TestCase):
    def test_stub_retriever_protocol(self):
        retriever = StubRetriever(
            default_evidence=[
                EvidenceItem(
                    text="Canberra is Australia's capital.",
                    source="Encyclopedia",
                    url="https://example.com/canberra",
                    relevance_score=0.95,
                )
            ]
        )
        self.assertIsInstance(retriever, EvidenceRetriever)
        items = retriever.retrieve_evidence("capital of Australia")
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].source, "Encyclopedia")

    def test_normalize_retrieval_output(self):
        raw = [
            {
                "text": "Evidence snippet",
                "source": "Source 1",
                "url": "https://test.org",
                "page": 2,
                "relevance_score": 0.88,
            }
        ]
        items = normalize_retrieval_output(raw)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].text, "Evidence snippet")
        self.assertEqual(items[0].relevance_score, 0.88)

    def test_stub_verifier_protocol(self):
        verifier = StubClaimVerifier(
            default_status=VerificationStatus.SUPPORTED,
            default_confidence=0.92,
        )
        self.assertIsInstance(verifier, ClaimVerifier)

        # When evidence is present
        evidence = [EvidenceItem(text="Fact", source="Doc")]
        res = verifier.verify_claim("some claim", evidence)
        self.assertEqual(res["status"], "SUPPORTED")
        self.assertEqual(res["confidence"], 0.92)

        # When no evidence is present
        empty_res = verifier.verify_claim("claim", [])
        self.assertEqual(empty_res["status"], "INSUFFICIENT")

    def test_normalize_verification_output(self):
        status, conf, reason = normalize_verification_output(
            {"status": "CONTRADICTED", "confidence": 0.98, "reasoning": "Direct conflict"}
        )
        self.assertEqual(status, VerificationStatus.CONTRADICTED)
        self.assertEqual(conf, 0.98)
        self.assertEqual(reason, "Direct conflict")

    def test_normalize_verification_output_fallback(self):
        status, conf, reason = normalize_verification_output(
            {"status": "INVALID_STATUS", "confidence": "invalid"}
        )
        self.assertEqual(status, VerificationStatus.INSUFFICIENT)
        self.assertEqual(conf, 0.5)


if __name__ == "__main__":
    unittest.main()
