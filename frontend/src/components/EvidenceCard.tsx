import type { EvidenceItem } from '../types';

export const EvidenceCard = ({ evidence }: { evidence: EvidenceItem }) => {
  return (
    <div className="bg-slate-50/80 border border-slate-200 rounded-md p-3 text-xs mt-2 transition-colors">
      <div className="flex items-center gap-1.5 font-semibold text-slate-700">
        <span className="text-blue-600" aria-hidden="true">
          📖
        </span>
        <span>Source:</span>
        <span className="text-slate-900">{evidence.sourceTitle}</span>
      </div>
      <blockquote className="text-slate-600 italic mt-1.5 pl-2 border-l-2 border-blue-200 leading-relaxed">
        &ldquo;{evidence.snippet}&rdquo;
      </blockquote>
    </div>
  );
};