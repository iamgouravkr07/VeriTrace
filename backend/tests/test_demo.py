import unittest

from app.schemas.request import VerifyRequest
from app.schemas.verification import RiskLevel, VerificationStatus
from app.services.demo import DemoService


class TestDemoMode(unittest.TestCase):
    def setUp(self):
        self.demo = DemoService()

    def test_demo_contradicted_australia(self):
        req = VerifyRequest(
            question="What is the capital of Australia?",
            answer="Sydney is the capital of Australia.",
            demo_mode=True,
        )
        res = self.demo.run_demo(req)
        self.assertTrue(res.is_demo)
        self.assertEqual(res.overall_risk, 100.0)
        self.assertEqual(res.risk_level, RiskLevel.CRITICAL)
        self.assertEqual(len(res.claims), 1)
        self.assertEqual(res.claims[0].status, VerificationStatus.CONTRADICTED)
        self.assertIn("Canberra", res.claims[0].citations[0].evidence)
        self.assertIn("Precomputed Demo Evidence", res.claims[0].citations[0].source)

    def test_demo_supported_france(self):
        req = VerifyRequest(
            question="What is the capital of France?",
            answer="Paris is the capital of France.",
            demo_mode=True,
        )
        res = self.demo.run_demo(req)
        self.assertTrue(res.is_demo)
        self.assertEqual(res.overall_risk, 0.0)
        self.assertEqual(res.risk_level, RiskLevel.LOW)
        self.assertEqual(len(res.claims), 1)
        self.assertEqual(res.claims[0].status, VerificationStatus.SUPPORTED)
        self.assertIn("Paris", res.claims[0].citations[0].evidence)

    def test_demo_mixed_claims(self):
        req = VerifyRequest(
            question="Tell me about France and Australia.",
            answer="Paris is the capital of France. Sydney is the capital of Australia.",
            demo_mode=True,
        )
        res = self.demo.run_demo(req)
        self.assertTrue(res.is_demo)
        self.assertEqual(res.overall_risk, 50.0)
        self.assertEqual(res.risk_level, RiskLevel.MEDIUM)
        self.assertEqual(len(res.claims), 2)
        statuses = [c.status for c in res.claims]
        self.assertIn(VerificationStatus.SUPPORTED, statuses)
        self.assertIn(VerificationStatus.CONTRADICTED, statuses)


if __name__ == "__main__":
    unittest.main()
