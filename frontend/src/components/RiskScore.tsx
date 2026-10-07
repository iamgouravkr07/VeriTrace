import { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Download,
  Copy,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { VerificationResponse } from '../types';

interface RiskScoreProps {
  score: number;
  latencySeconds?: number;
  model?: string;
  fullResult?: VerificationResponse;
}

export const RiskScore = ({ score, latencySeconds, model, fullResult }: RiskScoreProps) => {
  const [copied, setCopied] = useState(false);
  const normalizedScore = Math.min(100, Math.max(0, Math.round(score)));

  // SVG Circular Gauge calculation
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  let severityBadge = 'Factually Grounded';
  let severityTheme = {
    textColor: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    strokeColor: '#10b981',
    icon: ShieldCheck,
  };

  if (normalizedScore > 60) {
    severityBadge = 'High Risk of Confabulation';
    severityTheme = {
      textColor: 'text-rose-700 dark:text-rose-300',
      bgColor: 'bg-rose-50 dark:bg-rose-950/60',
      borderColor: 'border-rose-200 dark:border-rose-800',
      strokeColor: '#f43f5e',
      icon: ShieldAlert,
    };
  } else if (normalizedScore > 20) {
    severityBadge = 'Partial Hallucination / Mixed';
    severityTheme = {
      textColor: 'text-amber-700 dark:text-amber-300',
      bgColor: 'bg-amber-50 dark:bg-amber-950/60',
      borderColor: 'border-amber-200 dark:border-amber-800',
      strokeColor: '#f59e0b',
      icon: AlertTriangle,
    };
  }

  const SeverityIcon = severityTheme.icon;

  const handleCopySummary = async () => {
    if (!fullResult) return;
    const summaryText = `[VeriTrace Verification Report]
Query: "${fullResult.query}"
Model: ${fullResult.model || model || 'LLM'}
Hallucination Risk: ${normalizedScore}% (${severityBadge})
Latency: ${fullResult.latencySeconds}s
Claims Evaluated: ${fullResult.claims.length}
- Supported: ${fullResult.claims.filter((c) => c.status === 'SUPPORTED').length}
- Contradicted: ${fullResult.claims.filter((c) => c.status === 'CONTRADICTED').length}
- Unverified: ${fullResult.claims.filter((c) => c.status === 'UNVERIFIED').length}
`;
    await navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    if (!fullResult) return;
    const blob = new Blob([JSON.stringify(fullResult, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veritrace-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Left: Circular Donut Gauge & Core Score */}
        <div className="flex items-center gap-5">
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Progress Arc */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={severityTheme.strokeColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </svg>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={`text-2xl font-black tracking-tight ${severityTheme.textColor}`}>
                {normalizedScore}%
              </span>
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 -mt-0.5">
                Risk
              </span>
            </div>
          </div>

          {/* Severity & Context */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                Audit Verdict
              </span>
              {model && (
                <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                  {model}
                </span>
              )}
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${severityTheme.bgColor} ${severityTheme.textColor} ${severityTheme.borderColor}`}
            >
              <SeverityIcon className="w-3.5 h-3.5" />
              <span>{severityBadge}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
              {latencySeconds !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  {latencySeconds}s turnaround
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                NLI Cross-Verified
              </span>
            </div>
          </div>
        </div>

        {/* Right: Export & Observability Actions */}
        {fullResult && (
          <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Copied Summary</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Report</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadJSON}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Export JSON</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};