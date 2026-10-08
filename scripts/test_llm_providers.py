#!/usr/bin/env python3
"""Developer Smoke Test Script for VeriTrace LLM Providers.

Usage:
    python scripts/test_llm_providers.py [--provider all|gemini|grok] [--timeout 15.0]

This script tests live connectivity and functionality for configured LLM providers.
It NEVER prints, logs, or exposes secret API keys.
"""

import argparse
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict

# Ensure backend directory is in sys.path
repo_root = Path(__file__).resolve().parent.parent
backend_dir = repo_root / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Load .env if present
try:
    from dotenv import load_dotenv

    dotenv_path = backend_dir / ".env"
    if dotenv_path.exists():
        load_dotenv(dotenv_path)
    else:
        load_dotenv()
except ImportError:
    pass

from app.core.config import settings
from app.core.exceptions import (
    LLMAPIError,
    LLMConfigurationError,
    LLMError,
    LLMQuotaExceededError,
    LLMResponseMalformedError,
    LLMTimeoutError,
)
from app.llm.gemini import GeminiGateway
from app.llm.grok import GrokGateway


# Explicitly tell pytest NOT to collect this script as an automated test suite
__test__ = False


def mask_key(key: str) -> str:
    """Return safe masked representation of an API key."""
    if not key:
        return "[NOT CONFIGURED]"
    clean = key.strip()
    if len(clean) <= 8:
        return f"*** ({len(clean)} chars)"
    return f"{clean[:4]}...{clean[-4:]} ({len(clean)} chars)"


def run_gemini_smoke_test(timeout: float = 15.0) -> Dict[str, Any]:
    """Smoke test Google Gemini provider."""
    print("\n" + "=" * 60)
    print("TESTING PROVIDER: Google Gemini")
    print("=" * 60)

    key_present = bool(settings.GEMINI_API_KEY.strip())
    masked = mask_key(settings.GEMINI_API_KEY)
    print(f"API Key Status : {'CONFIGURED' if key_present else 'MISSING'} {masked}")
    print(f"Configured Model: {settings.GEMINI_MODEL}")

    if not key_present:
        return {
            "provider": "gemini",
            "model": settings.GEMINI_MODEL,
            "configured": False,
            "success": False,
            "error": "GEMINI_API_KEY is not configured in environment/.env",
            "text_latency_ms": None,
            "json_latency_ms": None,
        }

    gateway = GeminiGateway(timeout=timeout)
    result = {
        "provider": "gemini",
        "model": gateway.model_name,
        "configured": True,
        "success": False,
        "text_latency_ms": None,
        "json_latency_ms": None,
        "error": None,
    }

    # 1. Test Text Generation
    print("1. Testing text generation (ping)...")
    start = time.perf_counter()
    try:
        text_resp = gateway.generate_text("Reply with exactly: PONG")
        latency_ms = round((time.perf_counter() - start) * 1000.0, 1)
        result["text_latency_ms"] = latency_ms
        print(f"   [SUCCESS] Latency: {latency_ms} ms | Response: {text_resp[:80]}")
    except LLMConfigurationError as e:
        print(f"   [FAILED] Configuration/Auth Error: {e}")
        result["error"] = f"Configuration error: {e}"
        return result
    except LLMQuotaExceededError as e:
        print(f"   [FAILED] Quota/Rate Limit Error: {e}")
        result["error"] = f"Quota exceeded: {e}"
        return result
    except LLMTimeoutError as e:
        print(f"   [FAILED] Request Timeout: {e}")
        result["error"] = f"Timeout: {e}"
        return result
    except Exception as e:
        print(f"   [FAILED] Unexpected Error: {type(e).__name__}: {e}")
        result["error"] = f"{type(e).__name__}: {e}"
        return result

    # 2. Test JSON Generation
    print("2. Testing JSON generation (claim extractor simulation)...")
    start = time.perf_counter()
    try:
        json_resp = gateway.generate_json(
            "Return a JSON object with key 'status' set to 'ok' and key 'items' set to a list with 1 item."
        )
        latency_ms = round((time.perf_counter() - start) * 1000.0, 1)
        result["json_latency_ms"] = latency_ms
        print(f"   [SUCCESS] Latency: {latency_ms} ms | Response: {json_resp}")
        result["success"] = True
    except Exception as e:
        print(f"   [FAILED] JSON Generation Error: {type(e).__name__}: {e}")
        result["error"] = f"JSON generation failed: {e}"
        return result

    return result


def run_grok_smoke_test(timeout: float = 15.0) -> Dict[str, Any]:
    """Smoke test xAI Grok provider."""
    print("\n" + "=" * 60)
    print("TESTING PROVIDER: xAI Grok")
    print("=" * 60)

    key_present = bool(settings.XAI_API_KEY.strip())
    masked = mask_key(settings.XAI_API_KEY)
    print(f"API Key Status : {'CONFIGURED' if key_present else 'MISSING'} {masked}")
    print(f"Configured Model: {settings.GROK_MODEL}")
    print(f"Base URL        : {settings.XAI_BASE_URL}")

    if not key_present:
        return {
            "provider": "grok",
            "model": settings.GROK_MODEL,
            "configured": False,
            "success": False,
            "error": "XAI_API_KEY is not configured in environment/.env",
            "text_latency_ms": None,
            "json_latency_ms": None,
        }

    gateway = GrokGateway(timeout=timeout)
    result = {
        "provider": "grok",
        "model": gateway.model_name,
        "configured": True,
        "success": False,
        "text_latency_ms": None,
        "json_latency_ms": None,
        "error": None,
    }

    # 1. Test Text Generation
    print("1. Testing chat completion...")
    start = time.perf_counter()
    try:
        text_resp = gateway.generate_text("Reply with exactly: PONG")
        latency_ms = round((time.perf_counter() - start) * 1000.0, 1)
        result["text_latency_ms"] = latency_ms
        print(f"   [SUCCESS] Latency: {latency_ms} ms | Response: {text_resp[:80]}")
        result["success"] = True
    except LLMQuotaExceededError as e:
        print(f"   [FAILED] Account Credits / Quota Error: {e}")
        print("   Diagnosis: Valid API key recognized by xAI, but team account has 0 credits or no active billing license.")
        result["error"] = str(e)
    except LLMConfigurationError as e:
        print(f"   [FAILED] Authentication Error: {e}")
        result["error"] = str(e)
    except LLMTimeoutError as e:
        print(f"   [FAILED] Request Timeout: {e}")
        result["error"] = str(e)
    except Exception as e:
        print(f"   [FAILED] API Error: {type(e).__name__}: {e}")
        result["error"] = f"{type(e).__name__}: {e}"

    return result


def main():
    parser = argparse.ArgumentParser(description="VeriTrace Live LLM Providers Smoke Test")
    parser.add_argument(
        "--provider",
        choices=["all", "gemini", "grok"],
        default="all",
        help="Provider to test (default: all)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=15.0,
        help="HTTP request timeout in seconds (default: 15.0)",
    )
    args = parser.parse_args()

    results = []
    if args.provider in ("all", "gemini"):
        results.append(run_gemini_smoke_test(timeout=args.timeout))

    if args.provider in ("all", "grok"):
        results.append(run_grok_smoke_test(timeout=args.timeout))

    # Print Summary Table
    print("\n" + "=" * 60)
    print("PROVIDER TEST SUMMARY")
    print("=" * 60)
    print(f"{'Provider':<10} | {'Model':<20} | {'Status':<10} | {'Latency':<10}")
    print("-" * 60)
    for r in results:
        status_str = "PASS" if r["success"] else "FAIL"
        latency_str = f"{r['text_latency_ms']} ms" if r["text_latency_ms"] is not None else "N/A"
        print(f"{r['provider']:<10} | {r['model']:<20} | {status_str:<10} | {latency_str:<10}")
        if r.get("error"):
            print(f"  -> Error: {r['error']}")
    print("=" * 60 + "\n")

    # If at least Gemini succeeded (our primary provider), return 0 so CI/local tests remain informative
    gemini_result = next((r for r in results if r["provider"] == "gemini"), None)
    if gemini_result and gemini_result["success"]:
        sys.exit(0)
    elif all(r["success"] for r in results):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
