interface RiskScoreProps {
  score: number;
  latencySeconds?: number;
}

export const RiskScore = ({ score, latencySeconds }: RiskScoreProps) => {
  const normalizedScore = Math.min(100, Math.max(0, Math.round(score)));

  let statusText = 'LOW RISK';
  let badgeStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let valueColor = 'text-emerald-700';
  let barColor = 'bg-emerald-500';

  if (normalizedScore > 60) {
    statusText = 'HIGH RISK';
    badgeStyles = 'bg-rose-50 text-rose-700 border-rose-200';
    valueColor = 'text-rose-700';
    barColor = 'bg-rose-500';
  } else if (normalizedScore > 25) {
    statusText = 'MODERATE RISK';
    badgeStyles = 'bg-amber-50 text-amber-700 border-amber-200';
    valueColor = 'text-amber-700';
    barColor = 'bg-amber-500';
  }

  return (
    <div className="border-b border-slate-200 pb-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
            Hallucination Risk
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className={`text-3xl font-extrabold ${valueColor}`}>{normalizedScore}%</span>
            {latencySeconds !== undefined && (
              <span className="text-xs text-slate-400">({latencySeconds}s analysis)</span>
            )}
          </div>
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${badgeStyles}`}
          aria-label={`Verification risk verdict: ${statusText}`}
        >
          {statusText}
        </span>
      </div>

      <div
        className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden"
        role="meter"
        aria-valuenow={normalizedScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Hallucination risk percentage"
      >
        <div
          className={`h-full transition-all duration-500 ${barColor}`}
          style={{ width: `${normalizedScore}%` }}
        />
      </div>
    </div>
  );
};