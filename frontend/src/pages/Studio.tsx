import { useState, useRef } from 'react';
import {
  Sparkles,
  Bot,
  Play,
  ShieldCheck,
  FileCode,
  Sliders,
} from 'lucide-react';

import { verifyText, DEMO_PRESETS } from '../services/api';
import type { VerificationResponse } from '../types';
import { WorkflowStepper, type PipelineStage } from '../components/WorkflowStepper';
import { Results } from './Results';

const MODEL_OPTIONS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', latency: '~1.8s' },
  { id: 'llama-3-70b', name: 'Llama 3 70B', provider: 'Meta', latency: '~2.2s' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', latency: '~1.9s' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral AI', latency: '~2.0s' },
];

export interface StudioProps {
  initialQuery?: string;
  initialAnswer?: string;
  initialModel?: string;
  initialPresetKey?: string;
}

export const Studio = ({
  initialQuery,
  initialAnswer,
  initialModel,
  initialPresetKey,
}: StudioProps = {}) => {
  const [selectedModel, setSelectedModel] = useState<string>(initialModel || 'gpt-4o');
  const [query, setQuery] = useState(initialQuery || 'What is the capital of Australia?');
  const [llmAnswer, setLlmAnswer] = useState(
    initialAnswer ||
      'Sydney is the capital of Australia, which was founded in 1788 and serves as the country’s primary federal administrative center.'
  );
  const [contextDoc, setContextDoc] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [nliThreshold, setNliThreshold] = useState<number>(75);
  const [topK, setTopK] = useState<number>(3);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>(initialPresetKey || 'australia');

  const [loading, setLoading] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>(1);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | undefined>(undefined);

  const stageTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const presets = [
    {
      key: 'australia',
      title: 'Sydney Capital (Hallucination)',
      query: DEMO_PRESETS.australia.query,
      answer: DEMO_PRESETS.australia.llmAnswer,
      expected: 'High Risk (Contradicted)',
      tagColor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    },
    {
      key: 'apollo',
      title: 'Apollo 11 Moon (Grounded)',
      query: DEMO_PRESETS.apollo.query,
      answer: DEMO_PRESETS.apollo.llmAnswer,
      expected: 'Low Risk (Supported)',
      tagColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    {
      key: 'jwst',
      title: 'Webb Telescope (Mixed Claim)',
      query: DEMO_PRESETS.jwst.query,
      answer: DEMO_PRESETS.jwst.llmAnswer,
      expected: 'Moderate Risk (Mixed)',
      tagColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
  ];

  const handleSelectPreset = (presetKey: string) => {
    setSelectedPresetKey(presetKey);
    const target = presets.find((p) => p.key === presetKey);
    if (target) {
      setQuery(target.query);
      setLlmAnswer(target.answer);
    }
  };

  const handleVerify = async () => {
    if (!query.trim()) return;

    stageTimerRef.current.forEach(clearTimeout);
    stageTimerRef.current = [];

    setLoading(true);
    setError(null);
    setPipelineStage(1);

    const t2 = setTimeout(() => setPipelineStage(2), 200);
    const t3 = setTimeout(() => setPipelineStage(3), 450);
    const t4 = setTimeout(() => setPipelineStage(4), 700);
    const t5 = setTimeout(() => setPipelineStage(5), 950);
    stageTimerRef.current = [t2, t3, t4, t5];

    try {
      const response = await verifyText(
        {
          query: query.trim(),
          llmAnswer: llmAnswer.trim() || undefined,
          contextDocument: contextDoc.trim() || undefined,
          model: selectedModel,
        },
        selectedPresetKey
      );

      setPipelineStage(5);
      await new Promise((res) => setTimeout(res, 250));

      setResult(response.data);
      setIsLiveBackend(response.isLiveBackend);
      setNotice(response.notice);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Verification pipeline failed to return response.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setPipelineStage(1);
  };

  const charCount = (query.length + llmAnswer.length);
  const approxTokens = Math.round(charCount / 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Workflow Stepper Banner */}
      <WorkflowStepper
        currentStage={pipelineStage}
        isCompleted={!loading && result !== null}
      />

      {/* Main Split-View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: QUERY & LLM OUTPUT CONFIGURATION */}
        <section className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Model &amp; Assertion Input
                </h2>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                <span>~{approxTokens} tokens</span>
                <span>&bull;</span>
                <span>Stage 1</span>
              </div>
            </div>

            {/* Model Selector */}
            <div className="space-y-1.5">
              <label htmlFor="model-select" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Target LLM Evaluated</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">NLI Cross-Check</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MODEL_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModel(m.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedModel === m.id
                        ? 'bg-blue-50/80 dark:bg-blue-950/70 border-blue-400 dark:border-blue-600 ring-2 ring-blue-300 dark:ring-blue-800 text-blue-950 dark:text-blue-100 font-semibold'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span>{m.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{m.latency}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">{m.provider}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Benchmark Preset Quick Selector for Judges */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Test Presets (Judge Scenarios)</span>
                <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              </label>
              <div className="flex flex-col gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleSelectPreset(preset.key)}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      selectedPresetKey === preset.key && query === preset.query
                        ? 'bg-blue-50/80 dark:bg-blue-950/70 border-blue-400 dark:border-blue-600 ring-1 ring-blue-300 dark:ring-blue-800 text-blue-950 dark:text-blue-100'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="truncate">
                      <p className="text-xs font-semibold truncate">{preset.title}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        &ldquo;{preset.query}&rdquo;
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${preset.tagColor}`}
                    >
                      {preset.expected}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt / Question Input */}
            <div className="space-y-1.5">
              <label htmlFor="eval-query" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Evaluation Prompt / Query
              </label>
              <textarea
                id="eval-query"
                rows={2}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedPresetKey('');
                }}
                placeholder="Enter prompt or query..."
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Target LLM Output Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="eval-answer" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target LLM Assertion / Response
                </label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Claims extracted from here</span>
              </div>
              <textarea
                id="eval-answer"
                rows={3}
                value={llmAnswer}
                onChange={(e) => {
                  setLlmAnswer(e.target.value);
                  setSelectedPresetKey('');
                }}
                placeholder="Paste LLM-generated output to inspect for hallucinations..."
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors leading-relaxed"
              />
            </div>

            {/* Parameter & Grounding Accordions */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{showAdvanced ? 'Hide Guardrail Parameters' : 'NLI Sensitivity & Retrieval Parameters'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowContext(!showContext)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{showContext ? 'Hide Context' : '+ Custom Context'}</span>
                </button>
              </div>

              {/* Advanced Parameters Slider */}
              {showAdvanced && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      <span>NLI Contradiction Confidence Threshold:</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">{nliThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={95}
                      step={5}
                      value={nliThreshold}
                      onChange={(e) => setNliThreshold(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Lenient (50%)</span>
                      <span>Balanced (75%)</span>
                      <span>Strict (95%)</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      <span>Vector Top-K Sources:</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">{topK} snippets</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={topK}
                      onChange={(e) => setTopK(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Context Document Input */}
              {showContext && (
                <div className="space-y-1">
                  <textarea
                    rows={3}
                    value={contextDoc}
                    onChange={(e) => setContextDoc(e.target.value)}
                    placeholder="Paste reference text or document chunks to ground NLI verification..."
                    className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    If provided, assertions will be cross-checked directly against this text corpus.
                  </p>
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleVerify}
                disabled={loading || !query.trim()}
                className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                  loading || !query.trim()
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white hover:shadow-md'
                }`}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Claims (Stage {pipelineStage}/5)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>[ RUN VERITRACE VERIFICATION ]</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: VERIFICATION INSPECTOR */}
        <section className="lg:col-span-7 space-y-5">
          {/* ERROR ALERT */}
          {error && (
            <div
              role="alert"
              className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-start justify-between gap-3 shadow-xs"
            >
              <div>
                <strong className="font-bold text-rose-900 dark:text-rose-100 block">Verification Pipeline Error</strong>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">{error}</p>
              </div>
              <button
                type="button"
                onClick={handleVerify}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded font-semibold text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-800 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* LOADING SKELETON STATE */}
          {loading && (
            <div className="space-y-4" aria-live="polite">
              {/* Stepper Status Pill */}
              <div className="bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3 shadow-2xs">
                <span className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-blue-950 dark:text-blue-100">
                    {pipelineStage === 1 && 'Stage 1: Ingesting query & target assertion...'}
                    {pipelineStage === 2 && 'Stage 2: Segmenting into atomic claims via LLM extractor...'}
                    {pipelineStage === 3 && 'Stage 3: Retrieving top-k vector evidence snippets...'}
                    {pipelineStage === 4 && 'Stage 4: Executing Natural Language Inference cross-checks...'}
                    {pipelineStage === 5 && 'Stage 5: Computing Hallucination Risk Score...'}
                  </span>
                  <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                    Observability telemetry processing in real time
                  </p>
                </div>
              </div>

              {/* Skeleton Gauge Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs animate-pulse">
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-6 w-44 bg-slate-200 dark:bg-slate-800 rounded-full" />
                    <div className="h-3 w-36 bg-slate-100 dark:bg-slate-850 rounded" />
                  </div>
                </div>
              </div>

              {/* Skeleton Claim Cards */}
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs animate-pulse space-y-3"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  </div>
                  <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-850 rounded" />
                  <div className="h-14 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* ACTIVE VERIFICATION RESULTS */}
          {!loading && result && (
            <Results
              result={result}
              isLiveBackend={isLiveBackend}
              notice={notice}
              onReset={handleReset}
            />
          )}

          {/* INITIAL EMPTY STATE */}
          {!loading && !result && !error && (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center space-y-5 shadow-2xs transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-2xl mx-auto shadow-inner">
                <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>

              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  VeriTrace Verification Studio
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Select a test scenario on the left or input any prompt and target LLM response.
                  VeriTrace decomposes the answer into atomic propositions and correlates them
                  with verified knowledge bases.
                </p>
              </div>

              {/* Quick start triggers */}
              <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                {presets.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      handleSelectPreset(p.key);
                    }}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/50 text-left transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {p.title.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">{p.expected}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
