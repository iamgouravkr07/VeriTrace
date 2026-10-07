import type { VerificationResponse } from '../types';
import { RiskScore } from '../components/RiskScore';
import { ClaimCard } from '../components/ClaimCard';
import { Citation } from '../components/Citation';

interface ResultsProps {
  result: VerificationResponse;
  isLiveBackend?: boolean;
  notice?: string;
  onReset?: () => void;
}

export const Results = ({ result, isLiveBackend, notice, onReset }: ResultsProps) => {
  const supportedCount = result.claims.filter((c) => c.status === 'SUPPORTED').length;
  const contradictedCount = result.claims.filter((c) => c.status === 'CONTRADICTED').length;
  const unverifiedCount = result.claims.filter((c) => c.status === 'UNVERIFIED').length;

  return (
    <div className="space-y-6">
      {/* Verification Status Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        {/* Source / Mode badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isLiveBackend
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLiveBackend ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              {isLiveBackend ? 'Live Backend Verification' : 'Offline Demo Verification'}
            </span>
            {notice && <span className="text-xs text-slate-400 italic">({notice})</span>}
          </div>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
            >
              Verify Another Query
            </button>
          )}
        </div>

        {/* SECTION 1: FINAL VERDICT */}
        <section aria-labelledby="verdict-heading">
          <h3 id="verdict-heading" className="sr-only">
            Final Verdict
          </h3>
          <RiskScore score={result.hallucinationRisk} latencySeconds={result.latencySeconds} />

          {/* Quick Verdict Summary Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                Supported
              </span>
              <span className="text-xl font-bold text-emerald-700">{supportedCount}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200">
              <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
                Contradicted
              </span>
              <span className="text-xl font-bold text-rose-700">{contradictedCount}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                Unverified
              </span>
              <span className="text-xl font-bold text-amber-700">{unverifiedCount}</span>
            </div>
          </div>
        </section>

        {/* SECTION 2: TARGET LLM ANSWER WITH CLAIM CITATIONS */}
        <section aria-labelledby="target-answer-heading" className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <h4
              id="target-answer-heading"
              className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
              Target LLM Answer Under Evaluation
            </h4>
            <span className="text-[11px] text-slate-400">Query: &ldquo;{result.query}&rdquo;</span>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 leading-relaxed font-sans">
            {result.llmAnswer}
            {result.claims.map((claim, idx) => (
              <Citation
                key={claim.id}
                index={idx + 1}
                title={claim.evidence[0]?.sourceTitle || claim.status}
              />
            ))}
          </div>
        </section>

        {/* SECTION 3: EXTRACTED CLAIMS & EVIDENCE BREAKDOWN */}
        <section aria-labelledby="claims-heading" className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h4
              id="claims-heading"
              className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
              Extracted Atomic Claims &amp; Evidence ({result.claims.length})
            </h4>
            <span className="text-xs text-slate-400">
              Corroborated against reference knowledge base
            </span>
          </div>

          <div className="space-y-3">
            {result.claims.map((claim, index) => (
              <ClaimCard key={claim.id} claim={claim} claimIndex={index + 1} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};