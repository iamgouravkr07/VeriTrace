import logging
from typing import Any, List, Optional

from pydantic import ValidationError

from app.core.exceptions import ClaimExtractionError, LLMError
from app.llm.gateway import LLMGateway
from app.llm.gemini import GeminiGateway
from app.llm.prompts import (
    CLAIM_EXTRACTION_SYSTEM_PROMPT,
    CLAIM_EXTRACTION_USER_PROMPT,
)
from app.schemas.claim import ExtractedClaim
from app.utils.text import split_sentences

logger = logging.getLogger(__name__)


class ClaimExtractor:
    """Extracts atomic, verifiable claims from LLM-generated text using LLMGateway."""

    def __init__(
        self,
        gateway: Optional[LLMGateway] = None,
        allow_rule_fallback: bool = True,
    ):
        self.gateway = gateway or GeminiGateway()
        self.allow_rule_fallback = allow_rule_fallback

    def extract_claims(
        self,
        answer: str,
        question: Optional[str] = None,
    ) -> List[ExtractedClaim]:
        """Extract atomic claims from the provided answer string."""
        if not answer or not answer.strip():
            return []

        cleaned_answer = answer.strip()
        context_section = f"Original Question: {question.strip()}\n" if question and question.strip() else ""
        prompt = CLAIM_EXTRACTION_USER_PROMPT.format(
            context_section=context_section,
            answer=cleaned_answer,
        )

        try:
            raw_response = self.gateway.generate_json(
                prompt=prompt,
                system_instruction=CLAIM_EXTRACTION_SYSTEM_PROMPT,
            )
            claims = self._parse_and_validate_claims(raw_response)
            if not claims and self.allow_rule_fallback:
                logger.warning("LLM returned no claims; applying sentence-splitting fallback")
                return self._fallback_rule_extraction(cleaned_answer)
            return claims

        except LLMError as e:
            logger.warning("LLM error during claim extraction: %s", e)
            if self.allow_rule_fallback:
                logger.info("Falling back to rule-based sentence segmentation for claim extraction")
                return self._fallback_rule_extraction(cleaned_answer)
            raise ClaimExtractionError(f"Claim extraction failed due to LLM error: {e}") from e
        except Exception as e:
            logger.error("Unexpected error in claim extraction: %s", e)
            if self.allow_rule_fallback:
                return self._fallback_rule_extraction(cleaned_answer)
            raise ClaimExtractionError(f"Claim extraction encountered unexpected error: {e}") from e

    def _parse_and_validate_claims(self, raw_data: Any) -> List[ExtractedClaim]:
        """Parse and validate raw JSON structure into a list of ExtractedClaim objects."""
        items = []

        if isinstance(raw_data, list):
            items = raw_data
        elif isinstance(raw_data, dict):
            # Try common wrapper keys
            for key in ("claims", "extracted_claims", "data", "results"):
                if key in raw_data and isinstance(raw_data[key], list):
                    items = raw_data[key]
                    break
            if not items:
                # If dict itself represents a single claim
                if "text" in raw_data or "claim" in raw_data:
                    items = [raw_data]

        valid_claims: List[ExtractedClaim] = []
        for idx, item in enumerate(items, start=1):
            claim_id = f"c{idx}"
            claim_text = ""

            if isinstance(item, str):
                claim_text = item.strip()
            elif isinstance(item, dict):
                claim_id = str(item.get("id") or f"c{idx}").strip()
                claim_text = str(item.get("text") or item.get("claim") or "").strip()

            if claim_text:
                try:
                    valid_claims.append(
                        ExtractedClaim(id=claim_id, text=claim_text)
                    )
                except ValidationError as e:
                    logger.debug("Skipping invalid claim item %s: %s", item, e)

        return valid_claims

    def _fallback_rule_extraction(self, text: str) -> List[ExtractedClaim]:
        """Rule-based fallback if LLM extraction fails or is unavailable."""
        sentences = split_sentences(text)
        return [
            ExtractedClaim(id=f"c{i}", text=s)
            for i, s in enumerate(sentences, start=1)
            if s.strip()
        ]
