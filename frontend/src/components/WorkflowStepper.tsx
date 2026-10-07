import {
  FileDown,
  Split,
  Database,
  ShieldCheck,
  Gauge,
  Check,
  Activity,
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
    { id: 1, tag: 'INGEST', title: 'Ingestion', desc: 'Prompt & Assertion Input', icon: FileDown },
    { id: 2, tag: 'EXTRACT', title: 'Claim Splitting', desc: 'Atomic Proposition Parser', icon: Split },
    { id: 3, tag: 'RETRIEVE', title: 'Source Retrieval', desc: 'Dense Vector & Hybrid Search', icon: Database },
    { id: 4, tag: 'CROSS-CHECK', title: 'Cross-Verification', desc: 'NLI Entailment Engine', icon: ShieldCheck },
    { id: 5, tag: 'SCORE', title: 'Truth Core', desc: 'Hallucination Risk Meter', icon: Gauge },
  ];

  const getStepState = (stepId: number) => {
    if (isCompleted) return 'completed';
    if (stepId < currentStage) return 'completed';
    if (stepId === currentStage) return 'active';
    return 'pending';
  };

  return (
    <div
      className="bg-white/80 dark:bg-[#0c0e14]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-colors duration-200"
      aria-label="VeriTrace Pipeline Workflow"
    >
      {/* Header telemetry trace banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-850">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isCompleted ? 'bg-emerald-400' : 'bg-blue-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isCompleted ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
            />
          </span>
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span>Logic Trace Pipeline</span>
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-slate-400 dark:text-slate-500">STATUS:</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
              isCompleted
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 animate-pulse'
            }`}
          >
            {isCompleted
              ? '✓ PIPELINE RESOLVED'
              : `STAGE 0${currentStage}/05: [${steps[currentStage - 1]?.tag}] RUNNING`}
          </span>
        </div>
      </div>

      {/* Stepper Grid with Illuminated Connectors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 relative">
        {steps.map((step, idx) => {
          const state = getStepState(step.id);
          const Icon = step.icon;
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.id} className="relative group">
              <div
                className={`h-full p-3.5 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                  state === 'completed'
                    ? 'border-emerald-300/60 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : state === 'active'
                      ? 'border-blue-400 dark:border-blue-500/80 bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/30 shadow-md shadow-blue-500/10'
                      : 'border-slate-200/60 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500'
                }`}
              >
                {/* Stage Index & Indicator */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold transition-all ${
                        state === 'completed'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : state === 'active'
                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400 animate-pulse'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {state === 'completed' ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : step.id}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                      [{step.tag}]
                    </span>
                  </div>

                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      state === 'completed'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : state === 'active'
                          ? 'text-blue-600 dark:text-blue-400 animate-bounce'
                          : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                </div>

                {/* Stage Title and Description */}
                <div>
                  <p className="text-xs font-sans font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {step.title}
                  </p>
                  <p className="text-[10px] font-sans font-normal text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {step.desc}
                  </p>
                </div>
              </div>

              {/* Connecting logic line on desktop */}
              {!isLast && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-3 h-0.5 -translate-y-1/2 z-10 pointer-events-none">
                  <div
                    className={`h-full w-full transition-colors duration-500 ${
                      state === 'completed'
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                        : state === 'active'
                          ? 'bg-gradient-to-r from-blue-500 to-slate-300 dark:to-slate-700 animate-pulse'
                          : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
