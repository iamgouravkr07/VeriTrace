import os
from typing import Dict, Optional
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in current working dir, backend directory, or repository root
_current_dir = Path(__file__).resolve().parent
_backend_dir = _current_dir.parent.parent  # backend/
_root_dir = _backend_dir.parent  # repo root/

for candidate in (_backend_dir / ".env", _root_dir / ".env", Path(".env")):
    if candidate.is_file():
        load_dotenv(dotenv_path=candidate)
        break
else:
    load_dotenv()



class Settings:
    PROJECT_NAME: str = "VeriTrace"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    # LLM Provider Selection ("gemini" or "grok")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini").lower().strip()
    LLM_FALLBACK_PROVIDER: Optional[str] = os.getenv("LLM_FALLBACK_PROVIDER", "").lower().strip() or None

    # Gemini LLM Settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-flash-latest").strip()

    # Grok / xAI LLM Settings
    XAI_API_KEY: str = os.getenv("XAI_API_KEY", "").strip()
    XAI_BASE_URL: str = os.getenv("XAI_BASE_URL", "https://api.x.ai/v1").strip()
    GROK_MODEL: str = os.getenv("GROK_MODEL", "grok-2-latest").strip()

    # Shared LLM Parameters
    LLM_TIMEOUT_SECONDS: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "30.0"))
    LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.0"))

    # Demo Mode
    DEMO_MODE_DEFAULT: bool = os.getenv("DEMO_MODE_DEFAULT", "false").lower() in ("true", "1", "yes")

    # Scoring Weights (configurable prototype formula)
    # confidence = 0.5 * nli_confidence + 0.3 * retrieval_relevance + 0.2 * source_reliability
    WEIGHT_NLI: float = float(os.getenv("WEIGHT_NLI", "0.5"))
    WEIGHT_RETRIEVAL: float = float(os.getenv("WEIGHT_RETRIEVAL", "0.3"))
    WEIGHT_SOURCE: float = float(os.getenv("WEIGHT_SOURCE", "0.2"))

    # Risk Penalty per Status (prototype values)
    # SUPPORTED -> 0.0, INSUFFICIENT -> 0.5, CONTRADICTED -> 1.0
    RISK_PENALTY_MAP: Dict[str, float] = {
        "SUPPORTED": 0.0,
        "INSUFFICIENT": 0.5,
        "CONTRADICTED": 1.0,
    }

    # Risk Level Thresholds:
    # 0-20 LOW, 21-50 MEDIUM, 51-80 HIGH, 81-100 CRITICAL
    THRESHOLD_LOW_MAX: float = float(os.getenv("THRESHOLD_LOW_MAX", "20.0"))
    THRESHOLD_MEDIUM_MAX: float = float(os.getenv("THRESHOLD_MEDIUM_MAX", "50.0"))
    THRESHOLD_HIGH_MAX: float = float(os.getenv("THRESHOLD_HIGH_MAX", "80.0"))

    # Retrieval & Reranking Settings
    RETRIEVAL_TOP_K_CANDIDATES: int = int(os.getenv("RETRIEVAL_TOP_K_CANDIDATES", "10"))
    RETRIEVAL_TOP_K_EVIDENCE: int = int(os.getenv("RETRIEVAL_TOP_K_EVIDENCE", "3"))
    RETRIEVAL_MIN_RELEVANCE: float = float(os.getenv("RETRIEVAL_MIN_RELEVANCE", "0.15"))


settings = Settings()
