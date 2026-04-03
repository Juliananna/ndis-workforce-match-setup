import { CheckCircle2, Circle, ChevronRight, ShieldCheck, User, FileText, Users, Clock, CreditCard } from "lucide-react";
import type { VerificationScoreResponse } from "~backend/workers/verification_score";

interface Props {
  score: VerificationScoreResponse;
  onGoToProfile: () => void;
}

const PILLAR_ICON: Record<string, React.ReactNode> = {
  profile:       <User className="h-4 w-4" />,
  id:            <CreditCard className="h-4 w-4" />,
  certifications:<ShieldCheck className="h-4 w-4" />,
  references:    <Users className="h-4 w-4" />,
  availability:  <Clock className="h-4 w-4" />,
};

type Level = VerificationScoreResponse["level"];

const LEVEL_STYLES: Record<Level, {
  bar: string;
  badge: string;
  badgeText: string;
  ring: string;
  glow: string;
  scoreText: string;
}> = {
  low: {
    bar: "bg-red-500",
    badge: "bg-red-100 border-red-200 text-red-700",
    badgeText: "Low Visibility 🔴",
    ring: "ring-red-200",
    glow: "shadow-red-100",
    scoreText: "text-red-600",
  },
  medium: {
    bar: "bg-yellow-400",
    badge: "bg-yellow-100 border-yellow-200 text-yellow-700",
    badgeText: "Medium Visibility 🟡",
    ring: "ring-yellow-200",
    glow: "shadow-yellow-100",
    scoreText: "text-yellow-600",
  },
  high: {
    bar: "bg-green-500",
    badge: "bg-green-100 border-green-200 text-green-700",
    badgeText: "High Visibility 🟢",
    ring: "ring-green-200",
    glow: "shadow-green-100",
    scoreText: "text-green-600",
  },
  verified: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-100 border-emerald-200 text-emerald-700",
    badgeText: "Fully Verified ✅",
    ring: "ring-emerald-300",
    glow: "shadow-emerald-100",
    scoreText: "text-emerald-600",
  },
};

const OUTCOME_MESSAGES: Record<Level, string[]> = {
  low: [
    "Your profile has low visibility to providers",
    "Complete more steps to start appearing in searches",
  ],
  medium: [
    "Workers with 80%+ score get significantly more matches",
    "Upload your ID and certifications to boost your score",
  ],
  high: [
    "Workers with 80%+ get more matches",
    "Reach 100% for priority placement in searches",
  ],
  verified: [
    "Fully verified profiles are prioritised by providers",
    "You have maximum visibility and priority matching",
  ],
};

function CircularScore({ score, level }: { score: number; level: Level }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const gap = circumference - dash;

  const trackColor = level === "low" ? "#fee2e2"
    : level === "medium" ? "#fef9c3"
    : level === "high" ? "#dcfce7"
    : "#d1fae5";

  const fillColor = level === "low" ? "#ef4444"
    : level === "medium" ? "#eab308"
    : level === "high" ? "#22c55e"
    : "#10b981";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle
          cx="64" cy="64" r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth="10"
        />
        <circle
          cx="64" cy="64" r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={circumference / 4}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black tabular-nums ${LEVEL_STYLES[level].scoreText}`}>
          {score}%
        </span>
        <span className="text-xs font-semibold text-gray-400 mt-0.5">Score</span>
      </div>
    </div>
  );
}

export function VerificationScoreCard({ score: data, onGoToProfile }: Props) {
  const styles = LEVEL_STYLES[data.level];
  const messages = OUTCOME_MESSAGES[data.level];
  const incomplete = data.pillars.filter((p) => !p.earned);
  const complete = data.pillars.filter((p) => p.earned);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-4 w-4 text-indigo-500" />
          <p className="text-sm font-bold text-gray-900">Verification Score</p>
          {data.level === "verified" && (
            <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              Verified Worker ✅
            </span>
          )}
        </div>

        <div className="flex items-center gap-5">
          <CircularScore score={data.score} level={data.level} />

          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${styles.badge}`}>
                {styles.badgeText}
              </span>
            </div>
            <div className="space-y-1.5">
              {messages.map((m) => (
                <p key={m} className="text-xs text-gray-500 leading-snug flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0">›</span>
                  {m}
                </p>
              ))}
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${styles.bar}`}
                style={{ width: `${data.score}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Score Breakdown</p>

        {data.pillars.map((pillar) => (
          <div
            key={pillar.key}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
              pillar.earned
                ? "border-green-100 bg-green-50/50"
                : "border-gray-100 bg-gray-50/50"
            }`}
          >
            <div className={`shrink-0 ${pillar.earned ? "text-green-500" : "text-gray-300"}`}>
              {pillar.earned
                ? <CheckCircle2 className="h-5 w-5" />
                : <Circle className="h-5 w-5" />}
            </div>
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
              pillar.earned ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
            }`}>
              {PILLAR_ICON[pillar.key]}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${pillar.earned ? "text-gray-400 line-through" : "text-gray-800"}`}>
                {pillar.label}
              </p>
              {!pillar.earned && (
                <p className="text-xs text-gray-400 truncate">{pillar.hint}</p>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-1">
              <span className={`text-xs font-bold tabular-nums ${
                pillar.earned ? "text-green-500" : "text-indigo-500"
              }`}>
                {pillar.earned ? "+" : ""}{pillar.points}pts
              </span>
              {!pillar.earned && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
            </div>
          </div>
        ))}
      </div>

      {incomplete.length > 0 && (
        <div className="px-5 pb-5">
          <button
            onClick={onGoToProfile}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors"
          >
            {`Earn +${incomplete.reduce((s, p) => s + p.points, 0)} Points →`}
          </button>
          {data.level !== "verified" && (
            <p className="text-xs text-center text-gray-400 mt-2">
              {data.level === "low" || data.level === "medium"
                ? "Workers with 80%+ get more matches"
                : "Fully verified profiles are prioritised"}
            </p>
          )}
        </div>
      )}

      {data.level === "verified" && (
        <div className="px-5 pb-5">
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <p className="text-sm font-bold text-emerald-700">Verified Worker — Priority Matching Active</p>
          </div>
        </div>
      )}
    </div>
  );
}
