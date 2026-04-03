import { useState, useEffect, useCallback } from "react";
import {
  Home, Briefcase, ShieldCheck, Settings as SettingsIcon, LogOut,
  Bell, HelpCircle, MapPin, CheckCircle2, AlertTriangle, XCircle,
  User, Zap, Star, Navigation, Clock, Menu, X,
  CreditCard, Users, FileText, ChevronRight, TrendingUp,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { JobDetailModal } from "../matching/JobDetailModal";
import type { MatchedJob } from "~backend/matching/match_jobs";
import type { WorkerDocument } from "~backend/workers/documents";
import type { VerificationScoreResponse } from "~backend/workers/verification_score";

type SidebarTab = "home" | "jobs" | "profile";

interface Props {
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

const COMPLIANCE_DOCS = [
  "NDIS Worker Screening Check",
  "Police Clearance",
  "First Aid Certificate",
  "Infection Control Certificate",
] as const;

const PILLAR_ICON: Record<string, React.ReactNode> = {
  profile:        <User className="h-4 w-4" />,
  id:             <CreditCard className="h-4 w-4" />,
  certifications: <ShieldCheck className="h-4 w-4" />,
  references:     <Users className="h-4 w-4" />,
  availability:   <Clock className="h-4 w-4" />,
};

type Level = VerificationScoreResponse["level"];

const LEVEL_CONFIG: Record<Level, {
  gradient: string;
  ring: string;
  fill: string;
  track: string;
  badge: string;
  badgeText: string;
  label: string;
  scoreColor: string;
}> = {
  low: {
    gradient: "from-slate-800 via-slate-700 to-slate-800",
    ring: "#ef4444",
    fill: "#ef4444",
    track: "rgba(239,68,68,0.2)",
    badge: "bg-red-500/20 text-red-200 border-red-400/30",
    badgeText: "Low Visibility",
    label: "Complete your profile to start getting matched with providers.",
    scoreColor: "text-red-300",
  },
  medium: {
    gradient: "from-blue-900 via-indigo-800 to-blue-900",
    ring: "#eab308",
    fill: "#eab308",
    track: "rgba(234,179,8,0.2)",
    badge: "bg-yellow-500/20 text-yellow-200 border-yellow-400/30",
    badgeText: "Medium Visibility",
    label: "You're making progress — boost your score to appear in more searches.",
    scoreColor: "text-yellow-300",
  },
  high: {
    gradient: "from-indigo-800 via-blue-700 to-violet-800",
    ring: "#22c55e",
    fill: "#22c55e",
    track: "rgba(34,197,94,0.2)",
    badge: "bg-green-500/20 text-green-200 border-green-400/30",
    badgeText: "High Visibility",
    label: "Providers can see your profile. One more step to reach priority status.",
    scoreColor: "text-green-300",
  },
  verified: {
    gradient: "from-emerald-800 via-teal-700 to-emerald-800",
    ring: "#10b981",
    fill: "#10b981",
    track: "rgba(16,185,129,0.2)",
    badge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    badgeText: "Fully Verified ✅",
    label: "You have maximum visibility and priority matching with providers.",
    scoreColor: "text-emerald-300",
  },
};

function HeroScoreRing({ score, level }: { score: number; level: Level }) {
  const cfg = LEVEL_CONFIG[level];
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke={cfg.track} strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke={cfg.ring}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          style={{ transition: "stroke-dasharray 1.2s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black tabular-nums leading-none ${cfg.scoreColor}`}>{score}%</span>
        <span className="text-xs font-semibold text-white/50 mt-0.5">Score</span>
      </div>
    </div>
  );
}

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  const s = String(v ?? "");
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function docStatus(documents: WorkerDocument[], docType: string): string {
  const doc = documents.find((d) => d.documentType === docType);
  return doc ? doc.verificationStatus : "Missing";
}

function statusIcon(status: string) {
  if (status === "Verified") return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  if (status === "Expiring Soon") return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
  return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
}

function statusPill(status: string) {
  if (status === "Verified") return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Verified</span>;
  if (status === "Expiring Soon") return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Expiring</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Missing</span>;
}

export function WorkerHomeDashboard({ onTabChange, onLogout }: Props) {
  const { user } = useAuth();
  const api = useAuthedBackend();
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("home");
  const [allJobs, setAllJobs] = useState<MatchedJob[]>([]);
  const [documents, setDocuments] = useState<WorkerDocument[]>([]);
  const [verificationScore, setVerificationScore] = useState<VerificationScoreResponse | null>(null);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [hasGeoFilter, setHasGeoFilter] = useState(false);
  const [selectedJob, setSelectedJob] = useState<MatchedJob | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = workerName ?? user?.email?.split("@")[0] ?? "User";
  const firstName = displayName.split(" ")[0];

  const load = useCallback(async () => {
    if (!api) return;
    const [profileRes, docsRes, jobsRes, scoreRes] = await Promise.allSettled([
      api.workers.getWorkerProfile(),
      api.workers.listWorkerDocuments(),
      api.matching.matchJobsForWorker(),
      api.workers.getVerificationScore(),
    ]);
    if (profileRes.status === "fulfilled" && profileRes.value.fullName) {
      setWorkerName(profileRes.value.fullName);
    }
    if (docsRes.status === "fulfilled") setDocuments(docsRes.value.documents);
    if (jobsRes.status === "fulfilled") {
      setAllJobs(jobsRes.value.jobs);
      setHasGeoFilter(jobsRes.value.hasGeoFilter);
    }
    if (scoreRes.status === "fulfilled") setVerificationScore(scoreRes.value);
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleSidebarTab = (t: SidebarTab) => {
    setSidebarTab(t);
    if (t === "jobs") onTabChange("offers");
    else if (t === "profile") onTabChange("profile");
  };

  const topJobs = allJobs.slice(0, 4);
  const jobCount = allJobs.length;

  const level: Level = verificationScore?.level ?? "low";
  const cfg = LEVEL_CONFIG[level];
  const score = verificationScore?.score ?? 0;
  const incompletePillars = verificationScore?.pillars.filter((p) => !p.earned) ?? [];
  const earnablePoints = incompletePillars.reduce((s, p) => s + p.points, 0);

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "jobs", label: "Job Offers", icon: Briefcase },
    { id: "profile", label: "Profile", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-200 flex-col py-6 px-4 shrink-0">
        <div className="mb-6">
          <p className="font-bold text-gray-900 text-sm truncate">{displayName}</p>
          <p className="text-xs text-gray-500">NDIS Support Worker</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleSidebarTab(id as SidebarTab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                sidebarTab === id ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          {verificationScore && verificationScore.level !== "verified" && (
            <button
              onClick={() => onTabChange("profile")}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors text-left"
            >
              <TrendingUp className="h-4 w-4 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-indigo-700">Boost Score</p>
                <p className="text-xs text-indigo-500">+{earnablePoints} pts available</p>
              </div>
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 w-64 bg-white flex flex-col py-6 px-4 h-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-bold text-gray-900 text-sm">{displayName}</p>
                <p className="text-xs text-gray-500">NDIS Support Worker</p>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { handleSidebarTab(id as SidebarTab); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                    sidebarTab === id ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />{label}
                </button>
              ))}
            </nav>
            <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-4">
              <LogOut className="h-3.5 w-3.5" />Sign out
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-base font-bold text-blue-600">Kizazi Hire</span>
            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: "Dashboard", action: null },
                { label: "Job Offers", action: "offers" },
                { label: "Profile", action: "profile" },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={() => action && onTabChange(action)}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    !action ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-800 rounded-lg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <button className="hidden sm:block p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <HelpCircle className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
              {firstName[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

          {/* ── Hero: verification score + welcome ── */}
          <div className={`relative rounded-2xl bg-gradient-to-r ${cfg.gradient} p-5 sm:p-7 text-white overflow-hidden`}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
              <div className="absolute right-8 bottom-0 h-32 w-32 rounded-full bg-white/5" />
            </div>

            <div className="relative z-10 flex items-center gap-6 sm:gap-8">
              {/* Score ring */}
              <div className="shrink-0">
                <HeroScoreRing score={score} level={level} />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold">Hi {firstName}!</h1>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                    {cfg.badgeText}
                  </span>
                </div>
                <p className="text-white/75 text-sm mb-4 leading-relaxed max-w-sm">{cfg.label}</p>

                <div className="flex gap-2.5 flex-wrap">
                  {level !== "verified" && (
                    <button
                      onClick={() => onTabChange("profile")}
                      className="px-4 py-2 bg-white text-gray-900 font-bold rounded-xl text-sm hover:bg-white/90 transition-colors"
                    >
                      Boost Score →
                    </button>
                  )}
                  {jobCount > 0 && (
                    <button
                      onClick={() => onTabChange("offers")}
                      className="px-4 py-2 bg-white/15 border border-white/25 text-white font-semibold rounded-xl text-sm hover:bg-white/25 transition-colors backdrop-blur"
                    >
                      {jobCount} Job{jobCount !== 1 ? "s" : ""} Matched
                    </button>
                  )}
                  {jobCount === 0 && level === "verified" && (
                    <button
                      onClick={() => onTabChange("offers")}
                      className="px-4 py-2 bg-white text-gray-900 font-bold rounded-xl text-sm hover:bg-white/90 transition-colors"
                    >
                      View Offers →
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Pillar progress dots — bottom strip */}
            {verificationScore && (
              <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex items-center gap-3 flex-wrap">
                {verificationScore.pillars.map((p) => (
                  <div key={p.key} className="flex items-center gap-1.5">
                    {p.earned
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-white/80" />
                      : <div className="h-3.5 w-3.5 rounded-full border border-white/30" />}
                    <span className={`text-xs font-medium ${p.earned ? "text-white/80" : "text-white/40"}`}>
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Jobs — wider col */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-900">Best Matched Jobs</p>
                <button onClick={() => onTabChange("offers")} className="text-xs font-semibold text-blue-600 hover:underline">
                  See All →
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
                {hasGeoFilter
                  ? <><Navigation className="h-3 w-3" />Sorted by skill match &amp; distance</>
                  : <><MapPin className="h-3 w-3" />Add your location for distance sorting</>}
              </p>

              <div className="space-y-2.5">
                {topJobs.length === 0 ? (
                  <div className="text-center py-10">
                    <Briefcase className="h-9 w-9 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 font-medium">No matched jobs yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {level === "low" || level === "medium"
                        ? "Boost your verification score to start getting matched"
                        : "Providers will match you when shifts become available"}
                    </p>
                    {(level === "low" || level === "medium") && (
                      <button
                        onClick={() => onTabChange("profile")}
                        className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                      >
                        Complete Profile →
                      </button>
                    )}
                  </div>
                ) : (
                  topJobs.map((job) => (
                    <button
                      key={job.jobId}
                      onClick={() => setSelectedJob(job)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left"
                    >
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        job.isEmergency ? "bg-gradient-to-br from-orange-400 to-red-500" : "bg-gradient-to-br from-blue-400 to-indigo-500"
                      }`}>
                        {job.isEmergency ? <Zap className="h-5 w-5 text-white" /> : <Briefcase className="h-5 w-5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-sm text-gray-900 truncate">{job.location}</p>
                          {job.isEmergency && (
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">URGENT</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />{toDateStr(job.shiftDate)} · {job.shiftDurationHours}h
                          </span>
                          {job.distanceKm != null && (
                            <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{job.distanceKm}km</span>
                          )}
                          {job.matchScore > 0 && (
                            <span className="flex items-center gap-0.5 text-yellow-500">
                              <Star className="h-3 w-3 fill-yellow-400" />{job.matchScore} match
                            </span>
                          )}
                        </div>
                        {job.supportTypeTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {job.supportTypeTags.slice(0, 3).map((t) => (
                              <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{t}</span>
                            ))}
                            {job.supportTypeTags.length > 3 && (
                              <span className="text-xs text-gray-400">+{job.supportTypeTags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-blue-600">${job.weekdayRate.toFixed(2)}<span className="text-xs font-normal text-gray-400">/hr</span></p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {topJobs.length > 0 && (
                <button
                  onClick={() => onTabChange("offers")}
                  className="mt-4 w-full py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  View All {jobCount} Offers
                </button>
              )}
            </div>

            {/* Right column — verification steps + compliance */}
            <div className="lg:col-span-2 flex flex-col gap-5">

              {/* Verification steps */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-500" />
                    <p className="text-sm font-semibold text-gray-900">Verification Steps</p>
                  </div>
                  {verificationScore && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      level === "verified" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : level === "high" ? "bg-green-100 text-green-700 border-green-200"
                      : level === "medium" ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                      : "bg-red-100 text-red-700 border-red-200"
                    }`}>
                      {score}%
                    </span>
                  )}
                </div>

                {verificationScore ? (
                  <div className="divide-y divide-gray-50">
                    {verificationScore.pillars.map((pillar) => (
                      <button
                        key={pillar.key}
                        onClick={() => onTabChange("profile")}
                        disabled={pillar.earned}
                        className={`w-full flex items-center gap-3 px-5 py-3.5 transition-all text-left ${
                          pillar.earned
                            ? "cursor-default opacity-70"
                            : "hover:bg-indigo-50/50 cursor-pointer"
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          pillar.earned ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                        }`}>
                          {PILLAR_ICON[pillar.key]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${pillar.earned ? "text-gray-400 line-through" : "text-gray-800"}`}>
                            {pillar.label}
                          </p>
                          {!pillar.earned && (
                            <p className="text-xs text-gray-400 truncate">{pillar.hint}</p>
                          )}
                        </div>
                        {pillar.earned
                          ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                          : (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs font-bold text-indigo-500">+{pillar.points}</span>
                              <ChevronRight className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">Loading…</div>
                )}

                {level !== "verified" && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <button
                      onClick={() => onTabChange("profile")}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors"
                    >
                      Earn +{earnablePoints} Points →
                    </button>
                  </div>
                )}

                {level === "verified" && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <p className="text-sm font-bold text-emerald-700">Priority Matching Active</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Compliance docs */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-semibold text-gray-900">Compliance Docs</p>
                </div>
                <div className="space-y-2">
                  {COMPLIANCE_DOCS.map((docType) => {
                    const status = docStatus(documents, docType);
                    return (
                      <div key={docType} className="flex items-center gap-2.5 py-1">
                        {statusIcon(status)}
                        <p className="flex-1 text-xs text-gray-700 font-medium leading-snug">{docType}</p>
                        {statusPill(status)}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => onTabChange("profile")}
                  className="mt-3 w-full text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors py-1 text-left"
                >
                  Manage Documents →
                </button>
              </div>

            </div>
          </div>
        </main>
      </div>

      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
