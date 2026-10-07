import { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History as HistoryIcon,
  RotateCcw,
} from 'lucide-react';
import type { VerificationHistoryItem } from '../types';

const INITIAL_HISTORY_ITEMS: VerificationHistoryItem[] = [
  {
    id: 'hist-1',
    query: 'What is the capital of Australia?',
    llmAnswer: 'Sydney is the capital of Australia, which was founded in 1788...',
    model: 'GPT-4o',
    hallucinationRisk: 100,
    status: 'CONTRADICTED',
    timestamp: '10 mins ago',
    latencySeconds: 1.8,
    claimsCount: 1,
    presetKey: 'australia',
  },
  {
    id: 'hist-2',
    query: 'When did Apollo 11 land on the moon?',
    llmAnswer: 'The Apollo 11 Lunar Module landed on the Moon on July 20, 1969.',
    model: 'Llama-3-70B',
    hallucinationRisk: 0,
    status: 'SUPPORTED',
    timestamp: '42 mins ago',
    latencySeconds: 1.2,
    claimsCount: 1,
    presetKey: 'apollo',
  },
  {
    id: 'hist-3',
    query: 'What discoveries were made by the James Webb Space Telescope?',
    llmAnswer: 'JWST detected carbon dioxide on WASP-39b, and confirmed undisputed alien structures...',
    model: 'Claude 3.5 Sonnet',
    hallucinationRisk: 55,
    status: 'MIXED',
    timestamp: '2 hours ago',
    latencySeconds: 2.1,
    claimsCount: 2,
    presetKey: 'jwst',
  },
  {
    id: 'hist-4',
    query: 'Who won the 2024 Nobel Prize in Physics?',
    llmAnswer: 'The Nobel Prize in Physics 2024 was awarded to John Hopfield and Geoffrey Hinton for machine learning foundations.',
    model: 'GPT-4o',
    hallucinationRisk: 4,
    status: 'SUPPORTED',
    timestamp: '3 hours ago',
    latencySeconds: 1.5,
    claimsCount: 2,
  },
  {
    id: 'hist-5',
    query: 'What is the boiling point of liquid nitrogen at sea level?',
    llmAnswer: 'Liquid nitrogen boils at -195.8°C (-320°F) at standard atmospheric pressure.',
    model: 'Mistral Large',
    hallucinationRisk: 0,
    status: 'SUPPORTED',
    timestamp: '5 hours ago',
    latencySeconds: 1.6,
    claimsCount: 1,
  },
  {
    id: 'hist-6',
    query: 'Did Thomas Edison invent the electronic transistor?',
    llmAnswer: 'Yes, Thomas Edison patented the transistor in 1894 before Bell Labs.',
    model: 'Llama-3-70B',
    hallucinationRisk: 96,
    status: 'CONTRADICTED',
    timestamp: '1 day ago',
    latencySeconds: 2.3,
    claimsCount: 1,
  },
];

interface HistoryProps {
  onLoadRun?: (item: VerificationHistoryItem) => void;
}

export const History = ({ onLoadRun }: HistoryProps) => {
  const [items, setItems] = useState<VerificationHistoryItem[]>(INITIAL_HISTORY_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUPPORTED' | 'CONTRADICTED' | 'MIXED'>('ALL');

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.llmAnswer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalRuns = items.length;
  const avgRisk = Math.round(items.reduce((acc, i) => acc + i.hallucinationRisk, 0) / totalRuns);
  const contradictedRuns = items.filter((i) => i.status === 'CONTRADICTED').length;

  const statusCounts = {
    ALL: items.length,
    SUPPORTED: items.filter((i) => i.status === 'SUPPORTED').length,
    CONTRADICTED: items.filter((i) => i.status === 'CONTRADICTED').length,
    MIXED: items.filter((i) => i.status === 'MIXED').length,
  };

  const filterLabels: Record<'ALL' | 'SUPPORTED' | 'CONTRADICTED' | 'MIXED', string> = {
    ALL: 'All',
    CONTRADICTED: 'Flagged',
    SUPPORTED: 'Supported',
    MIXED: 'Mixed',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-850">
        <div>
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Verification Audit History
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Searchable ledger of historical assertion verification jobs, risk assessments, and claim resolutions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('ALL');
            setItems(INITIAL_HISTORY_ITEMS);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/90 dark:bg-[#0c0e14]/90 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 shadow-2xs transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* Top Telemetry Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/80 dark:bg-[#0c0e14]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Total Audited Runs
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">{totalRuns}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Persisted in local observability session</p>
        </div>

        <div className="bg-white/80 dark:bg-[#0c0e14]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Average Hallucination Risk
          </span>
          <div className="text-2xl font-black font-mono text-amber-500 mt-1">{avgRisk}%</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Across heterogeneous prompt distributions</p>
        </div>

        <div className="bg-white/80 dark:bg-[#0c0e14]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Intercepted Confabulations
          </span>
          <div className="text-2xl font-black font-mono text-rose-500 mt-1">{contradictedRuns}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Contradictions caught before end-user display</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white/80 dark:bg-[#0c0e14]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search query, assertion or model..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
        </div>

        {/* Filter Pills with Live Count Badges */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Status:</span>
          </span>

          {(['ALL', 'CONTRADICTED', 'SUPPORTED', 'MIXED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap border ${
                statusFilter === st
                  ? 'bg-blue-500/15 dark:bg-blue-500/20 border-blue-500 text-blue-700 dark:text-cyan-300 ring-1 ring-blue-500/30 font-bold'
                  : 'bg-white/80 dark:bg-[#0c0e14]/90 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>{filterLabels[st]}</span>
              <span className="ml-1 opacity-75">[{statusCounts[st]}]</span>
            </button>
          ))}
        </div>
      </div>

      {/* History Data Table */}
      <div className="bg-white/80 dark:bg-[#0c0e14]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider font-mono">
                <th className="py-3 px-4">Evaluation Query</th>
                <th className="py-3 px-3">Target Model</th>
                <th className="py-3 px-3 text-center">Risk Score</th>
                <th className="py-3 px-3">Verdict Status</th>
                <th className="py-3 px-3">Turnaround</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No verification records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isContradicted = item.status === 'CONTRADICTED';
                  const isSupported = item.status === 'SUPPORTED';
                  const leftHoverBorder = isContradicted
                    ? 'hover:border-l-rose-500'
                    : isSupported
                      ? 'hover:border-l-emerald-500'
                      : 'hover:border-l-amber-500';

                  return (
                    <tr
                      key={item.id}
                      className={`border-l-2 border-l-transparent ${leftHoverBorder} hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-150`}
                    >
                      {/* Query */}
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate" title={item.query}>
                          {item.query}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={item.llmAnswer}>
                          {item.llmAnswer}
                        </p>
                      </td>

                      {/* Model */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.model}
                        </span>
                      </td>

                      {/* Hallucination Risk Gauge */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 font-bold font-mono text-xs">
                          <span
                            className={
                              item.hallucinationRisk > 60
                                ? 'text-rose-600 dark:text-rose-400'
                                : item.hallucinationRisk > 20
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {item.hallucinationRisk}%
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
                            item.status === 'SUPPORTED'
                              ? 'bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                              : item.status === 'CONTRADICTED'
                                ? 'bg-rose-500/10 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-500/20'
                                : 'bg-amber-500/10 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-500/20'
                          }`}
                        >
                          {item.status === 'SUPPORTED' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : item.status === 'CONTRADICTED' ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          <span>{item.status}</span>
                        </span>
                      </td>

                      {/* Latency */}
                      <td className="py-3.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                        {item.latencySeconds}s
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-3 text-slate-400 dark:text-slate-500 text-[11px] font-mono">
                        {item.timestamp}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {onLoadRun ? (
                          <button
                            type="button"
                            onClick={() => onLoadRun(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-cyan-300 hover:bg-blue-500/20 dark:hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">Logged</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
