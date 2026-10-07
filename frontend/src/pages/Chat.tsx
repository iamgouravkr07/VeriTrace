import { useState } from 'react';
import { verifyText, DEMO_PRESETS } from '../services/api';
import type { VerificationResponse } from '../types';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { Results } from './Results';

export const Chat = () => {
  const [query, setQuery] = useState('What is the capital of Australia?');
  const [llmAnswer, setLlmAnswer] = useState('');
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('australia');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | undefined>(undefined);

  const presetList = [
    {
      key: 'australia',
      title: 'Australia Capital',
      desc: 'Hallucination: "Sydney" instead of Canberra',
      expected: 'High Risk (Contradicted)',
      query: DEMO_PRESETS.australia.query,
    },
    {
      key: 'apollo',
      title: 'Apollo 11 Moon Landing',
      desc: 'Factual: July 20, 1969 landing date',
      expected: 'Low Risk (Supported)',
      query: DEMO_PRESETS.apollo.query,
    },
    {
      key: 'jwst',
      title: 'James Webb Telescope',
      desc: 'Mixed: Grounded exoplanet + Alien claim',
      expected: 'Moderate Risk (Mixed)',
      query: DEMO_PRESETS.jwst.query,
    },
  ];

  const handleSelectPreset = (key: string) => {
    setSelectedPresetKey(key);
    const preset = DEMO_PRESETS[key];
    if (preset) {
      setQuery(preset.query);
      setLlmAnswer(preset.llmAnswer);
    }
  };

  const handleVerify = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await verifyText(
        {
          query: query.trim(),
          llmAnswer: llmAnswer.trim() || undefined,
        },
        selectedPresetKey
      );

      setResult(response.data);
      setIsLiveBackend(response.isLiveBackend);
      setNotice(response.notice);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected verification error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const pipelineStage = loading ? 'analyzing' : result ? 'completed' : 'input';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Intro Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          VeriTrace Verification Console
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Inspect and verify LLM-generated assertions against grounded knowledge sources using
          atomic claim extraction and natural language inference (NLI).
        </p>
      </div>

      {/* Visual Workflow Stepper: Input -> Analysis -> Evidence -> Verdict */}
      <WorkflowStepper currentStage={pipelineStage} />

      {/* SECTION 1: USER INPUT & PRESET SELECTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="user-query" className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Step 1: Evaluation Query &amp; Assertion
          </label>
          <span className="text-xs text-slate-400">
            Quick demo presets or enter custom text
          </span>
        </div>

        {/* Preset Selector Chips for Judges */}
        <div className="flex flex-wrap gap-2 pt-1">
          {presetList.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => handleSelectPreset(preset.key)}
              className={`px-3 py-1.5 rounded-lg text-xs text-left transition-all cursor-pointer border ${
                selectedPresetKey === preset.key && query === preset.query
                  ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium ring-1 ring-blue-300'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="font-semibold">{preset.title}</div>
              <div className="text-[11px] text-slate-400 truncate">{preset.expected}</div>
            </button>
          ))}
        </div>

        {/* Input Textarea */}
        <div className="space-y-1.5">
          <label htmlFor="user-query" className="text-xs font-medium text-slate-700">
            Prompt / Question
          </label>
          <textarea
            id="user-query"
            rows={2}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedPresetKey('');
            }}
            placeholder="Enter the prompt or claim to be verified..."
            className="w-full border border-slate-300 rounded-lg p-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Optional Target LLM Answer */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="target-answer" className="text-xs font-medium text-slate-700">
              Target LLM Response (Optional for custom evaluation)
            </label>
            <span className="text-[11px] text-slate-400">
              Leave blank to evaluate default assertion
            </span>
          </div>
          <textarea
            id="target-answer"
            rows={2}
            value={llmAnswer}
            onChange={(e) => setLlmAnswer(e.target.value)}
            placeholder="e.g. Sydney is the capital of Australia."
            className="w-full border border-slate-200 rounded-lg p-3 text-sm font-sans bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Action Button & Supported Format Notice */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-400">
            Supported contexts: Raw text, Factoid queries, Pre-chunked documents.
          </p>

          <button
            type="button"
            onClick={handleVerify}
            disabled={loading || !query.trim()}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
              loading || !query.trim()
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <span>[ VERIFY ASSERTIONS ]</span>
            )}
          </button>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-start justify-between gap-3"
        >
          <div>
            <strong className="font-semibold">Verification Pipeline Error:</strong>
            <p className="mt-0.5 text-xs text-rose-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleVerify}
            className="text-xs font-semibold px-2.5 py-1 bg-white border border-rose-300 rounded hover:bg-rose-100 cursor-pointer text-rose-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">
            Analyzing Claims &amp; Retrieving Grounded Evidence
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Extracting atomic propositions, querying knowledge index, and computing natural
            language inference contradiction/entailment scores...
          </p>
        </div>
      )}

      {/* SECTION 2-4: VERDICT, CLAIMS, & EVIDENCE RESULTS */}
      {!loading && result && (
        <Results
          result={result}
          isLiveBackend={isLiveBackend}
          notice={notice}
          onReset={handleReset}
        />
      )}

      {/* EMPTY STATE */}
      {!loading && !result && !error && (
        <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg mx-auto mb-3">
            🔍
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            Ready to Verify LLM Assertions
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Select a preset scenario above or enter a custom prompt, then click &ldquo;Verify
            Assertions&rdquo; to test for hallucinations.
          </p>
        </div>
      )}
    </div>
  );
};