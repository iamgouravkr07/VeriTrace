import { useEffect, useState } from 'react';
import { fetchEvaluationMetrics } from '../services/api';
import type { BenchmarkMetrics } from '../types';

export const Evaluation = () => {
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchEvaluationMetrics().then((data) => {
      if (isMounted) {
        setMetrics(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || !metrics) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl p-4 animate-pulse space-y-2">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-7 w-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Guardrail Benchmark Evaluation
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Quantitative performance metrics of the VeriTrace verification pipeline on standard
          hallucination detection benchmarks.
        </p>
      </div>

      {/* Main 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            Precision
          </div>
          <div className="text-3xl font-extrabold text-blue-600 mt-1">{metrics.precision}%</div>
          <p className="text-[11px] text-slate-400 mt-1">True hallucination rate</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            Recall
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 mt-1">{metrics.recall}%</div>
          <p className="text-[11px] text-slate-400 mt-1">Hallucinations caught</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            F1 Score
          </div>
          <div className="text-3xl font-extrabold text-indigo-600 mt-1">{metrics.f1Score}%</div>
          <p className="text-[11px] text-slate-400 mt-1">Harmonic mean</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            Avg Latency
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">
            {metrics.averageLatency}s
          </div>
          <p className="text-[11px] text-slate-400 mt-1">End-to-end pipeline</p>
        </div>
      </div>

      {/* Evaluation Metadata & Methodology */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider text-xs">
          Benchmark Dataset &amp; Model Coverage
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block mb-1">Dataset Test Split</span>
            <span className="text-base font-bold text-slate-800">
              {metrics.datasetSize} verified assertion pairs
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Balanced benchmark containing factual claims, subtle distortions, and negative samples.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block mb-1">Target Models Evaluated</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {metrics.testedModels.map((model) => (
                <span
                  key={model}
                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200 text-xs"
                >
                  {model}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Cross-model generalization evaluated across proprietary and open-weights LLMs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};