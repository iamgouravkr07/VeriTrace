import type { Claim } from '../types';
import { EvidenceCard } from './EvidenceCard';

interface ClaimCardProps {
  claim: Claim;
  claimIndex?: number;
}

export const ClaimCard = ({ claim, claimIndex }: ClaimCardProps) => {
  const getStatusBadge = () => {
    switch (claim.status) {
      case 'SUPPORTED':
        return {
          icon: '✓',
          label: 'SUPPORTED',
          styles: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'CONTRADICTED':
        return {
          icon: '✗',
          label: 'CONTRADICTED',
          styles: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'UNVERIFIED':
      default:
        return {
          icon: '?',
          label: 'UNVERIFIED',
          styles: 'bg-amber-50 text-amber-700 border-amber-200',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-xs space-y-3">
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-start gap-2">
          {claimIndex !== undefined && (
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 mt-0.5">
              #{claimIndex}
            </span>
          )}
          <p className="text-sm font-medium text-slate-900 leading-snug">{claim.text}</p>
        </div>
        <span
          className={`shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full border flex items-center gap-1 ${badge.styles}`}
          aria-label={`Claim verification status: ${badge.label}`}
        >
          <span aria-hidden="true">{badge.icon}</span>
          <span>{badge.label}</span>
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>NLI Confidence:</span>
        <strong className="text-slate-700">{claim.confidence}%</strong>
        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-400 rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, claim.confidence))}%` }}
          />
        </div>
      </div>

      {claim.evidence && claim.evidence.length > 0 ? (
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
            Corroborating Evidence ({claim.evidence.length})
          </span>
          {claim.evidence.map((ev) => (
            <EvidenceCard key={ev.id} evidence={ev} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic pt-1 border-t border-slate-100">
          No external retrieval evidence linked to this claim.
        </p>
      )}
    </div>
  );
};