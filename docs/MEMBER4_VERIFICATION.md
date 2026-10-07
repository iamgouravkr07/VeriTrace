# VeriTrace — Member 4: Verification / NLI Engine

## 1. Responsibility Overview
**Member 4** is responsible for the Natural Language Inference (NLI) and factual verification layer of VeriTrace. This layer takes an atomic factual claim alongside retrieved evidence passages, determines whether the evidence entails, contradicts, or fails to prove the claim, and computes calibrated confidence and hallucination risk scores.

Key characteristics:
- **Strict Grounding**: Evaluates claims against retrieved passages only, rejecting reliance on unstated outside world knowledge.
- **Anti-Prompt-Injection**: Isolates untrusted claims and evidence using delimiter tags (`<untrusted_claim>`, `<untrusted_evidence_item>`) and strict directives preventing prompt hijacking.
- **Controlled Verdicts**: Enforces a controlled vocabulary (`SUPPORTED`, `CONTRADICTED`, `INSUFFICIENT_EVIDENCE`).
- **Keyword Trap Defense**: Ensures true semantic entailment rather than superficial keyword matching.
- **Evidence Attribution**: Tracks and reports exact supporting and contradicting source passages.

---

## 2. Architecture & Pipeline Flow

```
User Answer / Query
        ↓
ClaimExtractor (Gemini LLM / Rule Fallback)
        ↓
EvidenceRetriever (Member 3 Protocol)
        ↓
VerificationOrchestrator
        ↓
Member 4 VerificationService
  ├─ Input Sanitization & Truncation
  ├─ Strict Grounded Prompt Construction
  ├─ LLMGateway (Gemini JSON generation)
  ├─ Schema & Range Validation ([0,1] clamping)
  └─ Evidence Attribution Mapping
        ↓
SingleClaimVerificationResult / ClaimVerificationResult
        ↓
Final Response (POST /api/v1/verify or POST /api/v1/verify/claim)
```

---

## 3. Data Contracts & Interfaces

### 3.1 Input Contract
The verifier accepts an atomic claim string and a list of evidence items (`EvidenceItem`, `EvidenceReference`, or raw dictionary):

```python
from app.verification.service import VerificationService

verifier = VerificationService()
result = verifier.verify(
    claim="Sydney is the capital of Australia.",
    evidence=[
        {
            "source_id": "e1",
            "text": "Canberra is the capital city of Australia.",
            "source": "Australian Official Gazette",
            "relevance_score": 0.95
        }
    ]
)
```

### 3.2 Output Contract
Returned as `SingleClaimVerificationResult`:

```json
{
  "claim": "Sydney is the capital of Australia.",
  "verdict": "CONTRADICTED",
  "confidence": 0.96,
  "hallucination_risk": 0.92,
  "reasoning": "The evidence directly establishes that Canberra is the capital city of Australia, refuting the claim that Sydney is the capital.",
  "supporting_evidence": [],
  "contradicting_evidence": [
    {
      "source_id": "e1",
      "text": "Canberra is the capital city of Australia.",
      "source": "Australian Official Gazette",
      "url": null,
      "relevance": 0.95
    }
  ]
}
```

---

## 4. Verdict Definitions & Semantics

| Verdict | Definition | Semantic Requirement |
|---|---|---|
| `SUPPORTED` | Evidence directly and strongly entails the assertion. | The factual proposition asserted in the claim is explicitly affirmed by the evidence. |
| `CONTRADICTED` | Reliable evidence directly refutes or conflicts with the claim. | The evidence proves a mutually exclusive or conflicting factual state of affairs. |
| `INSUFFICIENT_EVIDENCE` | Evidence is related or topical, but fails to definitively establish or refute the claim. | Missing evidence, topical keywords without assertion, or conflicting ambiguous evidence. |

---

## 5. Confidence & Hallucination Risk Interpretation

### Confidence Score (`0.0` – `1.0`)
Measures the certainty and conclusiveness of the evidence supporting the verdict:
- **`0.90 – 1.00` (Very Strong)**: Direct, explicit entailment or refutation from authoritative text.
- **`0.75 – 0.89` (Strong)**: High confidence with minimal ambiguity.
- **`0.50 – 0.74` (Moderate)**: Plausible entailment with minor gaps in coverage.
- **`< 0.50` (Weak)**: Insufficient or fragmented evidence.

### Hallucination Risk Score (`0.0` – `1.0`)
Measures the likelihood that the evaluated claim constitutes an unsupported hallucination:
- **High Risk (`0.70 – 1.00`)**:
  - Evidence is empty, missing, or purely topical.
  - Evidence directly contradicts the claim.
  - Substantial contradiction across sources.
- **Low Risk (`0.00 – 0.30`)**:
  - Multiple concordant sources directly substantiate the claim.
  - No conflicting evidence detected.

---

## 6. Integration with Orchestrator (Member 1)

`VerificationService` implements the `ClaimVerifier` protocol via the method:
```python
def verify_claim(self, claim: str, evidence: List[EvidenceItem]) -> Dict[str, Any]:
    result = self.verify(claim, evidence)
    return result.to_dict()
```

In [`backend/app/services/orchestrator.py`](file:///D:/project/VeriTrace/backend/app/services/orchestrator.py):
```python
self.verifier = verifier or VerificationService()
```
The orchestrator consumes `verify_claim`, extracts `status`, `confidence`, `reasoning`, and `hallucination_risk`. It converts `supporting_evidence` and `contradicting_evidence` references safely into validated `Citation` objects using `convert_to_citations()`, and propagates them directly into `ClaimVerificationResult.supporting_evidence` and `ClaimVerificationResult.contradicting_evidence`. Legacy verifiers without attribution fields default gracefully to empty lists (`[]`) while general retrieval `citations` remain fully intact.

---

## 7. Standalone API Endpoint

Member 4 exposes an isolated claim verification endpoint:

### `POST /api/v1/verify/claim`
**Request Body**:
```json
{
  "claim": "Water freezes at 0 degrees Celsius.",
  "evidence": [
    {
      "source_id": "e1",
      "text": "Under standard atmospheric pressure, the freezing point of water is 0 °C.",
      "source": "Physical Chemistry Handbook",
      "relevance_score": 0.99
    }
  ]
}
```

**Response Body**:
```json
{
  "claim": "Water freezes at 0 degrees Celsius.",
  "verdict": "SUPPORTED",
  "confidence": 0.99,
  "hallucination_risk": 0.01,
  "reasoning": "The evidence directly establishes that water freezes at 0 °C under standard pressure.",
  "supporting_evidence": [
    {
      "source_id": "e1",
      "text": "Under standard atmospheric pressure, the freezing point of water is 0 °C.",
      "source": "Physical Chemistry Handbook",
      "url": null,
      "relevance": 0.99
    }
  ],
  "contradicting_evidence": []
}
```

---

## 8. Failure Behavior & Edge Case Handling

1. **Empty / Whitespace Claim**:
   - Returns `INSUFFICIENT_EVIDENCE`, `confidence = 0.0`, `hallucination_risk = 1.0`.
2. **Empty / Absent Evidence**:
   - Returns `INSUFFICIENT_EVIDENCE`, `confidence = 0.1`, `hallucination_risk = 0.95`.
   - Never calls upstream LLM (saving latency and API tokens).
3. **Upstream LLM Timeout / Quota / Failure**:
   - Catches `LLMError`, falls back safely to `INSUFFICIENT_EVIDENCE`, `confidence = 0.2`, `hallucination_risk = 0.85`.
   - Never exposes internal stack traces or API keys to callers.
4. **Adversarial Prompt Injection in Evidence**:
   - Delimited via `<untrusted_evidence_item>`, preventing system instruction overrides.
5. **Overly Long Evidence Text**:
   - Clamped to 2,000 characters per passage, maximum 10 passages per claim.

---

## 9. Testing Instructions

Run all 64 automated backend tests:
```powershell
cd D:\project\VeriTrace\backend
.\venv\Scripts\python.exe -m pytest -v
```

Run Member 4 specific tests:
```powershell
cd D:\project\VeriTrace\backend
.\venv\Scripts\python.exe -m pytest -v tests/test_member4_verification.py
```
*Note*: All tests use mock implementations of `LLMGateway` and do not require internet access or a live Gemini API key.
