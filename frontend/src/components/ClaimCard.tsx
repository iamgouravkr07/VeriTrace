import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import type { Claim } from '../types';
import { EvidenceCard } from './EvidenceCard';

interface ClaimCardProps {
  claim: Claim;
  claimIndex?: number;
  isTargeted?: boolean;
}

export const ClaimCard = ({ claim, claimIndex, isTargeted = false }: ClaimCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const getStatusConfig = () => {
    switch (claim.status) {
      case 'SUPPORTED':
        return {
          icon: CheckCircle2,
          label: 'SUPPORTED',
          badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          barColor: 'bg-emerald-500',
          borderColor: isTargeted ? 'border-emerald-400 ring-2 ring-emerald-300 dark:ring-emerald-800' : 'border-slate-200 dark:border-slate-800',
        };
      case 'CONTRADICTED':
        return {
          icon: XCircle,
          label: 'CONTRADICTED',
          badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          barColor: 'bg-rose-500',
          borderColor: isTargeted ? 'border-rose-400 ring-2 ring-rose-300 dark:ring-rose-800' : 'border-slate-200 dark:border-slate-800',
        };
      case 'UNVERIFIED':
      default:
        return {
          icon: HelpCircle,
          label: 'UNVERIFIED',
          badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          barColor: 'bg-amber-500',
          borderColor: isTargeted ? 'border-amber-400 ring-2 ring-amber-300 dark:ring-amber-800' : 'border-slate-200 dark:border-slate-800',
        };
    }
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  const handleCopyClaim = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(
      `[Claim #${claimIndex || 1}]: "${claim.text}" (${claim.status} - ${claim.confidence}% confidence)`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={`claim-${claim.id}`}
      className={`bg-white dark:bg-slate-900 rounded-xl border p-4 shadow-xs transition-all duration-300 ${status.borderColor}`}
    >
      {/* Top Header: Claim Text + Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1">
          {claimIndex !== undefined && (
            <span className="shrink-0 text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 mt-0.5">
              #{claimIndex}
            </span>
          )}
          <p className="text-sm font-sans font-semibold text-slate-900 dark:text-slate-100 leading-snug">{claim.text}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-semibold rounded-full border ${status.badgeClass}`}
            aria-label={`Claim status: ${status.label}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{status.label}</span>
          </span>

          <button
            type="button"
            onClick={handleCopyClaim}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Copy claim details"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Metrics Bar & Expand Toggle */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              NLI Confidence:
            </span>
            <span className="font-sans font-bold text-slate-800 dark:text-slate-200">{claim.confidence}%</span>
            <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${status.barColor}`}
                style={{ width: `${Math.min(100, Math.max(0, claim.confidence))}%` }}
              />
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-sans font-normal text-slate-400 dark:text-slate-500">
            <FileText className="w-3 h-3" />
            <span>{claim.evidence?.length || 0} Evidence Sources</span>
          </div>
        </div>

        {claim.evidence && claim.evidence.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[11px] font-sans font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer"
          >
            <span>{isExpanded ? 'Hide Sources' : `View Sources (${claim.evidence.length})`}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Expandable Evidence Accordion */}
      {isExpanded && claim.evidence && claim.evidence.length > 0 && (
        <div className="mt-3 space-y-2 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
          {claim.evidence.map((ev, idx) => (
            <EvidenceCard
              key={ev.id}
              evidence={ev}
              evidenceIndex={idx + 1}
              isTargeted={isTargeted}
            />
          ))}
        </div>
      )}
    </div>
  );
};