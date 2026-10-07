import {
  FileDown,
  Split,
  Database,
  ShieldCheck,
  Gauge,
  Check,
} from 'lucide-react';

export type PipelineStage = 1 | 2 | 3 | 4 | 5;

interface WorkflowStepperProps {
  currentStage?: PipelineStage;
  isCompleted?: boolean;
}

export const WorkflowStepper = ({
  currentStage = 1,
  isCompleted = false,
}: WorkflowStepperProps) => {
  const steps = [
    { id: 1, title: 'Ingestion', desc: 'Query & Assertion Input', icon: FileDown },
    { id: 2, title: 'Claim Extraction', desc: 'Atomic Proposition Splitting', icon: Split },
    { id: 3, title: 'Source Retrieval', desc: 'Vector & Keyword Search', icon: Database },
    { id: 4, title: 'Cross-Verification', desc: 'NLI Entailment & Contradiction', icon: ShieldCheck },
    { id: 5, title: 'Risk Scoring', desc: 'Hallucination Severity Meter', icon: Gauge },
  ];

  const getStepState = (stepId: number) => {
    if (isCompleted) return 'completed';
    if (stepId < currentStage) return 'completed';
    if (stepId === currentStage) return 'active';
    return 'pending';
  };

  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors duration-200"
      aria-label="VeriTrace Pipeline Workflow"
    >
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
          Verification Pipeline Architecture
        </span>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {isCompleted
            ? '✓ Pipeline Run Complete'
            : `Executing Stage ${currentStage} of 5`}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {steps.map((step) => {
          const state = getStepState(step.id);
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`p-3 rounded-lg border text-left transition-all duration-300 relative ${
                state === 'completed'
                  ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/40 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : state === 'active'
                    ? 'border-blue-400 dark:border-blue-600 bg-blue-50/80 dark:bg-blue-950/70 text-blue-950 dark:text-blue-100 ring-2 ring-blue-300 dark:ring-blue-800 shadow-xs'
                    : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/50 text-slate-400 dark:text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                    state === 'completed'
                      ? 'bg-emerald-600 dark:bg-emerald-500 text-white'
                      : state === 'active'
                        ? 'bg-blue-600 dark:bg-blue-500 text-white animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {state === 'completed' ? <Check className="w-3.5 h-3.5" /> : step.id}
                </span>

                <Icon
                  className={`w-4 h-4 ${
                    state === 'completed'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : state === 'active'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              </div>

              <div>
                <p className="text-xs font-bold leading-snug">{step.title}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
