import { useState } from 'react';
import type { Claim } from '../types';

interface AnnotatedTextProps {
  text: string;
  claims: Claim[];
  onClaimClick: (claimId: string) => void;
  targetedClaimId?: string | null;
}

export const AnnotatedText = ({
  text,
  claims,
  onClaimClick,
  targetedClaimId,
}: AnnotatedTextProps) => {
  const [activeTooltipClaim, setActiveTooltipClaim] = useState<Claim | null>(null);

  if (!claims || claims.length === 0 || !text) {
    return <span className="text-slate-800 dark:text-slate-100 leading-relaxed font-sans">{text}</span>;
  }

  const segments: Array<{ text: string; claim?: Claim; index?: number }> = [];
  const matches: Array<{ start: number; end: number; claim: Claim; index: number }> = [];

  claims.forEach((claim, idx) => {
    if (!claim.text) return;
    const startIdx = text.toLowerCase().indexOf(claim.text.toLowerCase());
    if (startIdx !== -1) {
      matches.push({
        start: startIdx,
        end: startIdx + claim.text.length,
        claim,
        index: idx + 1,
      });
    }
  });

  matches.sort((a, b) => a.start - b.start);

  if (matches.length === 0) {
    return (
      <div className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-sans">
        <span>{text}</span>
        <span className="inline-flex items-center gap-1 ml-2">
          {claims.map((claim, idx) => (
            <button
              key={claim.id}
              type="button"
              onClick={() => onClaimClick(claim.id)}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                claim.status === 'SUPPORTED'
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                  : claim.status === 'CONTRADICTED'
                    ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                    : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
              }`}
            >
              [{idx + 1}]
            </button>
          ))}
        </span>
      </div>
    );
  }

  let currentPos = 0;
  matches.forEach((match) => {
    if (match.start > currentPos) {
      segments.push({ text: text.slice(currentPos, match.start) });
    }
    segments.push({
      text: text.slice(match.start, match.end),
      claim: match.claim,
      index: match.index,
    });
    currentPos = match.end;
  });

  if (currentPos < text.length) {
    segments.push({ text: text.slice(currentPos) });
  }

  return (
    <div className="relative text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-sans">
      {segments.map((segment, i) => {
        if (!segment.claim) {
          return <span key={i}>{segment.text}</span>;
        }

        const claim = segment.claim;
        const isTargeted = targetedClaimId === claim.id;
        const isContradicted = claim.status === 'CONTRADICTED';
        const isSupported = claim.status === 'SUPPORTED';

        const highlightStyles = isContradicted
          ? 'bg-rose-100/90 dark:bg-rose-950/70 text-rose-950 dark:text-rose-200 border-b-2 border-rose-500 hover:bg-rose-200/90 dark:hover:bg-rose-900/70'
          : isSupported
            ? 'bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 border-b-2 border-emerald-500 hover:bg-emerald-200/90 dark:hover:bg-emerald-900/70'
            : 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border-b-2 border-amber-500 hover:bg-amber-200/90 dark:hover:bg-amber-900/70';

        return (
          <span
            key={i}
            className="relative inline"
            onMouseEnter={() => setActiveTooltipClaim(claim)}
            onMouseLeave={() => setActiveTooltipClaim(null)}
          >
            <span
              onClick={() => onClaimClick(claim.id)}
              className={`px-1 py-0.5 rounded-sm transition-all duration-200 cursor-pointer ${highlightStyles} ${
                isTargeted ? 'ring-2 ring-blue-500 font-medium' : ''
              }`}
            >
              {segment.text}
            </span>

            {/* In-text Footnote Anchor */}
            <button
              type="button"
              onClick={() => onClaimClick(claim.id)}
              className={`inline-flex items-center text-[10px] font-bold px-1 py-0.2 mx-0.5 rounded cursor-pointer select-none transition-transform hover:scale-110 ${
                isContradicted
                  ? 'bg-rose-200 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                  : isSupported
                    ? 'bg-emerald-200 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
              }`}
              title={`View Evidence for Claim #${segment.index}`}
            >
              [{segment.index}]
            </button>
          </span>
        );
      })}

      {/* Floating Hover Tooltip */}
      {activeTooltipClaim && (
        <div
          role="tooltip"
          className="absolute z-40 left-0 right-0 sm:left-auto sm:max-w-md -bottom-2 transform translate-y-full bg-slate-900 dark:bg-slate-950 text-white rounded-lg p-3 text-xs shadow-xl border border-slate-700 dark:border-slate-800 pointer-events-none transition-all duration-200"
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              Claim Inspection
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                activeTooltipClaim.status === 'SUPPORTED'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : activeTooltipClaim.status === 'CONTRADICTED'
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {activeTooltipClaim.status} ({activeTooltipClaim.confidence}% NLI)
            </span>
          </div>

          <p className="mt-1 text-slate-200 font-medium line-clamp-2">
            &ldquo;{activeTooltipClaim.text}&rdquo;
          </p>

          {activeTooltipClaim.evidence?.[0] && (
            <div className="mt-2 text-[11px] text-slate-300 bg-slate-800/80 rounded p-2 border border-slate-700/60">
              <span className="text-blue-400 font-semibold block mb-0.5">
                Top Source: {activeTooltipClaim.evidence[0].sourceTitle}
              </span>
              <span className="italic text-slate-300 line-clamp-2">
                &ldquo;{activeTooltipClaim.evidence[0].snippet}&rdquo;
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
