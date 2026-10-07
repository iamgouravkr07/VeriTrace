import { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Layers,
} from 'lucide-react';
import type { VerificationResponse } from '../types';
import { RiskScore } from '../components/RiskScore';
import { ClaimCard } from '../components/ClaimCard';
import { AnnotatedText } from '../components/AnnotatedText';

interface ResultsProps {
  result: VerificationResponse;
  isLiveBackend?: boolean;
  notice?: string;
  onReset?: () => void;
}

export const Results = ({ result, isLiveBackend, notice, onReset }: ResultsProps) => {
  const [filter, setFilter] = useState<'ALL' | 'CONTRADICTED' | 'SUPPORTED' | 'UNVERIFIED'>('ALL');
  const [targetedClaimId, setTargetedClaimId] = useState<string | null>(null);

  const supportedCount = result.claims.filter((c) => c.status === 'SUPPORTED').length;
  const contradictedCount = result.claims.filter((c) => c.status === 'CONTRADICTED').length;
  const unverifiedCount = result.claims.filter((c) => c.status === 'UNVERIFIED').length;

  const filteredClaims = result.claims.filter((claim) => {
    if (filter === 'ALL') return true;
    return claim.status === filter;
  });

  const handleClaimNavigate = (claimId: string) => {
    setTargetedClaimId(claimId);
    const element = document.getElementById(`claim-${claimId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setTargetedClaimId((prev) => (prev === claimId ? null : prev));
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE VERDICT & RISK GAUGE */}
      <RiskScore
        score={result.hallucinationRisk}
        latencySeconds={result.latencySeconds}
        model={result.model}
        fullResult={result}
      />

      {/* 2. VERIFIED BREAKDOWN METRICS & FILTER TABS */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setFilter(filter === 'SUPPORTED' ? 'ALL' : 'SUPPORTED')}
          className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer backdrop-blur-sm ${
            filter === 'SUPPORTED'
              ? 'bg-emerald-500/15 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md shadow-emerald-500/10'
              : 'bg-white/80 dark:bg-[#0c0e14]/90 border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-sans font-semibold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Supported</span>
          </div>
          <div className="text-2xl font-sans font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">{supportedCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'CONTRADICTED' ? 'ALL' : 'CONTRADICTED')}
          className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer backdrop-blur-sm ${
            filter === 'CONTRADICTED'
              ? 'bg-rose-500/15 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30 shadow-md shadow-rose-500/10'
              : 'bg-white/80 dark:bg-[#0c0e14]/90 border-slate-200/90 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 text-rose-700 dark:text-rose-400 text-xs font-sans font-semibold uppercase tracking-wider">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Contradicted</span>
          </div>
          <div className="text-2xl font-sans font-extrabold tracking-tight text-rose-600 dark:text-rose-400 mt-1">{contradictedCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'UNVERIFIED' ? 'ALL' : 'UNVERIFIED')}
          className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer backdrop-blur-sm ${
            filter === 'UNVERIFIED'
              ? 'bg-amber-500/15 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30 shadow-md shadow-amber-500/10'
              : 'bg-white/80 dark:bg-[#0c0e14]/90 border-slate-200/90 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-sans font-semibold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Unverified</span>
          </div>
          <div className="text-2xl font-sans font-extrabold tracking-tight text-amber-600 dark:text-amber-400 mt-1">{unverifiedCount}</div>
        </button>
      </div>

      {/* 3. INTERACTIVE LLM RESPONSE BOX WITH INLINE CITATIONS */}
      <div className="bg-white/80 dark:bg-[#0c0e14]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-850">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Evaluated LLM Response &bull; Claim Annotations
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline font-sans font-normal">
            Hover to preview &bull; Click to illuminate
          </span>
        </div>

        <div className="p-4 bg-slate-50/70 dark:bg-[#08090c]/70 border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <AnnotatedText
            text={result.llmAnswer}
            claims={result.claims}
            onClaimClick={handleClaimNavigate}
            targetedClaimId={targetedClaimId}
          />
        </div>
      </div>

      {/* 4. EXTRACTED ATOMIC CLAIMS & CORROBORATING EVIDENCE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <span>Extracted Claims &amp; Verification Evidence</span>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
              {filteredClaims.length} of {result.claims.length}
            </span>
          </h3>

          {filter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className="text-xs font-sans font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer"
            >
              Show All Claims
            </button>
          )}
        </div>

        <div className="space-y-3">
          {filteredClaims.map((claim, index) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              claimIndex={index + 1}
              isTargeted={targetedClaimId === claim.id}
            />
          ))}
        </div>
      </div>

      {/* Observability Metadata & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-sans font-normal text-slate-400 dark:text-slate-500">
        <div>
          <span>Verification mode: </span>
          <span className="font-sans font-semibold text-slate-600 dark:text-slate-300">
            {isLiveBackend ? 'FastAPI :8000 (Live Pipeline)' : 'Isolated Demo Preset'}
          </span>
          {notice && <span className="ml-1 text-slate-400 dark:text-slate-500">({notice})</span>}
        </div>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 font-sans font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Studio</span>
          </button>
        )}
      </div>
    </div>
  );
};