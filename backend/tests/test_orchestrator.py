import unittest
from unittest.mock import MagicMock

from app.llm.claim_extractor import ClaimExtractor
from app.retrieval.interface import EvidenceRetriever
from app.schemas.claim import ExtractedClaim
from app.schemas.evidence import EvidenceItem
from app.schemas.request import VerifyRequest
from app.schemas.verification import RiskLevel, VerificationStatus
from app.services.orchestrator import VerificationOrchestrator
from app.verification.verifier import ClaimVerifier


class TestVerificationOrchestrator(unittest.TestCase):
    def test_verify_answer_success_mocked(self):
        # Mock Claim Extractor
        mock_extractor = MagicMock(spec=ClaimExtractor)
        mock_extractor.extract_claims.return_value = [
            ExtractedClaim(id="c1", text="Sydney is the capital of Australia.")
        ]

        # Mock Retriever (Member 3 interface)
        mock_retriever = MagicMock(spec=EvidenceRetriever)
        mock_retriever.retrieve_evidence.return_value = [
            EvidenceItem(
                text="Canberra is the capital of Australia.",
                source="Official Atlas",
                url="https://atlas.gov.au",
                relevance_score=0.95,
            )
        ]

        # Mock Verifier (Member 4 interface)
        mock_verifier = MagicMock(spec=ClaimVerifier)
        mock_verifier.verify_claim.return_value = {
            "status": "CONTRADICTED",
            "confidence": 0.98,
            "reasoning": "Official records state Canberra is the capital.",
        }

        orchestrator = VerificationOrchestrator(
            claim_extractor=mock_extractor,
            retriever=mock_retriever,
            verifier=mock_verifier,
        )

        request = VerifyRequest(
            question="What is the capital of Australia?",
            answer="Sydney is the capital of Australia.",
        )
        response = orchestrator.verify_answer(request)

        self.assertEqual(response.overall_risk, 100.0)
        self.assertEqual(response.risk_level, RiskLevel.CRITICAL)
        self.assertEqual(len(response.claims), 1)
        self.assertEqual(response.claims[0].status, VerificationStatus.CONTRADICTED)
        self.assertEqual(len(response.claims[0].citations), 1)
        self.assertEqual(response.claims[0].citations[0].source, "Official Atlas")
        self.assertFalse(response.is_demo)

    def test_verify_answer_demo_mode(self):
        orchestrator = VerificationOrchestrator()
        request = VerifyRequest(
            question="What is the capital of Australia?",
            answer="Sydney is the capital of Australia.",
            demo_mode=True,
        )
        response = orchestrator.verify_answer(request)

        self.assertTrue(response.is_demo)
        self.assertEqual(response.overall_risk, 100.0)
        self.assertEqual(response.risk_level, RiskLevel.CRITICAL)
        self.assertEqual(response.claims[0].status, VerificationStatus.CONTRADICTED)

    def test_verify_answer_no_claims(self):
        mock_extractor = MagicMock(spec=ClaimExtractor)
        mock_extractor.extract_claims.return_value = []

        orchestrator = VerificationOrchestrator(claim_extractor=mock_extractor)
        request = VerifyRequest(
            question="Greetings",
            answer="Hello! How are you?",
        )
        response = orchestrator.verify_answer(request)
        self.assertEqual(response.overall_risk, 0.0)
        self.assertEqual(response.risk_level, RiskLevel.LOW)
        self.assertEqual(len(response.claims), 0)

    def test_verify_answer_retriever_failure_handled(self):
        mock_extractor = MagicMock(spec=ClaimExtractor)
        mock_extractor.extract_claims.return_value = [
            ExtractedClaim(id="c1", text="Some assertion.")
        ]

        mock_retriever = MagicMock(spec=EvidenceRetriever)
        mock_retriever.retrieve_evidence.side_effect = Exception("Retrieval database connection refused")

        orchestrator = VerificationOrchestrator(
            claim_extractor=mock_extractor,
            retriever=mock_retriever,
        )
        request = VerifyRequest(
            question="Question",
            answer="Some assertion.",
        )
        response = orchestrator.verify_answer(request)
        # Should gracefully handle retrieval failure without throwing 500
        self.assertEqual(len(response.claims), 1)
        self.assertEqual(response.claims[0].status, VerificationStatus.INSUFFICIENT)


if __name__ == "__main__":
    unittest.main()
