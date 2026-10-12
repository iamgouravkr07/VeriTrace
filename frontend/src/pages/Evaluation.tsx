import { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Database, Info, RefreshCw, ShieldCheck, Timer } from 'lucide-react';
import { fetchEvaluationMetrics } from '../services/api';
import type { BenchmarkMetrics } from '../types';

const MetricBar = ({ label, value, description, color }: { label: string; value: number; description: string; color: string }) => <div className="space-y-2"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span><span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div><p className="text-xs text-slate-500 dark:text-slate-400">{description}</p></div>;

export const Evaluation = () => {
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMetrics = async () => {
    setError(false);
    try { setMetrics(await fetchEvaluationMetrics()); } catch { setError(true); } finally { setLoading(false); setIsRefreshing(false); }
  };
  useEffect(() => {
    let mounted = true;
    fetchEvaluationMetrics().then((data) => {
      if (mounted) {
        setMetrics(data);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) {
        setError(true);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6"><div className="h-8 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-800" /><div className="grid gap-4 lg:grid-cols-3"><div className="h-56 animate-pulse rounded-2xl bg-white dark:bg-slate-900" /><div className="h-56 animate-pulse rounded-2xl bg-white dark:bg-slate-900" /><div className="h-56 animate-pulse rounded-2xl bg-white dark:bg-slate-900" /></div></div>;

  if (error || !metrics) return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><Info className="mx-auto h-8 w-8 text-rose-500" /><h1 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">Evaluation metrics unavailable</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">The evaluation endpoint did not return usable metrics. No benchmark result has been inferred.</p><button type="button" onClick={() => { setIsRefreshing(true); void loadMetrics(); }} className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Retry</button></div>;

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-600 dark:text-cyan-400" /><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-cyan-300">Evaluation workspace</p></div><h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-slate-100">Benchmark results</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">A readable view of the metrics returned by the evaluation service. Values below are not a newly-run benchmark from this page.</p></div><button type="button" disabled={isRefreshing} onClick={() => { setIsRefreshing(true); void loadMetrics(); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />Refresh metrics</button></header>

    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300"><ShieldCheck className="h-4 w-4" />F1 score</div><p className="mt-2 text-3xl font-extrabold text-emerald-800 dark:text-emerald-200">{metrics.f1Score}%</p><p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">Harmonic mean of precision and recall</p></div><div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/30"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300"><CheckCircle2 className="h-4 w-4" />Assertions evaluated</div><p className="mt-2 text-3xl font-extrabold text-blue-800 dark:text-blue-200">{metrics.datasetSize}</p><p className="mt-1 text-xs text-blue-700/80 dark:text-blue-300/80">Dataset size returned by the service</p></div><div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 dark:border-cyan-900 dark:bg-cyan-950/30"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300"><Timer className="h-4 w-4" />Average latency</div><p className="mt-2 text-3xl font-extrabold text-cyan-800 dark:text-cyan-200">{metrics.averageLatency}s</p><p className="mt-1 text-xs text-cyan-700/80 dark:text-cyan-300/80">Reported by the evaluation service</p></div></div>

    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"><div><h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Detection quality</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Higher values indicate stronger evaluation performance.</p></div><span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">Live response</span></div><div className="mt-5 space-y-6"><MetricBar label="Precision" value={metrics.precision} description="How often flagged assertions were actually incorrect." color="bg-blue-500" /><MetricBar label="Recall" value={metrics.recall} description="How many incorrect assertions were successfully intercepted." color="bg-emerald-500" /><MetricBar label="F1 score" value={metrics.f1Score} description="A balanced summary of precision and recall." color="bg-violet-500" /></div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800"><Database className="h-4 w-4 text-blue-600 dark:text-cyan-400" /><div><h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Evaluation scope</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">What the current response tells us</p></div></div><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500 dark:text-slate-400">Assertions</dt><dd className="font-semibold text-slate-900 dark:text-slate-100">{metrics.datasetSize}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500 dark:text-slate-400">Models reported</dt><dd className="text-right font-semibold text-slate-900 dark:text-slate-100">{metrics.testedModels.length ? metrics.testedModels.join(', ') : 'Not reported'}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500 dark:text-slate-400">Per-model comparison</dt><dd className="font-semibold text-slate-500 dark:text-slate-400">Unavailable</dd></div></dl><div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500 dark:bg-slate-950 dark:text-slate-400">The interface intentionally avoids inventing datasets, historical trends, model scores, or performance improvements that are not included in the service response.</div></section></div>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">How to read these metrics</h2><div className="mt-4 grid gap-4 text-sm text-slate-600 dark:text-slate-400 md:grid-cols-3"><p><strong className="text-slate-900 dark:text-slate-100">Precision</strong> limits false accusations by measuring the correctness of flagged results.</p><p><strong className="text-slate-900 dark:text-slate-100">Recall</strong> measures coverage: the share of incorrect assertions the guardrail catches.</p><p><strong className="text-slate-900 dark:text-slate-100">Latency</strong> is the service-reported average and may vary by backend availability and workload.</p></div></section>
  </div>;
};

export default Evaluation;
