import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.exceptions import (
    ClaimExtractionError,
    LLMAPIError,
    LLMConfigurationError,
    LLMQuotaExceededError,
    LLMResponseMalformedError,
    LLMTimeoutError,
    RetrievalError,
    VerificationError,
    VeriTraceException,
)
from app.schemas.request import VerifyRequest
from app.schemas.response import VerifyResponse
from app.services.orchestrator import VerificationOrchestrator

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Verification"])

# Default singleton orchestrator instance (can be overridden in tests via dependency overrides)
_default_orchestrator: VerificationOrchestrator = None


def get_orchestrator() -> VerificationOrchestrator:
    global _default_orchestrator
    if _default_orchestrator is None:
        _default_orchestrator = VerificationOrchestrator()
    return _default_orchestrator


@router.post(
    "/verify",
    response_model=VerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify factual claims in an LLM answer",
    description="Extracts claims from an answer, retrieves evidence, verifies each claim, and computes overall hallucination risk.",
)
def verify_answer_endpoint(
    request: VerifyRequest,
    orchestrator: VerificationOrchestrator = Depends(get_orchestrator),
) -> VerifyResponse:
    try:
        return orchestrator.verify_answer(request)

    except LLMConfigurationError as e:
        logger.error("LLM configuration error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM service is unconfigured. Please provide GEMINI_API_KEY or enable demo_mode.",
        ) from e

    except LLMQuotaExceededError as e:
        logger.warning("LLM quota exceeded: %s", e)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="LLM rate limit or quota exceeded. Please try again later or enable demo_mode.",
        ) from e

    except LLMTimeoutError as e:
        logger.warning("LLM call timed out: %s", e)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Upstream LLM service timed out.",
        ) from e

    except (LLMResponseMalformedError, ClaimExtractionError) as e:
        logger.error("Claim extraction error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to parse claims from the language model.",
        ) from e

    except (RetrievalError, VerificationError) as e:
        logger.error("Pipeline component error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="A verification pipeline dependency failed to execute.",
        ) from e

    except VeriTraceException as e:
        logger.error("VeriTrace application error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during verification processing.",
        ) from e

    except Exception as e:
        # Prevent stack trace or credential leakage
        logger.exception("Unhandled internal exception during verification: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred.",
        ) from e
