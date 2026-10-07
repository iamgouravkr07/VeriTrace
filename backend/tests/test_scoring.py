import unittest

from app.schemas.claim import ClaimVerificationResult
from app.schemas.verification import RiskLevel, VerificationStatus
from app.scoring.risk import calculate_overall_risk, determine_risk_level
from app.verification.confidence import calculate_confidence


class TestScoring(unittest.TestCase):
    def test_determine_risk_level(self):
        self.assertEqual(determine_risk_level(0.0), RiskLevel.LOW)
        self.assertEqual(determine_risk_level(20.0), RiskLevel.LOW)
        self.assertEqual(determine_risk_level(20.1), RiskLevel.MEDIUM)
        self.assertEqual(determine_risk_level(50.0), RiskLevel.MEDIUM)
        self.assertEqual(determine_risk_level(50.1), RiskLevel.HIGH)
        self.assertEqual(determine_risk_level(80.0), RiskLevel.HIGH)
        self.assertEqual(determine_risk_level(80.1), RiskLevel.CRITICAL)
        self.assertEqual(determine_risk_level(100.0), RiskLevel.CRITICAL)

    def test_calculate_overall_risk_empty(self):
        score, level = calculate_overall_risk([])
        self.assertEqual(score, 0.0)
        self.assertEqual(level, RiskLevel.LOW)

    def test_calculate_overall_risk_supported(self):
        claims = [
            ClaimVerificationResult(
                id="c1",
                text="France is in Europe.",
                status=VerificationStatus.SUPPORTED,
                confidence=0.95,
            )
        ]
        score, level = calculate_overall_risk(claims)
        self.assertEqual(score, 0.0)
        self.assertEqual(level, RiskLevel.LOW)

    def test_calculate_overall_risk_contradicted(self):
        claims = [
            ClaimVerificationResult(
                id="c1",
                text="Sydney is the capital of Australia.",
                status=VerificationStatus.CONTRADICTED,
                confidence=0.98,
            )
        ]
        score, level = calculate_overall_risk(claims)
        self.assertEqual(score, 100.0)
        self.assertEqual(level, RiskLevel.CRITICAL)

    def test_calculate_overall_risk_insufficient(self):
        claims = [
            ClaimVerificationResult(
                id="c1",
                text="Some claim.",
                status=VerificationStatus.INSUFFICIENT,
                confidence=0.5,
            )
        ]
        score, level = calculate_overall_risk(claims)
        self.assertEqual(score, 50.0)
        self.assertEqual(level, RiskLevel.MEDIUM)

    def test_calculate_overall_risk_mixed(self):
        claims = [
            VerificationStatus.SUPPORTED,     # 0.0
            VerificationStatus.CONTRADICTED,  # 1.0
        ]
        # (0 + 1) / 2 * 100 = 50.0 -> MEDIUM
        score, level = calculate_overall_risk(claims)
        self.assertEqual(score, 50.0)
        self.assertEqual(level, RiskLevel.MEDIUM)

    def test_calculate_confidence_default_weights(self):
        # 0.5 * 0.9 + 0.3 * 0.8 + 0.2 * 1.0 = 0.45 + 0.24 + 0.20 = 0.89
        conf = calculate_confidence(
            nli_confidence=0.9,
            retrieval_relevance=0.8,
            source_reliability=1.0,
        )
        self.assertAlmostEqual(conf, 0.89, places=2)

    def test_calculate_confidence_custom_weights(self):
        conf = calculate_confidence(
            nli_confidence=1.0,
            retrieval_relevance=0.0,
            source_reliability=0.0,
            w_nli=1.0,
            w_retrieval=0.0,
            w_source=0.0,
        )
        self.assertAlmostEqual(conf, 1.0, places=2)


if __name__ == "__main__":
    unittest.main()
