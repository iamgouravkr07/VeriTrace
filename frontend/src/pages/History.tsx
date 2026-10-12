import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Filter, History as HistoryIcon, RotateCcw, Search, XCircle } from 'lucide-react';
import type { VerificationHistoryItem } from '../types';

const DEMO_HISTORY: VerificationHistoryItem[] = [
  { id: 'demo-australia', query: 'What is the capital of Australia?', llmAnswer: 'Sydney is the capital of Australia, which was founded in 1788...', model: 'GPT-4o', hallucinationRisk: 100, status: 'CONTRADICTED', timestamp: '10 mins ago', latencySeconds: 1.8, claimsCount: 1, presetKey: 'australia' },
  { id: 'demo-apollo', query: 'When did Apollo 11 land on the moon?', llmAnswer: 'The Apollo 11 Lunar Module landed on the Moon on July 20, 1969.', model: 'Llama-3-70B', hallucinationRisk: 0, status: 'SUPPORTED', timestamp: '42 mins ago', latencySeconds: 1.2, claimsCount: 1, presetKey: 'apollo' },
  { id: 'demo-jwst', query: 'What discoveries were made by the James Webb Space Telescope?', llmAnswer: 'JWST detected carbon dioxide on WASP-39b, and confirmed undisputed alien structures...', model: 'Claude 3.5 Sonnet', hallucinationRisk: 55, status: 'MIXED', timestamp: '2 hours ago', latencySeconds: 2.1, claimsCount: 2, presetKey: 'jwst' },
  { id: 'demo-nobel', query: 'Who won the 2024 Nobel Prize in Physics?', llmAnswer: 'The Nobel Prize in Physics 2024 was awarded to John Hopfield and Geoffrey Hinton for machine learning foundations.', model: 'GPT-4o', hallucinationRisk: 4, status: 'SUPPORTED', timestamp: '3 hours ago', latencySeconds: 1.5, claimsCount: 2 },
];

type StatusFilter = 'ALL' | VerificationHistoryItem['status'];
interface HistoryProps { onLoadRun?: (item: VerificationHistoryItem) => void; }

const statusStyles = {
  SUPPORTED: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
  CONTRADICTED: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800',
  MIXED: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
};

export const History = ({ onLoadRun }: HistoryProps) => {
  const [items, setItems] = useState<VerificationHistoryItem[]>(DEMO_HISTORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const filteredItems = useMemo(() => items.filter((item) => {
    const needle = searchQuery.trim().toLowerCase();
    return (!needle || `${item.query} ${item.llmAnswer} ${item.model}`.toLowerCase().includes(needle)) && (statusFilter === 'ALL' || item.status === statusFilter);
  }), [items, searchQuery, statusFilter]);
  const counts = { ALL: items.length, SUPPORTED: items.filter((i) => i.status === 'SUPPORTED').length, CONTRADICTED: items.filter((i) => i.status === 'CONTRADICTED').length, MIXED: items.filter((i) => i.status === 'MIXED').length };
  const averageRisk = items.length ? Math.round(items.reduce((sum, item) => sum + item.hallucinationRisk, 0) / items.length) : 0;

  const reset = () => { setSearchQuery(''); setStatusFilter('ALL'); setItems(DEMO_HISTORY); };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><HistoryIcon className="h-5 w-5 text-blue-600 dark:text-cyan-400" /><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-cyan-300">Local observability</p></div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-slate-100">Verification history</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Review verification runs available in this browser session. These sample records are for demonstration and are not synced or permanently stored.</p>
        </div>
        <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><RotateCcw className="h-3.5 w-3.5" />Reset view</button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[['Runs in this view', items.length, 'Demo records only'], ['Average risk', `${averageRisk}%`, 'Calculated from visible records'], ['Flagged runs', counts.CONTRADICTED, 'Contradicted demo results']].map(([label, value, note]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-slate-100">{value}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</p></div>)}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="History filters">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-md"><span className="sr-only">Search history</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search queries, answers, or models" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none ring-blue-500 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" /></label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1"><span className="flex items-center gap-1 text-xs font-semibold text-slate-400"><Filter className="h-3.5 w-3.5" />Status</span>{(['ALL', 'SUPPORTED', 'CONTRADICTED', 'MIXED'] as const).map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} aria-pressed={statusFilter === status} className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${statusFilter === status ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-cyan-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'}`}>{status === 'ALL' ? 'All' : status[0] + status.slice(1).toLowerCase()} <span className="opacity-60">{counts[status]}</span></button>)}</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="Available verification records">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800"><div><h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Available records</h2><p className="text-xs text-slate-500 dark:text-slate-400">{filteredItems.length} of {items.length} records shown</p></div><span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300">Demo data</span></div>
        {filteredItems.length === 0 ? <div className="px-6 py-14 text-center"><Search className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" /><h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-100">No records match this view</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Try clearing the search or selecting another status.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400"><tr><th className="px-4 py-3">Query</th><th className="px-3 py-3">Model</th><th className="px-3 py-3">Risk</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Recorded</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filteredItems.map((item) => <tr key={item.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="max-w-[360px] px-4 py-4"><p className="truncate font-semibold text-slate-900 dark:text-slate-100" title={item.query}>{item.query}</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={item.llmAnswer}>{item.claimsCount} claim{item.claimsCount === 1 ? '' : 's'} · {item.latencySeconds}s</p></td><td className="px-3 py-4"><span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">{item.model}</span></td><td className="px-3 py-4 font-bold"><span className={item.hallucinationRisk > 60 ? 'text-rose-600' : item.hallucinationRisk > 20 ? 'text-amber-600' : 'text-emerald-600'}>{item.hallucinationRisk}%</span></td><td className="px-3 py-4"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusStyles[item.status]}`}>{item.status === 'SUPPORTED' ? <CheckCircle2 className="h-3 w-3" /> : item.status === 'CONTRADICTED' ? <XCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{item.status}</span></td><td className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">{item.timestamp}</td><td className="px-4 py-4 text-right">{item.presetKey && onLoadRun ? <button type="button" onClick={() => onLoadRun(item)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-cyan-300">Inspect<ArrowUpRight className="h-3.5 w-3.5" /></button> : <span className="text-xs text-slate-400">Unavailable</span>}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
};

export default History;
