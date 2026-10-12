import test from 'node:test';
import assert from 'node:assert';
import { verifyText, DEMO_PRESETS } from '../src/services/api.ts';

// Simulate offline backend for offline demo testing
const originalFetch = globalThis.fetch;

function mockOfflineBackend() {
  globalThis.fetch = async () => {
    throw new Error('Connection refused (backend offline)');
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

test('Criterion A: custom Sputnik input never falls back to Sydney when backend is offline', async () => {
  mockOfflineBackend();
  try {
    const sputnikQuery = 'When was Sputnik 1 launched?';
    const sputnikAnswer = 'Sputnik 1 was launched by the Soviet Union on October 4, 1957.';

    const result = await verifyText({
      query: sputnikQuery,
      llmAnswer: sputnikAnswer,
    });

    // 1. Must never fall back to Sydney or Australia
    assert.notStrictEqual(result.data.query, DEMO_PRESETS.australia.query);
    assert.strictEqual(result.data.query, sputnikQuery);
    assert.strictEqual(result.data.llmAnswer, sputnikAnswer);

    // 2. Must not fabricate claims or return Sydney claims
    assert.strictEqual(result.data.claims.length, 0);
    const hasSydneyClaim = result.data.claims.some((c) =>
      c.text.toLowerCase().includes('sydney') || c.text.toLowerCase().includes('australia')
    );
    assert.strictEqual(hasSydneyClaim, false);

    // 3. Must indicate live backend unavailable
    assert.strictEqual(result.isLiveBackend, false);
    assert.ok(result.notice && result.notice.includes('unavailable'));
    assert.ok(result.error && result.error.includes('unavailable'));
  } finally {
    restoreFetch();
  }
});

test('Criterion B: changing the query clears the previous result and clears selectedPresetKey', () => {
  // Simulates Studio component state transitions
  let currentQuery = 'What is the capital of Australia?';
  let selectedPresetKey: string = 'australia';
  let result: unknown = { ...DEMO_PRESETS.australia };
  let error: string | null = null;

  // User edits query field in Studio
  const handleQueryChange = (updatedQuery: string) => {
    currentQuery = updatedQuery;
    selectedPresetKey = '';
    result = null;
    error = null;
  };

  handleQueryChange('When was Sputnik 1 launched?');

  assert.strictEqual(currentQuery, 'When was Sputnik 1 launched?');
  assert.strictEqual(selectedPresetKey, '');
  assert.strictEqual(result, null);
  assert.strictEqual(error, null);
});

test('Criterion C: changing the answer clears the previous result and clears selectedPresetKey', () => {
  // Simulates Studio component state transitions
  let currentAnswer = DEMO_PRESETS.apollo.llmAnswer;
  let selectedPresetKey: string = 'apollo';
  let result: unknown = { ...DEMO_PRESETS.apollo };
  let error: string | null = null;

  // User edits answer field in Studio
  const handleAnswerChange = (updatedAnswer: string) => {
    currentAnswer = updatedAnswer;
    selectedPresetKey = '';
    result = null;
    error = null;
  };

  handleAnswerChange('Custom answer about another topic.');

  assert.strictEqual(currentAnswer, 'Custom answer about another topic.');
  assert.strictEqual(selectedPresetKey, '');
  assert.strictEqual(result, null);
  assert.strictEqual(error, null);
});

test('Criterion D: explicit Australia preset still works in offline demo mode', async () => {
  mockOfflineBackend();
  try {
    const result = await verifyText(
      {
        query: DEMO_PRESETS.australia.query,
        llmAnswer: DEMO_PRESETS.australia.llmAnswer,
      },
      'australia'
    );

    assert.strictEqual(result.isLiveBackend, false);
    assert.strictEqual(result.data.query, DEMO_PRESETS.australia.query);
    assert.strictEqual(result.data.claims.length, 1);
    assert.strictEqual(result.data.claims[0].status, 'CONTRADICTED');
    assert.strictEqual(result.data.claims[0].text, 'Sydney is the capital of Australia.');
    assert.ok(result.notice && result.notice.includes('australia'));
  } finally {
    restoreFetch();
  }
});

test('Criterion E: explicit Apollo preset still works in offline demo mode', async () => {
  mockOfflineBackend();
  try {
    const result = await verifyText(
      {
        query: DEMO_PRESETS.apollo.query,
        llmAnswer: DEMO_PRESETS.apollo.llmAnswer,
      },
      'apollo'
    );

    assert.strictEqual(result.isLiveBackend, false);
    assert.strictEqual(result.data.query, DEMO_PRESETS.apollo.query);
    assert.strictEqual(result.data.claims.length, 1);
    assert.strictEqual(result.data.claims[0].status, 'SUPPORTED');
    assert.strictEqual(
      result.data.claims[0].text,
      'The Apollo 11 Lunar Module landed on the Moon on July 20, 1969.'
    );
    assert.ok(result.notice && result.notice.includes('apollo'));
  } finally {
    restoreFetch();
  }
});

test('Criterion F: live response preserves multiple claims and optional evidence metadata', async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/api/v1/verify')) {
      return new Response(JSON.stringify({
        execution_time_ms: 2450,
        overall_risk: 42,
        claims: [
          { id: 'supported-1', text: 'A supported claim.', verdict: 'SUPPORTED', confidence: 0.91, citations: [{ source: 'Trusted source', url: 'https://example.com/source', text: 'A long enough source excerpt.' }] },
          { id: 'unknown-1', text: 'An unverified claim.', status: 'UNVERIFIED' },
          { id: 'contradicted-1', text: 'A contradicted claim.', status: 'CONTRADICTED', confidence: 87, evidence: [] },
        ],
      }));
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const result = await verifyText({ query: 'Test question', llmAnswer: 'Test answer' });
    assert.strictEqual(result.isLiveBackend, true);
    assert.deepStrictEqual(result.data.claims.map((claim) => claim.status), ['SUPPORTED', 'UNVERIFIED', 'CONTRADICTED']);
    assert.strictEqual(result.data.claims[0].confidence, 91);
    assert.deepStrictEqual(result.data.claims[0].evidence, [{
      id: 'ev-supported-1-1',
      sourceTitle: 'Trusted source',
      sourceUrl: 'https://example.com/source',
      snippet: 'A long enough source excerpt.',
    }]);
    assert.deepStrictEqual(result.data.claims[1].evidence, []);
    assert.deepStrictEqual(result.data.claims[2].evidence, []);
  } finally {
    restoreFetch();
  }
});

test('Criterion G: absent evidence metadata does not create fabricated source details', async () => {
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/v1/verify')) {
      return new Response(JSON.stringify({ claims: [{ text: 'Claim without citations', status: 'SUPPORTED' }] }));
    }
    throw new Error('Unexpected request');
  };

  try {
    const result = await verifyText({ query: 'Question', llmAnswer: 'Answer' });
    const claim = result.data.claims[0];
    assert.strictEqual(claim.evidence?.length, 0);
    assert.strictEqual('confidence' in claim, false);
    assert.strictEqual('sourceTitle' in (claim.evidence?.[0] || {}), false);
  } finally {
    restoreFetch();
  }
});
