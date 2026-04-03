import { useState, useEffect, useCallback } from "react";
import {
  Home, Briefcase, ShieldCheck, Settings as SettingsIcon, LogOut,
  Bell, HelpCircle, MapPin, ChevronRight,
  CheckCircle2, AlertTriangle, XCircle,
  User, Zap, Star, Navigation, Clock, Menu, X, Rocket,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { JobDetailModal } from "../matching/JobDetailModal";
import type { MatchedJob } from "~backend/matching/match_jobs";
import type { WorkerDocument } from "~backend/workers/documents";
import type { WorkerCompletionResponse } from "~backend/workers/completion";

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

function statusIcon(status: string) {
  if (status === "Verified") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "Expiring Soon") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-red-400" />;
}

function statusBadge(status: string) {
  if (status === "Verified") return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">VERIFIED</span>
  );
  if (status === "Expiring Soon") return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">EXPIRING</span>
  );
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">MISSING</span>
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

const SECTION_TAB: Record<string, string> = {
  fullName: "profile", phone: "profile", location: "profile",
  bio: "profile", experience: "profile", photo: "profile",
  skills: "profile", availability: "profile",
  documents: "profile", resume: "profile", references: "profile",
};

const SECTION_ICON: Record<string, React.ReactNode> = {
  fullName:     <User className="h-4 w-4 text-blue-500" />,
  phone:        <User className="h-4 w-4 text-blue-500" />,
  location:     <MapPin className="h-4 w-4 text-indigo-500" />,
  bio:          <User className="h-4 w-4 text-violet-500" />,
  experience:   <Briefcase className="h-4 w-4 text-indigo-500" />,
  photo:        <User className="h-4 w-4 text-pink-500" />,
  skills:       <Star className="h-4 w-4 text-yellow-500" />,
  availability: <Clock className="h-4 w-4 text-green-500" />,
  documents:    <ShieldCheck className="h-4 w-4 text-blue-600" />,
  resume:       <Briefcase className="h-4 w-4 text-orange-500" />,
  references:   <CheckCircle2 className="h-4 w-4 text-teal-500" />,
};

const SECTION_DESC: Record<string, string> = {
  fullName:     "Add your full legal name",
  phone:        "Add your phone number",
  location:     "Add your suburb so employers can find you",
  bio:          "Write a short bio about yourself",
  experience:   "Enter your years of experience",
  photo:        "Upload a profile photo",
  skills:       "Select the support skills you have",
  availability: "Set your available days and times",
  documents:    "Upload at least 3 compliance documents",
  resume:       "Upload your resume or CV",
  references:   "Add at least one reference",
};

function VerificationUrgencyBanner({ completion, onTabChange, onDismiss }: {
  completion: WorkerCompletionResponse;
  onTabChange: (tab: string) => void;
  onDismiss: () => void;
}) {
  const pct = completion.completionPercent;
  const missingDocs = completion.sections.find((s) => s.key === "documents" && !s.done);
  const incompleteCount = completion.sections.filter((s) => !s.done).length;

  if (pct >= 100) return null;

  const isEarly = pct < 40;
  const hasDocs = !missingDocs;

  const gradientClass = isEarly
    ? "from-blue-600 via-indigo-600 to-violet-600"
    : "from-amber-500 via-orange-500 to-red-500";

  const message = isEarly
    ? `Providers prioritise verified workers. Complete your profile to start getting hired.`
    : hasDocs
    ? `Almost there! ${incompleteCount} step${incompleteCount !== 1 ? "s" : ""} left before providers can fully see your profile.`
    : `Upload your compliance documents to appear in provider searches and get matched faster.`;

  const urgencyNote = isEarly
    ? "Free verification available for the first 200 workers"
    : "Verified profiles are chosen more often by providers";

  return (
    <div className={`relative rounded-2xl bg-gradient-to-r ${gradientClass} p-4 sm:p-5 text-white overflow-hidden`}>
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/30" />
        <div className="absolute right-16 bottom-0 h-32 w-32 rounded-full bg-white/10" />
      </div>
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 text-white/70" />
      </button>
      <div className="relative z-10 flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Rocket className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-bold text-sm">Get Verified — Get Hired Faster</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20">{pct}% complete</span>
          </div>
          <p className="text-sm text-white/85 mb-3 leading-relaxed">{message}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onTabChange("profile")}
              className="px-4 py-2 bg-white text-indigo-700 font-bold rounded-xl text-sm hover:bg-indigo-50 transition-colors shrink-0"
            >
              Complete Profile →
            </button>
            <p className="text-xs text-white/70">&#127381; {urgencyNote}</p>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/80 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NextStepsPanel({ completion, onTabChange }: { completion: WorkerCompletionResponse; onTabChange: (tab: string) => void }) {
  const pct = completion.completionPercent;
  const missing = completion.sections.filter((s) => !s.done);
  const done = completion.sections.filter((s) => s.done);

  if (pct === 100) {
    return (
      <div className="bg-white rounded-2xl border border-green-200 p-4 flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
        <div>
          <p className="font-semibold text-gray-900 text-sm">Profile 100% complete!</p>
          <p className="text-xs text-gray-400">You're ready to receive job matches.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900">Profile — {pct}% complete</p>
          <span className="text-xs text-gray-400">{done.length}/{completion.sections.length} done</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-blue-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">Complete these steps to get matched with more jobs:</p>
      <div className="space-y-2">
        {missing.slice(0, 4).map((s) => (
          <button
            key={s.key}
            onClick={() => onTabChange(SECTION_TAB[s.key] ?? "profile")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all text-left"
          >
            <div className="h-7 w-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
              {SECTION_ICON[s.key] ?? <ChevronRight className="h-4 w-4 text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800">{s.label}</p>
              <p className="text-xs text-gray-400 truncate">{SECTION_DESC[s.key]}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs font-semibold text-blue-600">+{s.weight}%</span>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
            </div>
          </button>
        ))}
        {missing.length > 4 && (
          <button
            onClick={() => onTabChange("profile")}
            className="w-full text-xs text-blue-600 font-medium hover:underline text-center py-1"
          >
            +{missing.length - 4} more — View full profile
          </button>
        )}
      </div>
    </div>
  );
}

export function WorkerHomeDashboard({ onTabChange, onLogout }: Props) {
  const { user } = useAuth();
  const api = useAuthedBackend();
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("home");
  const [allJobs, setAllJobs] = useState<MatchedJob[]>([]);
  const [documents, setDocuments] = useState<WorkerDocument[]>([]);
  const [completion, setCompletion] = useState<WorkerCompletionResponse | null>(null);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [hasGeoFilter, setHasGeoFilter] = useState(false);
  const [selectedJob, setSelectedJob] = useState<MatchedJob | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return sessionStorage.getItem("onboarding-banner-dismissed") === "1";
  });

  const displayName = workerName ?? user?.email?.split("@")[0] ?? "User";
  const firstName = displayName.split(" ")[0];

  const load = useCallback(async () => {
    if (!api) return;
    const [profileRes, docsRes, jobsRes, completionRes] = await Promise.allSettled([
      api.workers.getWorkerProfile(),
      api.workers.listWorkerDocuments(),
      api.matching.matchJobsForWorker(),
      api.workers.getWorkerCompletion(),
    ]);
    if (profileRes.status === "fulfilled") {
      if (profileRes.value.fullName) setWorkerName(profileRes.value.fullName);
    }
    if (docsRes.status === "fulfilled") setDocuments(docsRes.value.documents);
    if (jobsRes.status === "fulfilled") {
      setAllJobs(jobsRes.value.jobs);
      setHasGeoFilter(jobsRes.value.hasGeoFilter);
    }
    if (completionRes.status === "fulfilled") setCompletion(completionRes.value);
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const getDocStatus = (docType: string): string => {
    const doc = documents.find((d) => d.documentType === docType);
    return doc ? doc.verificationStatus : "Missing";
  };

  const handleSidebarTab = (t: SidebarTab) => {
    setSidebarTab(t);
    if (t === "jobs") onTabChange("offers");
    else if (t === "profile") onTabChange("profile");
  };

  const topJobs = allJobs.slice(0, 4);
  const jobCount = allJobs.length;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "jobs", label: "Job Offers", icon: Briefcase },
    { id: "profile", label: "Profile", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-200 flex-col py-6 px-4 shrink-0">
        <div className="mb-6">
          <p className="font-bold text-gray-900 text-sm">{displayName}</p>
          <p className="text-xs text-gray-500">NDIS Support Worker</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleSidebarTab(id as SidebarTab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                sidebarTab === id
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="rounded-2xl bg-indigo-600 p-4 text-white mb-4">
            <p className="text-xs font-semibold mb-2">Ready to work?</p>
            <button
              onClick={() => onTabChange("offers")}
              className="w-full px-3 py-1.5 bg-white text-indigo-700 font-semibold rounded-lg text-xs hover:bg-indigo-50 transition-colors"
            >
              View Job Offers
            </button>
          </div>
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
                    !action
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-800 rounded-lg"
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
          {completion && !bannerDismissed && completion.completionPercent < 100 && (
            <VerificationUrgencyBanner
              completion={completion}
              onTabChange={onTabChange}
              onDismiss={() => {
                setBannerDismissed(true);
                sessionStorage.setItem("onboarding-banner-dismissed", "1");
              }}
            />
          )}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 p-5 sm:p-7 text-white relative overflow-hidden flex items-center justify-between">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/20" />
              <div className="absolute right-20 bottom-0 h-40 w-40 rounded-full bg-white/10" />
            </div>
            <div className="relative z-10">
              <h1 className="text-2xl font-bold mb-1">Welcome back, {firstName}!</h1>
              <p className="text-blue-100 text-sm mb-5">
                {jobCount > 0
                  ? `You have ${jobCount} matched job offer${jobCount !== 1 ? "s" : ""} available in your area.`
                  : "Complete your profile and documents to get matched with job offers."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => onTabChange("offers")}
                  className="px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-xl text-sm hover:bg-blue-50 transition-colors"
                >
                  Review Offers
                </button>
                <button
                  onClick={() => onTabChange("profile")}
                  className="px-5 py-2.5 bg-white/20 backdrop-blur text-white font-semibold rounded-xl text-sm hover:bg-white/30 border border-white/30 transition-colors"
                >
                  Update Availability
                </button>
              </div>
            </div>
            <div className="relative z-10 hidden lg:flex items-center justify-center h-28 w-28 shrink-0">
              <div className="h-24 w-24 rounded-full bg-violet-500/30 flex items-center justify-center">
                <User className="h-14 w-14 text-white/60" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-900">Best Matched Jobs</p>
                <button
                  onClick={() => onTabChange("offers")}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  See All →
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
                {hasGeoFilter
                  ? <><Navigation className="h-3 w-3" />Sorted by skill match &amp; distance</>
                  : <><MapPin className="h-3 w-3" />Add your location in profile for distance sorting</>}
              </p>

              <div className="space-y-3">
                {topJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 italic">No matched jobs yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Complete your profile to get matches.</p>
                  </div>
                ) : (
                  topJobs.map((job) => (
                    <button
                      key={job.jobId}
                      onClick={() => setSelectedJob(job)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left"
                    >
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        job.isEmergency
                          ? "bg-gradient-to-br from-orange-400 to-red-500"
                          : "bg-gradient-to-br from-blue-400 to-indigo-500"
                      }`}>
                        {job.isEmergency
                          ? <Zap className="h-5 w-5 text-white" />
                          : <Briefcase className="h-5 w-5 text-white" />}
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
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />{job.distanceKm}km
                            </span>
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

            <div className="flex flex-col gap-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-semibold text-gray-900">Compliance Status</p>
                </div>
                <div className="space-y-2.5">
                  {COMPLIANCE_DOCS.map((docType) => {
                    const status = getDocStatus(docType);
                    return (
                      <div key={docType} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100">
                        {statusIcon(status)}
                        <p className="flex-1 text-sm text-gray-700 font-medium">{docType}</p>
                        {statusBadge(status)}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => onTabChange("profile")}
                  className="mt-4 w-full text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors py-1"
                >
                  Manage Documents →
                </button>
              </div>

              {completion && (
                <NextStepsPanel completion={completion} onTabChange={onTabChange} />
              )}
            </div>
          </div>
        </main>
      </div>

      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
