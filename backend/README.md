# VeriTrace — Backend

FastAPI middleware for automated hallucination detection and factual verification.

## Architecture & LLM Provider Independence

VeriTrace decouples higher-level logic (claim extraction, verification) from specific LLM providers via a unified `LLMGateway`:

```
                    VeriTrace
                       |
                  LLM Gateway (LLMGateway)
                    /     \
               Gemini      Grok (xAI)
                 |           |
        GEMINI_API_KEY    XAI_API_KEY
```

The rest of the system (claim extraction, evidence retrieval, verification/NLI, risk scoring) operates identically regardless of the underlying LLM provider.

---

## Setup & Running

### 1. Activate Environment
```powershell
cd D:\project\VeriTrace\backend
.\venv\Scripts\activate
```

### 2. Configure Environment

Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```

#### Provider Selection
Switch providers via `LLM_PROVIDER`:
```env
# Use Google Gemini (default)
LLM_PROVIDER=gemini

# Or use xAI Grok
LLM_PROVIDER=grok
```

#### Optional Fallback Provider
By default, provider execution is strict and will not silently fail over. To explicitly enable failover:
```env
LLM_FALLBACK_PROVIDER=gemini
```

#### Gemini Configuration
```env
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.0-flash"
```

#### Grok / xAI Configuration
```env
XAI_API_KEY="your-xai-api-key"
XAI_BASE_URL="https://api.x.ai/v1"
GROK_MODEL="grok-4.7"
```

> **SECURITY WARNING**: Never commit real API keys to version control. Keep `.env` ignored by git. API keys are strictly consumed server-side and are never exposed to clients or in error messages.

---

### 3. Start Development Server
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Health Check: `GET http://localhost:8000/health`
- Full Answer Verification: `POST http://localhost:8000/api/v1/verify`
- Direct Claim Verification: `POST http://localhost:8000/api/v1/verify/claim`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

---

### 4. Run Tests

Run the full automated test suite:
```powershell
python -m pytest -q
```

All unit tests use mocked provider clients and do NOT require live API keys.
