interface ScoreBreakdown {
  identity: number;
  experience: number;
  qualifications: number;
  checks: number;
  availability: number;
  capabilities: number;
  referees: number;
  documents: number;
}

interface Props {
  score: number;
  breakdown: ScoreBreakdown;
  suggestions: string[];
}

const SCORE_LABELS = [
  { min: 0, max: 39, label: "Getting started", color: "bg-red-400", textColor: "text-red-600" },
  { min: 40, max: 59, label: "Building up", color: "bg-amber-400", textColor: "text-amber-600" },
  { min: 60, max: 79, label: "Looking good", color: "bg-yellow-400", textColor: "text-yellow-600" },
  { min: 80, max: 89, label: "Strong profile", color: "bg-teal-400", textColor: "text-teal-600" },
  { min: 90, max: 100, label: "Excellent!", color: "bg-emerald-500", textColor: "text-emerald-600" },
];

const BREAKDOWN_LABELS: Record<keyof ScoreBreakdown, { label: string; max: number }> = {
  identity: { label: "Identity & contact", max: 10 },
  experience: { label: "Work experience", max: 18 },
  qualifications: { label: "Qualifications", max: 12 },
  checks: { label: "Compliance checks", max: 16 },
  availability: { label: "Availability", max: 8 },
  capabilities: { label: "Capability stories", max: 10 },
  referees: { label: "Referees", max: 30 },
  documents: { label: "Documents uploaded", max: 24 },
};

export function ResumeStrengthMeter({ score, breakdown, suggestions }: Props) {
  const level = SCORE_LABELS.find((l) => score >= l.min && score <= l.max) ?? SCORE_LABELS[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">Resume Strength Score</h3>
        <span className={`text-sm font-bold ${level.textColor}`}>{level.label}</span>
      </div>

      <div className="relative">
        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
          <div
            className={`${level.color} h-4 rounded-full transition-all duration-700`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-400">0</span>
          <span className={`text-2xl font-bold ${level.textColor}`}>{score}/100</span>
          <span className="text-xs text-slate-400">100</span>
        </div>
      </div>

      <div className="space-y-2">
        {(Object.keys(breakdown) as Array<keyof ScoreBreakdown>).map((key) => {
          const { label, max } = BREAKDOWN_LABELS[key];
          const val = breakdown[key];
          const pct = Math.round((val / max) * 100);
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-32 shrink-0 text-xs text-slate-500">{label}</div>
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-teal-400" : "bg-slate-300"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="w-10 text-right text-xs text-slate-500">{val}/{max}</div>
            </div>
          );
        })}
      </div>

      {suggestions.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <p className="text-xs font-semibold text-amber-800 mb-2">Tips to improve your score</p>
          <ul className="space-y-1">
            {suggestions.map((s, i) => (
              <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                <span className="mt-0.5">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
