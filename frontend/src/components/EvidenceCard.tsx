import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { EvidenceItem } from '../types';

interface EvidenceCardProps { evidence: EvidenceItem; evidenceIndex?: number; isTargeted?: boolean }

export const EvidenceCard = ({ evidence, evidenceIndex, isTargeted = false }: EvidenceCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(evidence.snippet && evidence.snippet.length > 280);
  const title = evidence.sourceTitle || 'Source attribution unavailable';
  const snippet = evidence.snippet || 'No source excerpt was supplied.';

  return <article className={`rounded-lg border p-3 transition-colors ${isTargeted ? 'border-blue-400 bg-blue-50/70 dark:bg-blue-950/30' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60'}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex items-start gap-2">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Source evidence</p>
          <p className="break-words text-xs font-medium text-slate-900 dark:text-slate-100">{evidenceIndex ? `[#${evidenceIndex}] ` : ''}{title}</p>
          {evidence.sourceUrl && <a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[11px] text-blue-700 underline underline-offset-2 dark:text-blue-400"><span className="truncate">{evidence.sourceUrl}</span><ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" /></a>}
        </div>
      </div>
      {hasDetails && <button type="button" onClick={() => setExpanded(!expanded)} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400" aria-expanded={expanded}>{expanded ? 'Collapse' : 'Read excerpt'} {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>}
    </div>
    <blockquote className={`mt-2 border-l-2 border-blue-400 pl-3 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 ${!expanded && hasDetails ? 'line-clamp-3' : ''}`}>{snippet}</blockquote>
  </article>;
};
