import { useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
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
  const [hoveredClaimId, setHoveredClaimId] = useState<string | null>(null);

  if (!claims || claims.length === 0 || !text) {
    return <span className="text-slate-800 dark:text-slate-100 leading-relaxed font-sans">{text}</span>;
  }

  const activeFocusId = hoveredClaimId || targetedClaimId;

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
          {claims.map((claim, idx) => {
            const isClaimActive = activeFocusId === claim.id;
            const hasAnyActive = Boolean(activeFocusId);
            const dimClass = hasAnyActive && !isClaimActive ? 'opacity-40 transition-opacity' : 'opacity-100 transition-opacity';

            return (
              <button
                key={claim.id}
                type="button"
                onClick={() => onClaimClick(claim.id)}
                onMouseEnter={() => {
                  setHoveredClaimId(claim.id);
                  setActiveTooltipClaim(claim);
                }}
                onMouseLeave={() => {
                  setHoveredClaimId(null);
                  setActiveTooltipClaim(null);
                }}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all ${dimClass} ${
                  claim.status === 'SUPPORTED'
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                    : claim.status === 'CONTRADICTED'
                      ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                      : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                } ${isClaimActive ? 'ring-2 ring-blue-500 font-black' : ''}`}
              >
                [{idx + 1}]
              </button>
            );
          })}
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
        const isClaimActive = activeFocusId === claim.id;
        const hasAnyActive = Boolean(activeFocusId);
        const isContradicted = claim.status === 'CONTRADICTED';
        const isSupported = claim.status === 'SUPPORTED';

        const highlightStyles = isContradicted
          ? 'bg-rose-100/90 dark:bg-rose-950/70 text-rose-950 dark:text-rose-200 border-b-2 border-rose-500 hover:bg-rose-200/90 dark:hover:bg-rose-900/70'
          : isSupported
            ? 'bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 border-b-2 border-emerald-500 hover:bg-emerald-200/90 dark:hover:bg-emerald-900/70'
            : 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border-b-2 border-amber-500 hover:bg-amber-200/90 dark:hover:bg-amber-900/70';

        const activeGlowStyles = isClaimActive
          ? isContradicted
            ? 'ring-2 ring-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.35)] font-semibold'
            : isSupported
              ? 'ring-2 ring-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)] font-semibold'
              : 'ring-2 ring-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.35)] font-semibold'
          : '';

        const dimClass = hasAnyActive && !isClaimActive ? 'opacity-40' : 'opacity-100';

        return (
          <span
            key={i}
            className={`relative inline transition-all duration-200 ${dimClass}`}
            onMouseEnter={() => {
              setHoveredClaimId(claim.id);
              setActiveTooltipClaim(claim);
            }}
            onMouseLeave={() => {
              setHoveredClaimId(null);
              setActiveTooltipClaim(null);
            }}
          >
            <span
              onClick={() => onClaimClick(claim.id)}
              className={`px-1 py-0.5 rounded-sm transition-all duration-200 cursor-pointer ${highlightStyles} ${activeGlowStyles}`}
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

      {/* Floating Hover Tooltip - High-Tech Telemetry Card */}
      {activeTooltipClaim && (
        <div
          role="tooltip"
          className="absolute z-40 left-0 right-0 sm:left-auto sm:max-w-md -bottom-2 transform translate-y-full bg-slate-900/95 dark:bg-[#0c0e14]/95 backdrop-blur-md text-white rounded-xl p-3.5 text-xs shadow-2xl border border-slate-700/80 dark:border-slate-800 pointer-events-none transition-all duration-200"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] font-mono">
                X-Ray Claim Telemetry
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                activeTooltipClaim.status === 'SUPPORTED'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : activeTooltipClaim.status === 'CONTRADICTED'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              {activeTooltipClaim.status} &bull; {activeTooltipClaim.confidence}% NLI
            </span>
          </div>

          <p className="mt-2 text-slate-200 font-medium leading-relaxed">
            &ldquo;{activeTooltipClaim.text}&rdquo;
          </p>

          {/* Radar / Confidence Bar */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono text-[10px] uppercase">NLI Entailment:</span>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    activeTooltipClaim.status === 'SUPPORTED'
                      ? 'bg-emerald-400'
                      : activeTooltipClaim.status === 'CONTRADICTED'
                        ? 'bg-rose-400'
                        : 'bg-amber-400'
                  }`}
                  style={{ width: `${activeTooltipClaim.confidence}%` }}
                />
              </div>
              <span className="font-mono font-bold text-slate-200">{activeTooltipClaim.confidence}%</span>
            </div>
          </div>

          {activeTooltipClaim.evidence?.[0] && (
            <div className="mt-2.5 text-[11px] text-slate-300 bg-slate-800/70 dark:bg-slate-900/80 rounded-lg p-2.5 border border-slate-700/60">
              <div className="flex items-center justify-between text-blue-400 font-semibold mb-1">
                <span className="truncate flex items-center gap-1 text-[11px]">
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span>Top Source: {activeTooltipClaim.evidence[0].sourceTitle}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 ml-2 shrink-0">
                  {activeTooltipClaim.confidence}% NLI
                </span>
              </div>
              <p className="italic text-slate-300 line-clamp-2 text-[11px] leading-relaxed">
                &ldquo;{activeTooltipClaim.evidence[0].snippet}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

