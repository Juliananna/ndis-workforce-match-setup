import {
  CheckCircle2, Circle, ChevronRight, ShieldCheck,
  User, MapPin, Briefcase, Star, Clock, FileText, Users, Rocket,
} from "lucide-react";
import type { WorkerCompletionResponse } from "~backend/workers/completion";

interface Props {
  completion: WorkerCompletionResponse;
  onGoToProfile: () => void;
}

function completionLabel(pct: number): { text: string; emoji: string } {
  if (pct >= 100) return { text: "Fully verified", emoji: "✅" };
  if (pct >= 80) return { text: "Almost verified", emoji: "🔥" };
  if (pct >= 50) return { text: "Halfway there", emoji: "💪" };
  return { text: "Getting started", emoji: "🚀" };
}

function barColor(pct: number): string {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-yellow-400";
  return "bg-blue-500";
}

function nudgeMessage(pct: number): { heading: string; body: string; variant: "blue" | "amber" | "green" } {
  if (pct >= 80) {
    return {
      heading: "Almost there!",
      body: "Just one more step to unlock priority matching with providers.",
      variant: "green",
    };
  }
  if (pct >= 50) {
    return {
      heading: "You're close!",
      body: "Verified workers get picked first — finish your profile to move to the top.",
      variant: "amber",
    };
  }
  return {
    heading: "Start getting matched",
    body: "Complete your profile to start getting matched with providers in your area.",
    variant: "blue",
  };
}

const SECTION_ICON: Record<string, React.ReactNode> = {
  fullName:        <User className="h-4 w-4 text-blue-500" />,
  phone:           <User className="h-4 w-4 text-blue-500" />,
  location:        <MapPin className="h-4 w-4 text-indigo-500" />,
  bio:             <User className="h-4 w-4 text-violet-500" />,
  experienceYears: <Briefcase className="h-4 w-4 text-indigo-500" />,
  photo:           <User className="h-4 w-4 text-pink-500" />,
  skills:          <Star className="h-4 w-4 text-yellow-500" />,
  availability:    <Clock className="h-4 w-4 text-green-500" />,
  documents:       <ShieldCheck className="h-4 w-4 text-blue-600" />,
  resume:          <FileText className="h-4 w-4 text-orange-500" />,
  references:      <Users className="h-4 w-4 text-teal-500" />,
};

const SECTION_HINT: Record<string, string> = {
  fullName:        "Your full legal name",
  phone:           "Contact number",
  location:        "Suburb so providers can find you",
  bio:             "A short intro about yourself",
  experienceYears: "Years working in support",
  photo:           "A clear profile photo",
  skills:          "Support skills you have",
  availability:    "Days and times you're free",
  documents:       "Upload 3+ compliance documents",
  resume:          "Your resume or CV",
  references:      "At least one professional reference",
};

const TASK_GROUPS = [
  {
    label: "Profile details",
    keys: ["fullName", "phone", "location", "bio", "experienceYears", "photo"],
  },
  {
    label: "Skills & availability",
    keys: ["skills", "availability"],
  },
  {
    label: "Documents & credentials",
    keys: ["documents", "resume", "references"],
  },
];

const NUDGE_STYLES = {
  blue: {
    wrapper: "bg-blue-50 border-blue-200",
    heading: "text-blue-800",
    body: "text-blue-700",
    icon: "text-blue-500",
  },
  amber: {
    wrapper: "bg-amber-50 border-amber-200",
    heading: "text-amber-800",
    body: "text-amber-700",
    icon: "text-amber-500",
  },
  green: {
    wrapper: "bg-emerald-50 border-emerald-200",
    heading: "text-emerald-800",
    body: "text-emerald-700",
    icon: "text-emerald-500",
  },
};

const BENEFITS = [
  "Verified workers are prioritised by providers in search results",
  "Incomplete profiles may not appear in top job matches",
  "Workers with documents verified get hired up to 3× faster",
];

export function ActivationPanel({ completion, onGoToProfile }: Props) {
  const pct = completion.completionPercent;
  const sectionMap = Object.fromEntries(completion.sections.map((s) => [s.key, s]));
  const label = completionLabel(pct);
  const nudge = nudgeMessage(pct);
  const nudgeStyle = NUDGE_STYLES[nudge.variant];
  const doneCount = completion.sections.filter((s) => s.done).length;
  const totalCount = completion.sections.length;

  if (pct >= 100) {
    return (
      <div className="bg-white rounded-2xl border border-green-200 p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-7 w-7 text-green-500" />
        </div>
        <div>
          <p className="font-bold text-gray-900">Fully Verified ✅</p>
          <p className="text-sm text-gray-500 mt-0.5">You're fully visible to providers and eligible for priority matching.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-indigo-500" />
            <p className="text-sm font-bold text-gray-900">Profile Activation</p>
          </div>
          <span className="text-xs text-gray-400">{doneCount}/{totalCount} complete</span>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor(pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums text-gray-700 shrink-0">{pct}%</span>
        </div>

        <p className="text-xs text-gray-500 mt-1.5 font-medium">
          {label.emoji} {label.text}
        </p>
      </div>

      <div className={`mx-5 mt-4 px-4 py-3 rounded-xl border ${nudgeStyle.wrapper} flex items-start gap-3`}>
        <Rocket className={`h-4 w-4 mt-0.5 shrink-0 ${nudgeStyle.icon}`} />
        <div>
          <p className={`text-xs font-bold ${nudgeStyle.heading}`}>{nudge.heading}</p>
          <p className={`text-xs mt-0.5 leading-relaxed ${nudgeStyle.body}`}>{nudge.body}</p>
        </div>
      </div>

      <div className="px-5 pt-4 pb-2 space-y-4">
        {TASK_GROUPS.map((group) => {
          const groupSections = group.keys
            .map((k) => sectionMap[k])
            .filter(Boolean);
          const groupDone = groupSections.filter((s) => s.done).length;
          const allDone = groupDone === groupSections.length;

          return (
            <div key={group.label}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group.label}</p>
                {allDone ? (
                  <span className="text-xs font-bold text-green-600">Done ✓</span>
                ) : (
                  <span className="text-xs text-gray-400">{groupDone}/{groupSections.length}</span>
                )}
              </div>
              <div className="space-y-1.5">
                {groupSections.map((section) => (
                  <button
                    key={section.key}
                    onClick={onGoToProfile}
                    disabled={section.done}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                      section.done
                        ? "border-green-100 bg-green-50/50 cursor-default"
                        : "border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 cursor-pointer"
                    }`}
                  >
                    <div className="shrink-0">
                      {section.done ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                    <div className="h-7 w-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                      {SECTION_ICON[section.key] ?? <ChevronRight className="h-4 w-4 text-gray-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${section.done ? "text-gray-400 line-through" : "text-gray-800"}`}>
                        {section.label}
                      </p>
                      {!section.done && (
                        <p className="text-xs text-gray-400 truncate">{SECTION_HINT[section.key]}</p>
                      )}
                    </div>
                    {!section.done && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs font-bold text-indigo-600">+{section.weight}%</span>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 pb-4 pt-3 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Why it matters</p>
        <ul className="space-y-1.5">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
              <span className="text-xs text-gray-500 leading-snug">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={onGoToProfile}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors"
        >
          Complete Profile →
        </button>
      </div>
    </div>
  );
}
