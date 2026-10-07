# VeriTrace — Backend

FastAPI middleware for automated hallucination detection and factual verification.

## Setup & Running

### 1. Activate Environment
```powershell
cd D:\project\VeriTrace\backend
.\venv\Scripts\activate
```

### 2. Configure Environment
Copy `.env.example` or set:
```env
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Start Development Server
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Health Check: `GET http://localhost:8000/health`
- Verification Endpoint: `POST http://localhost:8000/api/v1/verify`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

### 4. Run Unit and Integration Tests
```powershell
pytest -v
```

See [docs/MEMBER1_INTEGRATION_GUIDE.md](../docs/MEMBER1_INTEGRATION_GUIDE.md) for details on integrating Member 3 (retrieval) and Member 4 (NLI).
