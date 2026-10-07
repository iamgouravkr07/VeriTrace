# VeriTrace — Member 1 Integration Guide

## 1. Overview & Architecture

**Member 1** is responsible for Team Lead + Backend / Integration. This guide provides the complete contracts, interfaces, and integration details for:
- **Member 2 (Frontend)**: API schemas and endpoint behavior.
- **Member 3 (Retrieval Engine)**: Pluggable evidence retrieval protocol.
- **Member 4 (NLI / Verification)**: Pluggable claim verification protocol.

```
       [ Client / Frontend ]
                 │
                 ▼  POST /api/v1/verify
   ┌───────────────────────────────────────────────┐
   │         FastAPI App (app/main.py)             │
   │      app/api/verify.py (/api/v1/verify)       │
   └──────────────────────┬────────────────────────┘
                          │
                          ▼
   ┌───────────────────────────────────────────────┐
   │     VerificationOrchestrator                  │
   │     (app/services/orchestrator.py)            │
   │                                               │
   │  1. Extract Claims (Gemini LLM Gateway)       │
   │  2. Retrieve Evidence (Member 3 Interface)    │
   │  3. Verify Claims (Member 4 Interface)        │
   │  4. Confidence Score (Weighted Integration)   │
   │  5. Overall Hallucination Risk Score          │
   └───────────────────────────────────────────────┘
```

---

## 2. API Contract for Member 2 (Frontend)

### Endpoints

#### `GET /health`
- **Purpose**: Health check probe.
- **Response**:
```json
{
  "status": "healthy",
  "service": "veritrace"
}
```

#### `POST /api/v1/verify`
- **Request Body**:
```json
{
  "question": "What is the capital of Australia?",
  "answer": "Sydney is the capital of Australia.",
  "demo_mode": false
}
```
*Note*: `demo_mode` is optional (defaults to `false`). When set to `true`, verification executes deterministically without making external LLM or network requests.

- **Response Body**:
```json
{
  "overall_risk": 100.0,
  "risk_level": "CRITICAL",
  "claims": [
    {
      "id": "c1",
      "text": "Sydney is the capital of Australia.",
      "status": "CONTRADICTED",
      "confidence": 0.98,
      "reasoning": "The retrieved official gazette states that Canberra is the designated capital of Australia, directly contradicting Sydney.",
      "citations": [
        {
          "source": "Australian Government Directory (Precomputed Demo Evidence)",
          "url": "https://www.australia.gov.au/about-government",
          "evidence": "Canberra was selected as the location for the national capital in 1908 as a compromise between Sydney and Melbourne.",
          "page": null,
          "relevance_score": 0.96
        }
      ]
    }
  ],
  "execution_time_ms": 12.4,
  "is_demo": false,
  "metadata": {
    "claim_count": 1
  }
}
```

### Enums
- `VerificationStatus`:
  - `SUPPORTED`
  - `CONTRADICTED`
  - `INSUFFICIENT`
- `RiskLevel`:
  - `LOW` (0 – 20)
  - `MEDIUM` (21 – 50)
  - `HIGH` (51 – 80)
  - `CRITICAL` (81 – 100)

---

## 3. Interface for Member 3 (Retrieval Engine)

Location: [`backend/app/retrieval/interface.py`](file:///D:/project/VeriTrace/backend/app/retrieval/interface.py)

Member 3 implements the `EvidenceRetriever` protocol:

```python
from typing import List, Protocol
from app.schemas.evidence import EvidenceItem

class EvidenceRetriever(Protocol):
    def retrieve_evidence(self, claim: str, top_k: int = 3) -> List[EvidenceItem]:
        ...
```

### Output Format
Member 3's function or class method can return either a list of `EvidenceItem` instances or dictionaries with keys:
```python
[
    {
        "text": "Canberra is the capital of Australia.",
        "source": "Official Gazetteer",
        "url": "https://example.com/canberra",
        "page": 1,
        "relevance_score": 0.95
    }
]
```

### Plugging in Member 3's implementation
In [`backend/app/api/verify.py`](file:///D:/project/VeriTrace/backend/app/api/verify.py):
```python
from app.retrieval.vector_store import Member3VectorStoreRetriever

orchestrator = VerificationOrchestrator(
    retriever=Member3VectorStoreRetriever(...)
)
```

---

## 4. Interface for Member 4 (NLI / Verification Model)

Location: [`backend/app/verification/verifier.py`](file:///D:/project/VeriTrace/backend/app/verification/verifier.py)

Member 4 implements the `ClaimVerifier` protocol:

```python
from typing import Any, Dict, List, Protocol
from app.schemas.evidence import EvidenceItem

class ClaimVerifier(Protocol):
    def verify_claim(self, claim: str, evidence: List[EvidenceItem]) -> Dict[str, Any]:
        ...
```

### Output Format
Member 4's verifier returns a dictionary:
```python
{
    "status": "SUPPORTED",   # "SUPPORTED" | "CONTRADICTED" | "INSUFFICIENT"
    "confidence": 0.94,      # float between 0.0 and 1.0
    "reasoning": "Cross-encoder NLI model indicates entailment with high probability."
}
```

### Plugging in Member 4's implementation
```python
from app.verification.nli import Member4NLIModel

orchestrator = VerificationOrchestrator(
    verifier=Member4NLIModel(...)
)
```

---

## 5. Scoring & Confidence Formulations

### Confidence Calculation
Located in [`backend/app/verification/confidence.py`](file:///D:/project/VeriTrace/backend/app/verification/confidence.py):
$$\text{confidence} = \frac{w_{\text{nli}} \cdot c_{\text{nli}} + w_{\text{retrieval}} \cdot r_{\text{retrieval}} + w_{\text{source}} \cdot s_{\text{source}}}{w_{\text{nli}} + w_{\text{retrieval}} + w_{\text{source}}}$$
- Defaults: $w_{\text{nli}} = 0.5$, $w_{\text{retrieval}} = 0.3$, $w_{\text{source}} = 0.2$. Configurable via environment variables.

### Hallucination Risk Calculation
Located in [`backend/app/scoring/risk.py`](file:///D:/project/VeriTrace/backend/app/scoring/risk.py):
$$\text{overall\_risk} = \frac{\sum \text{penalties}}{N} \times 100$$
- `SUPPORTED`: penalty 0.0
- `INSUFFICIENT`: penalty 0.5
- `CONTRADICTED`: penalty 1.0
- Risk Tiers:
  - 0–20: **LOW**
  - 21–50: **MEDIUM**
  - 51–80: **HIGH**
  - 81–100: **CRITICAL**

---

## 6. Environment Configuration

Create a `.env` file in `backend/` or set environment variables:
```env
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.0-flash"
LLM_TIMEOUT_SECONDS=30.0
DEMO_MODE_DEFAULT=false

WEIGHT_NLI=0.5
WEIGHT_RETRIEVAL=0.3
WEIGHT_SOURCE=0.2

THRESHOLD_LOW_MAX=20.0
THRESHOLD_MEDIUM_MAX=50.0
THRESHOLD_HIGH_MAX=80.0
```

---

## 7. Running Tests

```powershell
cd D:\project\VeriTrace\backend
.\venv\Scripts\python.exe -m pytest -v
```
All 50 unit and integration tests run offline without requiring external network calls or a live Gemini key.
