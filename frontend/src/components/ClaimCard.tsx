import { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { Claim } from '../types';
import { EvidenceCard } from './EvidenceCard';

interface ClaimCardProps { claim: Claim; claimIndex?: number; isTargeted?: boolean }
const config = {
  SUPPORTED: { label: 'Supported by evidence', icon: CheckCircle2, tone: 'emerald', text: 'The supplied evidence supports this claim.' },
  CONTRADICTED: { label: 'Contradicted by evidence', icon: XCircle, tone: 'rose', text: 'The supplied evidence conflicts with this claim.' },
  UNVERIFIED: { label: 'Insufficient evidence', icon: HelpCircle, tone: 'amber', text: 'No sufficient evidence was supplied to assess this claim.' },
} as const;

export const ClaimCard = ({ claim, claimIndex, isTargeted = false }: ClaimCardProps) => {
  const [expanded, setExpanded] = useState(true);
  const status = config[claim.status];
  const Icon = status.icon;
  const evidence = claim.evidence || [];
  const tone = status.tone;
  return <article id={`claim-${claim.id}`} className={`rounded-xl border bg-white p-4 shadow-sm transition-all dark:bg-slate-900 ${isTargeted ? `border-${tone}-400 ring-2 ring-${tone}-200` : 'border-slate-200 dark:border-slate-800'}`}>
    <div className="flex items-start gap-3">
      {claimIndex !== undefined && <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800">#{claimIndex}</span>}
      <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold leading-relaxed text-slate-900 dark:text-slate-100">{claim.text}</p><p className="mt-1 text-xs text-slate-500">{status.text}</p></div>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold text-${tone}-700 border-${tone}-200 bg-${tone}-50 dark:text-${tone}-300 dark:border-${tone}-800 dark:bg-${tone}-950/40`} aria-label={`Verdict: ${status.label}`}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{status.label}</span>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-3 text-slate-500"><span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{evidence.length} evidence {evidence.length === 1 ? 'item' : 'items'}</span>{claim.confidence !== undefined && <span>Confidence signal: <strong className="text-slate-800 dark:text-slate-200">{claim.confidence}%</strong></span>}{claim.risk !== undefined && <span>Claim risk: <strong className="text-slate-800 dark:text-slate-200">{claim.risk}%</strong></span>}</div>
      {evidence.length > 0 && <button type="button" onClick={() => setExpanded(!expanded)} className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400" aria-expanded={expanded}>{expanded ? 'Hide evidence' : 'Show evidence'}{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>}
    </div>
    {expanded && evidence.length > 0 && <div className="mt-3 space-y-2 border-t border-dashed border-slate-200 pt-3 dark:border-slate-800">{evidence.map((item, index) => <EvidenceCard key={item.id} evidence={item} evidenceIndex={index + 1} isTargeted={isTargeted} />)}</div>}
    {evidence.length === 0 && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">No source evidence was returned for this claim. This is not confirmation that the claim is true or false.</p>}
  </article>;
};
