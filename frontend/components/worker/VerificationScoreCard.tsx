import { CheckCircle2, Circle, ChevronRight, ShieldCheck, User, Users, Clock, CreditCard, Lock } from "lucide-react";
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
  incomplete: {
    bar: "bg-red-500",
    badge: "bg-red-100 border-red-200 text-red-700",
    badgeText: "Profile Incomplete",
    ring: "ring-red-200",
    glow: "shadow-red-100",
    scoreText: "text-red-600",
  },
  in_progress: {
    bar: "bg-yellow-400",
    badge: "bg-yellow-100 border-yellow-200 text-yellow-700",
    badgeText: "Profile In Progress",
    ring: "ring-yellow-200",
    glow: "shadow-yellow-100",
    scoreText: "text-yellow-600",
  },
  submission_ready: {
    bar: "bg-green-500",
    badge: "bg-green-100 border-green-200 text-green-700",
    badgeText: "Ready to Submit",
    ring: "ring-green-200",
    glow: "shadow-green-100",
    scoreText: "text-green-600",
  },
  compliance_pending: {
    bar: "bg-blue-500",
    badge: "bg-blue-100 border-blue-200 text-blue-700",
    badgeText: "Compliance Under Review",
    ring: "ring-blue-200",
    glow: "shadow-blue-100",
    scoreText: "text-blue-600",
  },
};

const OUTCOME_MESSAGES: Record<Level, string[]> = {
  incomplete: [
    "Complete your profile to become visible to employers",
    "Add your details, upload documents and set your availability",
  ],
  in_progress: [
    "Keep going — complete your remaining profile sections",
    "Upload your compliance documents to begin the review process",
  ],
  submission_ready: [
    "Your profile is looking strong — upload your compliance documents",
    "Once submitted, our team will review your documents and references",
  ],
  compliance_pending: [
    "Your profile is complete and under compliance review",
    "Our team will verify your documents and references — we'll notify you when done",
  ],
};

function CircularScore({ score, level }: { score: number; level: Level }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const gap = circumference - dash;

  const trackColor = level === "incomplete" ? "#fee2e2"
    : level === "in_progress" ? "#fef9c3"
    : level === "submission_ready" ? "#dcfce7"
    : "#dbeafe";

  const fillColor = level === "incomplete" ? "#ef4444"
    : level === "in_progress" ? "#eab308"
    : level === "submission_ready" ? "#22c55e"
    : "#3b82f6";

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

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-4 w-4 text-indigo-500" />
          <p className="text-sm font-bold text-gray-900">Profile Completion</p>
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

      {/* Compliance review notice */}
      <div className="mx-5 mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50">
        <Lock className="h-4 w-4 text-amber-500 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-800">Compliance review required before starting work</p>
          <p className="text-xs mt-0.5 text-amber-700">
            Complete your profile and upload your documents. Our compliance team will review and notify you when cleared.
          </p>
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
          <p className="text-xs text-center text-gray-400 mt-2">
            {data.level === "incomplete"
              ? "Complete your profile to increase your chances of getting shifts"
              : data.level === "in_progress"
              ? "Upload your documents to begin the compliance review process"
              : "Strong profiles are prioritised — you're almost ready for review"}
          </p>
        </div>
      )}

      {data.level === "compliance_pending" && incomplete.length === 0 && (
        <div className="px-5 pb-5">
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 border border-blue-200">
            <ShieldCheck className="h-5 w-5 text-blue-500" />
            <p className="text-sm font-bold text-blue-700">Profile Complete — Compliance Review In Progress</p>
          </div>
        </div>
      )}
    </div>
  );
}
