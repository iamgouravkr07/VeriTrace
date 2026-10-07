import unittest
from typing import Any, Dict, List
from unittest.mock import MagicMock

from app.llm.claim_extractor import ClaimExtractor
from app.retrieval.interface import EvidenceRetriever
from app.schemas.claim import ExtractedClaim
from app.schemas.evidence import EvidenceItem
from app.schemas.request import VerifyRequest
from app.schemas.verification import RiskLevel, VerificationStatus
from app.services.orchestrator import VerificationOrchestrator
from app.verification.models import EvidenceReference
from app.verification.verifier import ClaimVerifier


class LegacyCustomVerifier:
    """Simulates an older third-party ClaimVerifier implementation returning only minimal fields."""
    def verify_claim(self, claim: str, evidence: List[EvidenceItem]) -> Dict[str, Any]:
        return {
            "status": "SUPPORTED",
            "confidence": 0.88,
            "reasoning": "Verified by legacy custom model.",
        }


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

    def test_supporting_evidence_reaches_claim_verification_result(self):
        """Test Requirement 8: supporting evidence reaches ClaimVerificationResult.supporting_evidence."""
        mock_extractor = MagicMock(spec=ClaimExtractor)
        mock_extractor.extract_claims.return_value = [
            ExtractedClaim(id="c1", text="Paris is the capital of France.")
        ]

        mock_retriever = MagicMock(spec=EvidenceRetriever)
        mock_retriever.retrieve_evidence.return_value = [
            EvidenceItem(
                text="Paris is the official capital of France.",
                source="French Institute",
                url="https://france.gov/paris",
                page=1,
                relevance_score=0.98,
            )
        ]

        mock_verifier = MagicMock(spec=ClaimVerifier)
        mock_verifier.verify_claim.return_value = {
            "status": "SUPPORTED",
            "verdict": "SUPPORTED",
            "confidence": 0.99,
            "hallucination_risk": 0.01,
            "reasoning": "Confirmed by French Institute.",
            "supporting_evidence": [
                {
                    "source_id": "e1",
                    "text": "Paris is the official capital of France.",
                    "source": "French Institute",
                    "url": "https://france.gov/paris",
                    "page": 1,
                    "relevance": 0.98,
                }
            ],
            "contradicting_evidence": [],
        }

        orchestrator = VerificationOrchestrator(
            claim_extractor=mock_extractor,
            retriever=mock_retriever,
            verifier=mock_verifier,
        )
        request = VerifyRequest(
            question="Capital of France?",
            answer="Paris is the capital of France.",
        )
        response = orchestrator.verify_answer(request)

        claim_res = response.claims[0]
        # 1. Supporting evidence reached ClaimVerificationResult
        self.assertEqual(len(claim_res.supporting_evidence), 1)
        self.assertEqual(claim_res.supporting_evidence[0].source, "French Institute")
        self.assertEqual(claim_res.supporting_evidence[0].evidence, "Paris is the official capital of France.")
        self.assertEqual(claim_res.supporting_evidence[0].url, "https://france.gov/paris")
        self.assertEqual(claim_res.supporting_evidence[0].relevance_score, 0.98)
        self.assertEqual(len(claim_res.contradicting_evidence), 0)

        # 2. Existing citations behavior remains unchanged
        self.assertEqual(len(claim_res.citations), 1)
        self.assertEqual(claim_res.citations[0].source, "French Institute")

    def test_contradicting_evidence_reaches_claim_verification_result(self):
        """Test Requirement 8: contradicting evidence reaches ClaimVerificationResult.contradicting_evidence."""
        mock_extractor = MagicMock(spec=ClaimExtractor)
        mock_extractor.extract_claims.return_value = [
            ExtractedClaim(id="c1", text="Sydney is the capital of Australia.")
        ]

        mock_retriever = MagicMock(spec=EvidenceRetriever)
        mock_retriever.retrieve_evidence.return_value = [
            EvidenceItem(
                text="Canberra is the national capital of Australia.",
                source="Gazette",
                url="https://aus.gov",
                relevance_score=0.96,
            )
        ]

        mock_verifier = MagicMock(spec=ClaimVerifier)
        mock_verifier.verify_claim.return_value = {
            "status": "CONTRADICTED",
            "verdict": "CONTRADICTED",
            "confidence": 0.97,
            "hallucination_risk": 0.93,
            "reasoning": "Contradicted: Canberra is the capital.",
            "supporting_evidence": [],
            "contradicting_evidence": [
                EvidenceReference(
                    source_id="e1",
                    text="Canberra is the national capital of Australia.",
                    source="Gazette",
                    url="https://aus.gov",
                    relevance=0.96,
                )
            ],
        }

        orchestrator = VerificationOrchestrator(
            claim_extractor=mock_extractor,
            retriever=mock_retriever,
            verifier=mock_verifier,
        )
        request = VerifyRequest(
            question="Capital of Australia?",
            answer="Sydney is the capital of Australia.",
        )
        response = orchestrator.verify_answer(request)

        claim_res = response.claims[0]
        # 1. Contradicting evidence reached ClaimVerificationResult
        self.assertEqual(len(claim_res.contradicting_evidence), 1)
        self.assertEqual(claim_res.contradicting_evidence[0].source, "Gazette")
        self.assertEqual(claim_res.contradicting_evidence[0].evidence, "Canberra is the national capital of Australia.")
        self.assertEqual(claim_res.contradicting_evidence[0].relevance_score, 0.96)
        self.assertEqual(len(claim_res.supporting_evidence), 0)

        # 2. Existing citations behavior remains unchanged
        self.assertEqual(len(claim_res.citations), 1)
        self.assertEqual(claim_res.citations[0].source, "Gazette")

    def test_old_custom_claim_verifier_implementations_still_work(self):
        """Test Requirement 8: old custom ClaimVerifier implementations still work."""
        mock_extractor = MagicMock(spec=ClaimExtractor)
        mock_extractor.extract_claims.return_value = [
            ExtractedClaim(id="c1", text="Existing claim assertion.")
        ]

        mock_retriever = MagicMock(spec=EvidenceRetriever)
        mock_retriever.retrieve_evidence.return_value = [
            EvidenceItem(
                text="Evidence snippet from retriever.",
                source="Doc Source",
                relevance_score=0.85,
            )
        ]

        legacy_verifier = LegacyCustomVerifier()
        orchestrator = VerificationOrchestrator(
            claim_extractor=mock_extractor,
            retriever=mock_retriever,
            verifier=legacy_verifier,
        )

        request = VerifyRequest(
            question="Question?",
            answer="Existing claim assertion.",
        )
        response = orchestrator.verify_answer(request)

        self.assertEqual(len(response.claims), 1)
        claim_res = response.claims[0]
        self.assertEqual(claim_res.status, VerificationStatus.SUPPORTED)
        self.assertEqual(claim_res.reasoning, "Verified by legacy custom model.")
        # Backward compatibility: supporting/contradicting evidence default to empty list
        self.assertEqual(claim_res.supporting_evidence, [])
        self.assertEqual(claim_res.contradicting_evidence, [])
        # Citations still populated
        self.assertEqual(len(claim_res.citations), 1)
        self.assertEqual(claim_res.citations[0].source, "Doc Source")

    def test_unsafe_attribution_conversion_leaves_arrays_empty(self):
        """Test Requirement 7: If evidence attribution cannot be safely converted, leave arrays empty without inventing data."""
        mock_extractor = MagicMock(spec=ClaimExtractor)
        mock_extractor.extract_claims.return_value = [
            ExtractedClaim(id="c1", text="Claim with malformed attribution.")
        ]
        mock_retriever = MagicMock(spec=EvidenceRetriever)
        mock_retriever.retrieve_evidence.return_value = []

        mock_verifier = MagicMock(spec=ClaimVerifier)
        mock_verifier.verify_claim.return_value = {
            "status": "INSUFFICIENT",
            "confidence": 0.5,
            "reasoning": "Unconvertible items.",
            "supporting_evidence": [
                {"text": ""},  # empty text -> must not invent data
                "malformed string without text dict",
                12345,
            ],
            "contradicting_evidence": None,
        }

        orchestrator = VerificationOrchestrator(
            claim_extractor=mock_extractor,
            retriever=mock_retriever,
            verifier=mock_verifier,
        )
        request = VerifyRequest(
            question="Question?",
            answer="Claim with malformed attribution.",
        )
        response = orchestrator.verify_answer(request)
        claim_res = response.claims[0]
        self.assertEqual(claim_res.supporting_evidence, [])
        self.assertEqual(claim_res.contradicting_evidence, [])


if __name__ == "__main__":
    unittest.main()
