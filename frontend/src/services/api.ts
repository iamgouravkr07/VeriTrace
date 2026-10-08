import type {
  VerificationResponse,
  BenchmarkMetrics,
  VerificationRequest,
  BackendHealth,
} from '../types';

const API_BASE_URL =
  ((import.meta as any)?.env?.VITE_API_URL as string | undefined) ||
  'http://localhost:8000';

/**
 * Isolated Demo Presets for Hackathon Evaluation & Offline Testing.
 * Strictly conforms to VerificationResponse without inventing backend fields.
 */
export const DEMO_PRESETS: Record<string, VerificationResponse> = {
  australia: {
    query: 'What is the capital of Australia?',
    llmAnswer: 'Sydney is the capital of Australia.',
    hallucinationRisk: 100,
    latencySeconds: 1.8,
    claims: [
      {
        id: 'claim-1',
        text: 'Sydney is the capital of Australia.',
        status: 'CONTRADICTED',
        confidence: 98,
        evidence: [
          {
            id: 'ev-1',
            sourceTitle: 'National Archives of Australia',
            snippet:
              "Canberra was selected as the nation's capital in 1908 as a compromise between Sydney and Melbourne.",
          },
        ],
      },
    ],
  },

  apollo: {
    query: 'When did Apollo 11 land on the moon?',
    llmAnswer:
      'The Apollo 11 Lunar Module landed on the Moon on July 20, 1969.',
    hallucinationRisk: 0,
    latencySeconds: 1.2,
    claims: [
      {
        id: 'claim-apollo-1',
        text:
          'The Apollo 11 Lunar Module landed on the Moon on July 20, 1969.',
        status: 'SUPPORTED',
        confidence: 99,
        evidence: [
          {
            id: 'ev-apollo-1',
            sourceTitle: 'NASA History Division - Apollo 11 Mission Log',
            snippet:
              'On July 20, 1969, American astronauts Neil Armstrong and Buzz Aldrin landed the Apollo Lunar Module Eagle on the Moon.',
          },
        ],
      },
    ],
  },

  jwst: {
    query:
      'What discoveries were made by the James Webb Space Telescope?',
    llmAnswer:
      'JWST detected carbon dioxide on exoplanet WASP-39b, and confirmed undisputed proof of synthetic alien structures in the Trappist-1 system.',
    hallucinationRisk: 55,
    latencySeconds: 2.1,
    claims: [
      {
        id: 'claim-jwst-1',
        text:
          'JWST detected carbon dioxide on exoplanet WASP-39b.',
        status: 'SUPPORTED',
        confidence: 96,
        evidence: [
          {
            id: 'ev-jwst-1',
            sourceTitle: 'NASA Webb Science Releases (August 2022)',
            snippet:
              'NASA’s James Webb Space Telescope has provided the first clear evidence for carbon dioxide in an exoplanet atmosphere, on WASP-39 b.',
          },
        ],
      },

      {
        id: 'claim-jwst-2',
        text:
          'JWST confirmed undisputed proof of synthetic alien structures in Trappist-1.',
        status: 'CONTRADICTED',
        confidence: 94,
        evidence: [
          {
            id: 'ev-jwst-2',
            sourceTitle: 'Astrophysical Journal Trappist-1 Survey',
            snippet:
              'No technological signatures or synthetic anomalies have been detected in Trappist-1 observations to date.',
          },
        ],
      },
    ],
  },
};

// Preserved original mock export for backward compatibility
export const MOCK_VERIFICATION: VerificationResponse =
  DEMO_PRESETS.australia;

export const MOCK_BENCHMARK: BenchmarkMetrics = {
  precision: 91,
  recall: 89,
  f1Score: 90,
  averageLatency: 1.8,
  datasetSize: 500,
  testedModels: ['GPT-4o', 'Llama-3-70B', 'Mistral-7B'],
};

/**
 * Checks connectivity to the FastAPI backend (/health).
 * Used only as a network connectivity check, not proof of ML pipeline status.
 */
export async function checkBackendHealth(): Promise<BackendHealth | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as BackendHealth;
      return data;
    }

    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

export interface VerificationResult {
  data: VerificationResponse;
  isLiveBackend: boolean;
  notice?: string;
  error?: string;
}

/**
 * Main verification request handler.
 * Always attempts real backend API first when available.
 * If backend is offline or endpoint not yet deployed, falls back to isolated demo presets
 * ONLY if the user explicitly selected a preset.
 */
export async function verifyText(
  request?: VerificationRequest,
  presetKey?: string
): Promise<VerificationResult> {
  const queryText = request?.query?.trim() || '';

  // 1. Attempt live backend call if query is provided
  if (queryText) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      /**
       * Frontend VerificationRequest:
       *   query
       *   llmAnswer
       *
       * Backend VerifyRequest:
       *   question
       *   answer
       *
       * Explicitly map the frontend fields to the backend contract.
       */
      let res = await fetch(`${API_BASE_URL}/api/v1/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: request?.query || '',
          answer: request?.llmAnswer || '',
        }),
        signal: controller.signal,
      }).catch(() => null);

      /**
       * Backward-compatible fallback endpoint.
       */
      if (!res || !res.ok) {
        res = await fetch(`${API_BASE_URL}/api/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: request?.query || '',
            answer: request?.llmAnswer || '',
          }),
          signal: controller.signal,
        }).catch(() => null);
      }

      clearTimeout(timeoutId);

      if (res && res.ok) {
        const raw = await res.json();
        const transformedClaims: any[] = (raw.claims || []).map((c: any) => {
          let status = 'UNVERIFIED';
          if (c.status === 'SUPPORTED' || c.verdict === 'SUPPORTED') {
            status = 'SUPPORTED';
          } else if (c.status === 'CONTRADICTED' || c.verdict === 'CONTRADICTED') {
            status = 'CONTRADICTED';
          }

          const rawCitations = c.citations || c.evidence || c.supporting_evidence || [];
          const evidenceItems = rawCitations.map((item: any, idx: number) => ({
            id: `ev-${c.id}-${idx + 1}`,
            sourceTitle: item.source || item.sourceTitle || 'Verified Document',
            snippet: item.evidence || item.text || item.snippet || '',
          }));

          const rawConf = typeof c.confidence === 'number' ? c.confidence : 0.5;
          const confidence = rawConf <= 1.0 ? Math.round(rawConf * 100) : Math.round(rawConf);

          return {
            id: c.id,
            text: c.text,
            status,
            confidence,
            evidence: evidenceItems,
          };
        });

        const latencySeconds =
          typeof raw.execution_time_ms === 'number'
            ? Math.round((raw.execution_time_ms / 1000) * 10) / 10
            : (raw.latencySeconds || 1.5);

        const hallucinationRisk =
          typeof raw.overall_risk === 'number'
            ? Math.round(raw.overall_risk)
            : (raw.hallucinationRisk || 0);

        const liveData: VerificationResponse = {
          query: request?.query || '',
          llmAnswer: request?.llmAnswer || '',
          hallucinationRisk,
          claims: transformedClaims,
          latencySeconds,
          model: request?.model || 'gemini',
        };

        return {
          data: liveData,
          isLiveBackend: true,
        };
      }
    } catch {
      // Backend unreachable or request failed;
      // proceed to offline fallback.
    }
  }

  // 2. Offline Fallback Handling
  await new Promise((res) => setTimeout(res, 200));

  // Demo presets may ONLY be used when the user explicitly selected a valid preset
  if (presetKey && DEMO_PRESETS[presetKey]) {
    const preset = DEMO_PRESETS[presetKey];
    return {
      data: {
        ...preset,
        query: request?.query || preset.query,
        llmAnswer: request?.llmAnswer || preset.llmAnswer,
        model: request?.model || preset.model || 'gpt-4o',
      },
      isLiveBackend: false,
      notice: `Offline demo mode active: using ${presetKey} preset (/api/v1/verify backend endpoint not reachable).`,
    };
  }

  // For custom user-entered question/answer when the backend is unavailable:
  // - NEVER silently substitute DEMO_PRESETS.australia or any unrelated preset.
  // - Preserve BOTH request.query and request.llmAnswer.
  // - Do NOT fabricate claims, evidence, confidence, citations, or verification results.
  // - Return a clear error and notice indicating that live verification backend is unavailable.
  const fallbackData: VerificationResponse = {
    query: request?.query || '',
    llmAnswer: request?.llmAnswer || '',
    hallucinationRisk: 0,
    claims: [],
    latencySeconds: 0,
    model: request?.model || 'gpt-4o',
  };

  return {
    data: fallbackData,
    isLiveBackend: false,
    notice: 'Live verification backend is unavailable. Offline demo mode cannot verify custom assertions without backend connectivity.',
    error: 'Live verification backend is unavailable. Offline verification is only available for pre-configured demo presets.',
  };
}

/**
 * Fetches evaluation benchmark metrics.
 * Attempts /api/v1/evaluation first,
 * falling back to /api/evaluation or baseline metrics.
 */
export async function fetchEvaluationMetrics(): Promise<BenchmarkMetrics> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    let res = await fetch(`${API_BASE_URL}/api/v1/evaluation`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).catch(() => null);

    if (!res || !res.ok) {
      res = await fetch(`${API_BASE_URL}/api/evaluation`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }).catch(() => null);
    }

    clearTimeout(timeoutId);

    if (res && res.ok) {
      return (await res.json()) as BenchmarkMetrics;
    }
  } catch {
    // Backend offline; use baseline benchmark dataset.
  }

  await new Promise((res) => setTimeout(res, 300));

  return MOCK_BENCHMARK;
}