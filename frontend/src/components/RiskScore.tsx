import { useState, useEffect } from 'react';
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
  const [animatedScore, setAnimatedScore] = useState(0);

  const targetScore = Math.min(100, Math.max(0, Math.round(score)));

  // Smooth Count-Up Animation
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 900;
    const startValue = 0;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setAnimatedScore(Math.round(startValue + (targetScore - startValue) * ease));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [targetScore]);

  // Speedometer 240-degree neon arc math
  // Arc spans from -210° to 30° (240° sweep)
  const radius = 48;
  const arcLength = (240 / 360) * (2 * Math.PI * radius); // ~201.06
  const dashOffset = arcLength - (animatedScore / 100) * arcLength;

  let severityBadge = 'Factually Grounded';
  let themeConfig = {
    textColor: 'text-emerald-500 dark:text-emerald-400',
    borderColor: 'border-emerald-500/20 dark:border-emerald-500/30',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/10',
    glowColor: 'neon-glow-emerald',
    ambientGlow: 'from-emerald-500/15 via-teal-500/5 to-transparent',
    strokeColor: '#10b981',
    icon: ShieldCheck,
  };

  if (targetScore > 60) {
    severityBadge = 'High Risk of Confabulation';
    themeConfig = {
      textColor: 'text-rose-500 dark:text-rose-400',
      borderColor: 'border-rose-500/20 dark:border-rose-500/30',
      bgColor: 'bg-rose-500/10 dark:bg-rose-500/10',
      glowColor: 'neon-glow-rose',
      ambientGlow: 'from-rose-500/20 via-pink-500/5 to-transparent',
      strokeColor: '#f43f5e',
      icon: ShieldAlert,
    };
  } else if (targetScore > 20) {
    severityBadge = 'Partial Hallucination / Mixed';
    themeConfig = {
      textColor: 'text-amber-500 dark:text-amber-400',
      borderColor: 'border-amber-500/20 dark:border-amber-500/30',
      bgColor: 'bg-amber-500/10 dark:bg-amber-500/10',
      glowColor: 'neon-glow-amber',
      ambientGlow: 'from-amber-500/20 via-orange-500/5 to-transparent',
      strokeColor: '#f59e0b',
      icon: AlertTriangle,
    };
  }

  const SeverityIcon = themeConfig.icon;

  const handleCopySummary = async () => {
    if (!fullResult) return;
    const summaryText = `[VeriTrace Truth Core Audit]
Query: "${fullResult.query}"
Target Model: ${fullResult.model || model || 'LLM'}
Hallucination Risk: ${targetScore}% (${severityBadge})
Turnaround SLA: ${fullResult.latencySeconds}s
Claims Evaluated: ${fullResult.claims.length}
- Grounded: ${fullResult.claims.filter((c) => c.status === 'SUPPORTED').length}
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
    a.download = `veritrace-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0c0e14]/80 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300">
      {/* Localized Ambient Glow Flare */}
      <div
        className={`pointer-events-none absolute -left-12 -top-12 h-64 w-64 rounded-full bg-gradient-radial ${themeConfig.ambientGlow} blur-3xl opacity-70`}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Speedometer Truth Core Gauge */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={themeConfig.strokeColor} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={themeConfig.strokeColor} stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* Background Arc Track (240 deg sweep) */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="stroke-slate-200/70 dark:stroke-white/[0.06]"
                strokeWidth="7"
                strokeDasharray={`${arcLength} 360`}
                strokeDashoffset="0"
                strokeLinecap="round"
                fill="none"
                transform="rotate(150 60 60)"
              />

              {/* Neon Progress Arc */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="url(#meterGradient)"
                strokeWidth="7"
                strokeDasharray={`${arcLength} 360`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                fill="none"
                className={`transition-all duration-300 ease-out ${themeConfig.glowColor}`}
                transform="rotate(150 60 60)"
              />
            </svg>

            {/* Inner Truth Core Digital Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-2">
              <span className="font-mono text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {animatedScore}
                <span className="text-sm font-bold text-slate-400 ml-0.5">%</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest font-mono text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                Risk Core
              </span>
            </div>
          </div>

          {/* Severity & Context Observability Tag */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-[10px] uppercase tracking-widest font-mono font-semibold text-slate-400 dark:text-slate-500">
                Observability Verdict
              </span>
              {model && (
                <span className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
                  {model}
                </span>
              )}
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${themeConfig.bgColor} ${themeConfig.textColor} ${themeConfig.borderColor}`}
            >
              <SeverityIcon className="w-3.5 h-3.5" />
              <span className="tracking-wide">{severityBadge}</span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3.5 text-xs text-slate-500 dark:text-slate-400 pt-1 font-mono">
              {latencySeconds !== undefined && (
                <span className="flex items-center gap-1 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {latencySeconds}s SLA
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] text-blue-500 dark:text-blue-400">
                <Sparkles className="w-3.5 h-3.5" />
                Cross-Verified
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Rail: Cyber Export Buttons */}
        {fullResult && (
          <div className="flex sm:flex-col items-center sm:items-end gap-2.5 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-200/60 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100/80 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08] transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
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
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Export Telemetry</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};