import { useState } from 'react';
import { BookOpen, Copy, Check } from 'lucide-react';
import type { EvidenceItem } from '../types';

interface EvidenceCardProps {
  evidence: EvidenceItem;
  evidenceIndex?: number;
  isTargeted?: boolean;
}

export const EvidenceCard = ({
  evidence,
  evidenceIndex,
  isTargeted = false,
}: EvidenceCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopySnippet = async () => {
    await navigator.clipboard.writeText(`"${evidence.snippet}" — Source: ${evidence.sourceTitle}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={`evidence-${evidence.id}`}
      className={`rounded-lg p-3 text-xs transition-all duration-300 border ${
        isTargeted
          ? 'bg-blue-50/90 dark:bg-blue-950/70 border-blue-400 dark:border-blue-600 ring-2 ring-blue-300 dark:ring-blue-800 shadow-sm'
          : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
          <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400">Source:</span>
          <span className="text-slate-900 dark:text-slate-100 truncate" title={evidence.sourceTitle}>
            {evidenceIndex !== undefined ? `[#${evidenceIndex}] ` : ''}
            {evidence.sourceTitle}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopySnippet}
          className="shrink-0 flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded transition-colors cursor-pointer"
          title="Copy evidence snippet to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-300">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <blockquote className="mt-2 text-slate-700 dark:text-slate-300 italic border-l-2 border-blue-400 dark:border-blue-500 pl-2.5 py-0.5 leading-relaxed text-[11px] font-sans">
        &ldquo;{evidence.snippet}&rdquo;
      </blockquote>
    </div>
  );
};