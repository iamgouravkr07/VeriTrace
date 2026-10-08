import math
import unittest
from unittest.mock import MagicMock

from app.llm.claim_extractor import ClaimExtractor
from app.retrieval.embeddings.vector_store import VectorDocument, VectorStore
from app.retrieval.orchestrator import RetrievalOrchestrator
from app.retrieval.pdf.chunker import TextChunker
from app.retrieval.pdf.retriever import PDFRetriever
from app.schemas.claim import ClaimVerificationResult, ExtractedClaim
from app.schemas.evidence import Citation, EvidenceItem
from app.schemas.request import VerifyRequest
from app.schemas.verification import RiskLevel, VerificationStatus
from app.scoring.risk import calculate_overall_risk, determine_risk_level
from app.services.orchestrator import VerificationOrchestrator
from app.verification.confidence import calculate_confidence
from app.verification.models import EvidenceReference, SingleClaimVerificationResult, VerificationVerdict
from app.verification.service import VerificationService
from app.verification.verifier import ClaimVerifier


class TestRetrievalPipeline(unittest.TestCase):
    def test_vector_store_bm25_search(self):
        store = VectorStore()
        docs = [
            VectorDocument(
                document_id="doc1",
                text="Canberra is the capital city of Australia.",
                metadata={"source": "test_geo.txt", "page": 1},
            ),
            VectorDocument(
                document_id="doc2",
                text="Paris is the capital of France and has the Eiffel Tower.",
                metadata={"source": "france.txt", "page": 2},
            ),
        ]
        store.add(docs)

        # Query matching doc1
        results = store.search("capital of Australia", top_k=2)
        self.assertGreater(len(results), 0)
        self.assertEqual(results[0]["id"], "doc1")
        self.assertEqual(results[0]["source"], "test_geo.txt")
        self.assertGreater(results[0]["relevance_score"], 0.0)
        self.assertLessEqual(results[0]["relevance_score"], 1.0)

    def test_text_chunker(self):
        chunker = TextChunker(default_chunk_size=5, default_overlap=2)
        text = "One two three four five six seven eight nine ten."
        chunks = chunker.chunk_text(text, metadata={"source": "test"})
        self.assertGreater(len(chunks), 1)
        self.assertEqual(chunks[0]["metadata"]["source"], "test")

    def test_retrieval_orchestrator_retrieve_evidence(self):
        ro = RetrievalOrchestrator(auto_load_documents=False)
        # Add document to internal store
        ro.pdf_retriever.vector_store.add([
            VectorDocument(
                document_id="c1",
                text="Canberra is the official capital city of the Commonwealth of Australia.",
                metadata={"source": "australia.txt"},
            )
        ])

        evidence = ro.retrieve_evidence("What is the capital of Australia?", top_k=1)
        self.assertEqual(len(evidence), 1)
        self.assertIsInstance(evidence[0], EvidenceItem)
        self.assertEqual(evidence[0].source, "australia.txt")
        self.assertIn("Canberra", evidence[0].text)


class TestScoringAndRisk(unittest.TestCase):
    def test_confidence_calculation_normal(self):
        conf = calculate_confidence(
            nli_confidence=0.9,
            retrieval_relevance=0.8,
            source_reliability=1.0,
            w_nli=0.5,
            w_retrieval=0.3,
            w_source=0.2,
        )
        expected = round(0.5 * 0.9 + 0.3 * 0.8 + 0.2 * 1.0, 4)
        self.assertAlmostEqual(conf, expected, places=4)
        self.assertGreaterEqual(conf, 0.0)
        self.assertLessEqual(conf, 1.0)

    def test_confidence_nan_and_inf_immunity(self):
        # NaN in nli_confidence
        c1 = calculate_confidence(float("nan"), retrieval_relevance=0.8)
        self.assertFalse(math.isnan(c1))
        self.assertGreaterEqual(c1, 0.0)
        self.assertLessEqual(c1, 1.0)

        # Inf in retrieval_relevance
        c2 = calculate_confidence(0.9, retrieval_relevance=float("inf"))
        self.assertFalse(math.isnan(c2))
        self.assertFalse(math.isinf(c2))

        # None inputs
        c3 = calculate_confidence(0.8, retrieval_relevance=None)
        self.assertFalse(math.isnan(c3))

    def test_risk_calculation_states(self):
        # 1. Supported claim -> Low risk
        c_sup = ClaimVerificationResult(
            id="c1",
            text="Canberra is the capital of Australia.",
            status=VerificationStatus.SUPPORTED,
            confidence=0.95,
        )
        risk_sup, lvl_sup = calculate_overall_risk([c_sup])
        self.assertEqual(risk_sup, 0.0)
        self.assertEqual(lvl_sup, RiskLevel.LOW)

        # 2. Contradicted claim -> Critical risk
        c_con = ClaimVerificationResult(
            id="c2",
            text="Sydney is the capital of Australia.",
            status=VerificationStatus.CONTRADICTED,
            confidence=0.98,
        )
        risk_con, lvl_con = calculate_overall_risk([c_con])
        self.assertEqual(risk_con, 100.0)
        self.assertEqual(lvl_con, RiskLevel.CRITICAL)

        # 3. Insufficient evidence -> Medium risk
        c_ins = ClaimVerificationResult(
            id="c3",
            text="Australia has 12 million trees.",
            status=VerificationStatus.INSUFFICIENT,
            confidence=0.25,
        )
        risk_ins, lvl_ins = calculate_overall_risk([c_ins])
        self.assertEqual(risk_ins, 50.0)
        self.assertEqual(lvl_ins, RiskLevel.MEDIUM)

        # 4. Mixed: 1 Supported + 1 Contradicted
        risk_mixed, lvl_mixed = calculate_overall_risk([c_sup, c_con])
        self.assertEqual(risk_mixed, 50.0)
        self.assertEqual(lvl_mixed, RiskLevel.MEDIUM)

    def test_risk_nan_immunity(self):
        risk, lvl = calculate_overall_risk([])
        self.assertEqual(risk, 0.0)
        self.assertEqual(lvl, RiskLevel.LOW)

        lvl_nan = determine_risk_level(float("nan"))
        self.assertEqual(lvl_nan, RiskLevel.LOW)


class TestVerificationPipelineEndToEnd(unittest.TestCase):
    def test_supported_claim_propagation(self):
        mock_extractor = MagicMock(spec=ClaimExtractor)
        mock_extractor.extract_claims.return_value = [
            ExtractedClaim(id="c1", text="Canberra is the capital of Australia.")
        ]

        mock_retriever = MagicMock()
        mock_retriever.retrieve_evidence.return_value = [
            EvidenceItem(
                text="Canberra is the official capital city of Australia.",
                source="Australia Gazetteer",
                url="https://gov.au/capital",
                page=1,
                relevance_score=0.96,
            )
        ]

        mock_verifier = MagicMock(spec=ClaimVerifier)
        mock_verifier.verify_claim.return_value = {
            "status": "SUPPORTED",
            "verdict": "SUPPORTED",
            "confidence": 0.98,
            "hallucination_risk": 0.02,
            "reasoning": "Evidence affirms Canberra is the national capital.",
            "supporting_evidence": [
                {
                    "source": "Australia Gazetteer",
                    "text": "Canberra is the official capital city of Australia.",
                    "url": "https://gov.au/capital",
                    "page": 1,
                    "relevance_score": 0.96,
                }
            ],
            "contradicting_evidence": [],
        }

        orch = VerificationOrchestrator(
            claim_extractor=mock_extractor,
            retriever=mock_retriever,
            verifier=mock_verifier,
        )

        req = VerifyRequest(
            question="What is the capital of Australia?",
            answer="Canberra is the capital of Australia.",
            demo_mode=False,
        )
        resp = orch.verify_answer(req)

        self.assertEqual(resp.overall_risk, 0.0)
        self.assertEqual(resp.risk_level, RiskLevel.LOW)
        self.assertEqual(len(resp.claims), 1)
        c = resp.claims[0]
        self.assertEqual(c.status, VerificationStatus.SUPPORTED)
        self.assertEqual(c.verdict, VerificationStatus.SUPPORTED)
        self.assertAlmostEqual(c.confidence, round(0.5 * 0.98 + 0.3 * 0.96 + 0.2 * 1.0, 4), places=4)
        self.assertEqual(len(c.citations), 1)
        self.assertEqual(c.citations[0].source, "Australia Gazetteer")
        self.assertEqual(len(c.supporting_evidence), 1)
        self.assertEqual(len(c.contradicting_evidence), 0)

    def test_contradicted_claim_propagation(self):
        mock_extractor = MagicMock(spec=ClaimExtractor)
        mock_extractor.extract_claims.return_value = [
            ExtractedClaim(id="c2", text="Sydney is the capital of Australia.")
        ]

        mock_retriever = MagicMock()
        mock_retriever.retrieve_evidence.return_value = [
            EvidenceItem(
                text="Canberra is the capital city of Australia; Sydney is the capital of New South Wales.",
                source="Australia Gazetteer",
                relevance_score=0.92,
            )
        ]

        mock_verifier = MagicMock(spec=ClaimVerifier)
        mock_verifier.verify_claim.return_value = {
            "status": "CONTRADICTED",
            "verdict": "CONTRADICTED",
            "confidence": 0.95,
            "hallucination_risk": 0.95,
            "reasoning": "Evidence clearly contradicts Sydney being the national capital.",
            "supporting_evidence": [],
            "contradicting_evidence": [
                {
                    "source": "Australia Gazetteer",
                    "text": "Canberra is the capital city of Australia; Sydney is the capital of New South Wales.",
                    "relevance_score": 0.92,
                }
            ],
        }

        orch = VerificationOrchestrator(
            claim_extractor=mock_extractor,
            retriever=mock_retriever,
            verifier=mock_verifier,
        )

        req = VerifyRequest(
            question="What is the capital of Australia?",
            answer="Sydney is the capital of Australia.",
            demo_mode=False,
        )
        resp = orch.verify_answer(req)

        self.assertEqual(resp.overall_risk, 100.0)
        self.assertEqual(resp.risk_level, RiskLevel.CRITICAL)
        self.assertEqual(resp.claims[0].status, VerificationStatus.CONTRADICTED)
        self.assertEqual(len(resp.claims[0].contradicting_evidence), 1)
        self.assertEqual(len(resp.claims[0].supporting_evidence), 0)

    def test_insufficient_evidence_empty_retrieval(self):
        mock_extractor = MagicMock(spec=ClaimExtractor)
        mock_extractor.extract_claims.return_value = [
            ExtractedClaim(id="c3", text="Australia has exactly 12 million trees.")
        ]

        mock_retriever = MagicMock()
        mock_retriever.retrieve_evidence.return_value = []

        mock_verifier = MagicMock(spec=ClaimVerifier)
        mock_verifier.verify_claim.return_value = {
            "status": "INSUFFICIENT",
            "verdict": "INSUFFICIENT_EVIDENCE",
            "confidence": 0.1,
            "hallucination_risk": 0.95,
            "reasoning": "No evidence was provided to substantiate or refute the claim.",
            "supporting_evidence": [],
            "contradicting_evidence": [],
        }

        orch = VerificationOrchestrator(
            claim_extractor=mock_extractor,
            retriever=mock_retriever,
            verifier=mock_verifier,
        )

        req = VerifyRequest(
            question="How many trees does Australia have?",
            answer="Australia has exactly 12 million trees.",
            demo_mode=False,
        )
        resp = orch.verify_answer(req)

        self.assertEqual(resp.overall_risk, 50.0)
        self.assertEqual(resp.risk_level, RiskLevel.MEDIUM)
        c = resp.claims[0]
        self.assertEqual(c.status, VerificationStatus.INSUFFICIENT)
        self.assertEqual(len(c.citations), 0)
        self.assertEqual(len(c.supporting_evidence), 0)
        self.assertEqual(len(c.contradicting_evidence), 0)

    def test_latency_breakdown_in_response_metadata(self):
        mock_extractor = MagicMock(spec=ClaimExtractor)
        mock_extractor.extract_claims.return_value = [
            ExtractedClaim(id="c1", text="Canberra is the capital of Australia.")
        ]
        mock_retriever = MagicMock()
        mock_retriever.retrieve_evidence.return_value = []
        mock_verifier = MagicMock(spec=ClaimVerifier)
        mock_verifier.verify_claim.return_value = {
            "status": "INSUFFICIENT",
            "verdict": "INSUFFICIENT_EVIDENCE",
            "confidence": 0.2,
            "hallucination_risk": 0.8,
            "reasoning": "No evidence.",
            "supporting_evidence": [],
            "contradicting_evidence": [],
        }

        orch = VerificationOrchestrator(
            claim_extractor=mock_extractor,
            retriever=mock_retriever,
            verifier=mock_verifier,
        )

        resp = orch.verify_answer(
            VerifyRequest(
                question="What is the capital of Australia?",
                answer="Canberra is the capital of Australia.",
                demo_mode=False,
            )
        )

        self.assertIn("latency_breakdown", resp.metadata)
        breakdown = resp.metadata["latency_breakdown"]
        required_keys = [
            "claim_extraction_ms",
            "retrieval_ms",
            "reranking_ms",
            "nli_ms",
            "scoring_ms",
            "total_ms",
        ]
        for key in required_keys:
            self.assertIn(key, breakdown)
            self.assertIsInstance(breakdown[key], (int, float))
            self.assertGreaterEqual(breakdown[key], 0.0)

    def test_verification_orchestrator_caching(self):
        mock_extractor = MagicMock(spec=ClaimExtractor)
        mock_extractor.extract_claims.return_value = [
            ExtractedClaim(id="c1", text="Canberra is the capital of Australia.")
        ]
        mock_retriever = MagicMock()
        mock_retriever.retrieve_evidence.return_value = []
        mock_verifier = MagicMock(spec=ClaimVerifier)
        mock_verifier.verify_claim.return_value = {
            "status": "SUPPORTED",
            "verdict": "SUPPORTED",
            "confidence": 0.95,
            "hallucination_risk": 0.05,
            "reasoning": "Confirmed.",
            "supporting_evidence": [],
            "contradicting_evidence": [],
        }

        orch = VerificationOrchestrator(
            claim_extractor=mock_extractor,
            retriever=mock_retriever,
            verifier=mock_verifier,
        )

        req = VerifyRequest(
            question="What is the capital of Australia?",
            answer="Canberra is the capital of Australia.",
            demo_mode=False,
        )
        # Call 1: Populates cache
        orch.verify_answer(req)
        self.assertEqual(mock_verifier.verify_claim.call_count, 1)

        # Call 2: Should hit cache without calling verifier again
        orch.verify_answer(req)
        self.assertEqual(mock_verifier.verify_claim.call_count, 1)

    def test_reranker_threshold_and_top_k(self):
        from app.retrieval.ranking.reranker import Reranker

        reranker = Reranker(top_k=3, min_relevance_threshold=0.15)
        candidates = [
            {"id": "c1", "text": "Low score snippet", "relevance_score": 0.05},
            {"id": "c2", "text": "Decent snippet A", "relevance_score": 0.30},
            {"id": "c3", "text": "Very strong snippet B", "relevance_score": 0.90},
            {"id": "c4", "text": "Good snippet C", "relevance_score": 0.60},
            {"id": "c5", "text": "Medium snippet D", "relevance_score": 0.45},
        ]

        results = reranker.rerank(candidates, top_k=3)
        # c1 (0.05) is below 0.15 threshold, so 4 candidates pass, trimmed to top 3
        self.assertEqual(len(results), 3)
        # Verify sorted descending
        self.assertEqual(results[0]["id"], "c3")
        self.assertEqual(results[1]["id"], "c4")
        self.assertEqual(results[2]["id"], "c5")

    def test_metadata_preservation_in_retrieval(self):
        ro = RetrievalOrchestrator(auto_load_documents=False)
        ro.pdf_retriever.vector_store.add([
            VectorDocument(
                document_id="doc_geo_1",
                text="Canberra is the official capital city of the Commonwealth of Australia.",
                metadata={
                    "document_id": "doc_geo",
                    "document_name": "australia_geography.txt",
                    "chunk_id": "chunk_1",
                    "source": "australia_geography.txt",
                    "page": 1,
                },
            )
        ])

        raw_results = ro.retrieve("capital of Australia", top_k=1)
        self.assertEqual(len(raw_results), 1)
        item = raw_results[0]
        # Check all required metadata keys
        self.assertIn("document_id", item)
        self.assertIn("document_name", item)
        self.assertIn("chunk_id", item)
        self.assertIn("text", item)
        self.assertIn("source", item)
        self.assertIn("page", item)
        self.assertIn("relevance_score", item)

        self.assertEqual(item["document_id"], "doc_geo")
        self.assertEqual(item["document_name"], "australia_geography.txt")
        self.assertEqual(item["chunk_id"], "chunk_1")
        self.assertGreater(item["relevance_score"], 0.15)


if __name__ == "__main__":
    unittest.main()
