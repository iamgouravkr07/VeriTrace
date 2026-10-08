from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.verify import router as verify_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: eagerly initialize orchestrator and load knowledge documents into memory
    try:
        from app.api.verify import get_orchestrator
        orch = get_orchestrator()
        logger.info("VeriTrace retrieval orchestrator initialized on startup.")
    except Exception as e:
        logger.warning("VeriTrace startup preloading notice: %s", e)
    yield


app = FastAPI(
    title="VeriTrace API",
    description="Hallucination Detection and Verification Middleware",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


# Standard CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Preserve existing health check endpoint
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "veritrace",
    }


# Register verification routes under /api/v1
app.include_router(verify_router, prefix="/api/v1")
