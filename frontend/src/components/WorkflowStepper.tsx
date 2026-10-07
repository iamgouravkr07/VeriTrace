interface WorkflowStepperProps {
  currentStage: 'input' | 'analyzing' | 'completed';
}

export const WorkflowStepper = ({ currentStage }: WorkflowStepperProps) => {
  const steps = [
    { id: 1, title: 'User Input', desc: 'Query / Response' },
    { id: 2, title: 'Analysis', desc: 'Atomic Claim Extraction' },
    { id: 3, title: 'Evidence', desc: 'Retrieval & NLI' },
    { id: 4, title: 'Final Verdict', desc: 'Hallucination Risk' },
  ];

  const getStepStatus = (stepId: number) => {
    if (currentStage === 'completed') return 'completed';
    if (currentStage === 'analyzing') {
      if (stepId <= 3) return 'active';
      return 'pending';
    }
    // 'input' stage
    if (stepId === 1) return 'active';
    return 'pending';
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mb-6 shadow-xs"
      aria-label="VeriTrace Pipeline Workflow"
    >
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
          Pipeline Flow
        </span>
        <span className="text-[11px] text-slate-400">
          {currentStage === 'completed'
            ? '✓ Verification Complete'
            : currentStage === 'analyzing'
              ? '⚡ Analyzing Claims...'
              : 'Waiting for Input'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {steps.map((step) => {
          const status = getStepStatus(step.id);
          return (
            <div
              key={step.id}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                status === 'completed'
                  ? 'border-emerald-200 bg-emerald-50/50 text-slate-800'
                  : status === 'active'
                    ? 'border-blue-300 bg-blue-50/60 text-blue-950 ring-1 ring-blue-300'
                    : 'border-slate-100 bg-slate-50/60 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    status === 'completed'
                      ? 'bg-emerald-600 text-white'
                      : status === 'active'
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {status === 'completed' ? '✓' : step.id}
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                  Step {step.id}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-xs font-semibold leading-tight">{step.title}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
