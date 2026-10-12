import { useState } from 'react';
import { AlertOctagon, CheckCircle2, HelpCircle, Layers, RotateCcw } from 'lucide-react';
import type { VerificationResponse, VerificationStatus } from '../types';
import { RiskScore } from '../components/RiskScore';
import { ClaimCard } from '../components/ClaimCard';
import { AnnotatedText } from '../components/AnnotatedText';

interface ResultsProps { result: VerificationResponse; isLiveBackend?: boolean; notice?: string; onReset?: () => void }
const filters: Array<{ key: VerificationStatus; label: string; icon: typeof CheckCircle2; classes: string }> = [
  { key: 'SUPPORTED', label: 'Supported', icon: CheckCircle2, classes: 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/30' },
  { key: 'CONTRADICTED', label: 'Contradicted', icon: AlertOctagon, classes: 'text-rose-700 border-rose-200 bg-rose-50 dark:text-rose-300 dark:border-rose-800 dark:bg-rose-950/30' },
  { key: 'UNVERIFIED', label: 'Insufficient evidence', icon: HelpCircle, classes: 'text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-800 dark:bg-amber-950/30' },
];

export const Results = ({ result, isLiveBackend, notice, onReset }: ResultsProps) => {
  const [filter, setFilter] = useState<VerificationStatus | 'ALL'>('ALL');
  const [targetedClaimId, setTargetedClaimId] = useState<string | null>(null);
  const counts = filters.reduce((all, item) => ({ ...all, [item.key]: result.claims.filter((claim) => claim.status === item.key).length }), {} as Record<VerificationStatus, number>);
  const claims = result.claims.filter((claim) => filter === 'ALL' || claim.status === filter);
  const navigateToClaim = (id: string) => { setTargetedClaimId(id); document.getElementById(`claim-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); window.setTimeout(() => setTargetedClaimId((current) => current === id ? null : current), 2500); };
  const verdictSummary = result.claims.length === 0 ? 'No claims were returned for this response.' : counts.CONTRADICTED > 0 ? 'At least one claim conflicts with the supplied evidence.' : counts.UNVERIFIED > 0 ? 'Some claims could not be assessed with sufficient evidence.' : 'The returned claims are supported by the supplied evidence.';

  return <div className="space-y-5">
    <section aria-labelledby="results-heading" className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><h2 id="results-heading" className="text-base font-semibold text-slate-950 dark:text-white">Verification summary</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{verdictSummary} Evidence-based verdicts are signals for review, not a guarantee of truth.</p></section>
    <RiskScore score={result.hallucinationRisk} latencySeconds={result.latencySeconds} model={result.model} fullResult={result} />
    <div className="grid grid-cols-3 gap-2 sm:gap-3">{filters.map(({ key, label, icon: Icon, classes }) => <button key={key} type="button" onClick={() => setFilter(filter === key ? 'ALL' : key)} aria-pressed={filter === key} className={`rounded-xl border p-3 text-left transition ${classes} ${filter === key ? 'ring-2 ring-blue-300' : 'opacity-90 hover:opacity-100'}`}><Icon className="h-4 w-4" aria-hidden="true" /><span className="mt-2 block text-xs font-semibold leading-tight">{label}</span><strong className="mt-1 block text-xl">{counts[key]}</strong></button>)}</div>
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="answer-heading"><div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800"><Layers className="h-4 w-4 text-blue-600" /><h3 id="answer-heading" className="text-sm font-semibold">Response and claim annotations</h3></div><div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><AnnotatedText text={result.llmAnswer} claims={result.claims} onClaimClick={navigateToClaim} targetedClaimId={targetedClaimId} /></div></section>
    <section aria-labelledby="claims-heading"><div className="mb-3 flex items-center justify-between gap-3"><h3 id="claims-heading" className="text-sm font-semibold">Claim-level results <span className="ml-1 text-xs font-normal text-slate-500">{claims.length} of {result.claims.length}</span></h3>{filter !== 'ALL' && <button type="button" onClick={() => setFilter('ALL')} className="text-xs font-semibold text-blue-700 dark:text-blue-400">Show all</button>}</div><div className="space-y-3">{claims.map((claim, index) => <ClaimCard key={claim.id} claim={claim} claimIndex={index + 1} isTargeted={targetedClaimId === claim.id} />)}</div></section>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800"><span>Mode: <strong>{isLiveBackend ? 'Live backend' : 'Offline demo'}</strong>{notice ? ` (${notice})` : ''}</span>{onReset && <button type="button" onClick={onReset} className="inline-flex items-center gap-1 font-semibold"><RotateCcw className="h-3.5 w-3.5" />Reset Studio</button>}</div>
  </div>;
};
