interface ProfileCompletionBarProps {
  pct: number;
  items: Record<string, boolean>;
  itemLabels?: Record<string, string>;
  compact?: boolean;
}

const WORKER_LABELS: Record<string, string> = {
  location: "Location",
  bio: "Bio",
  experienceYears: "Experience",
  skills: "Skills",
  documents: "Documents",
  availability: "Availability",
  resume: "Resume",
  references: "References",
  introVideo: "Intro video",
  photo: "Profile photo",
};

const EMPLOYER_LABELS: Record<string, string> = {
  location: "Location",
  servicesProvided: "Services",
  serviceAreas: "Service areas",
  organisationSize: "Org size",
  logo: "Logo",
  jobPosted: "Job posted",
};

export function workerItemLabels() { return WORKER_LABELS; }
export function employerItemLabels() { return EMPLOYER_LABELS; }

function barColor(pct: number) {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 50) return "bg-yellow-500";
  return "bg-red-400";
}

function textColor(pct: number) {
  if (pct >= 80) return "text-green-500";
  if (pct >= 50) return "text-yellow-500";
  return "text-red-400";
}

export function ProfileCompletionBar({ pct, items, itemLabels, compact = false }: ProfileCompletionBarProps) {
  const labels = itemLabels ?? WORKER_LABELS;
  const missing = Object.entries(items)
    .filter(([, v]) => !v)
    .map(([k]) => labels[k] ?? k);

  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-0" style={{ minWidth: 40 }}>
          <div className={`h-full rounded-full transition-all ${barColor(pct)}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs font-semibold shrink-0 tabular-nums ${textColor(pct)}`}>{pct}%</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor(pct)}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-xs font-semibold tabular-nums shrink-0 ${textColor(pct)}`}>{pct}%</span>
        </div>
      </div>
      {missing.length > 0 && (
        <p className="text-xs text-muted-foreground/60 leading-snug">
          Missing: {missing.join(", ")}
        </p>
      )}
    </div>
  );
}
