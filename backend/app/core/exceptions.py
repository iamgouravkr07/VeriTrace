class VeriTraceException(Exception):
    """Base exception for all VeriTrace errors."""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class LLMError(VeriTraceException):
    """Base exception for LLM-related errors."""
    pass


class LLMConfigurationError(LLMError):
    """Raised when LLM configuration (e.g. API key) is missing or invalid."""
    pass


class LLMTimeoutError(LLMError):
    """Raised when an LLM API call times out."""
    pass


class LLMQuotaExceededError(LLMError):
    """Raised when LLM API quota or rate limit is exceeded."""
    pass


class LLMResponseMalformedError(LLMError):
    """Raised when LLM returns invalid or unparseable output."""
    pass


class LLMAPIError(LLMError):
    """Raised when an unexpected LLM API error occurs."""
    pass


class ClaimExtractionError(VeriTraceException):
    """Raised when claim extraction fails."""
    pass


class RetrievalError(VeriTraceException):
    """Raised when evidence retrieval fails."""
    pass


class VerificationError(VeriTraceException):
    """Raised when claim verification fails."""
    pass
