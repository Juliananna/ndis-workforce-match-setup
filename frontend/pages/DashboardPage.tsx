import { useState, Suspense, lazy, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle, LogOut, Loader2,
  Users, Bell, Plus,
  Briefcase, BadgeCheck, Sparkles,
  Settings, MessageSquare,
  Zap, Menu, X, Compass,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { VerifyEmailModal } from "../components/VerifyEmailModal";
import { WorkerHomeDashboard } from "../components/worker/WorkerHomeDashboard";
import { useAuthedBackend } from "../hooks/useAuthedBackend";
import type { JobRequest } from "~backend/jobs/get";
import type { EmployerProfile } from "~backend/employers/profile_get";

const WorkerProfilePage = lazy(() => import("./WorkerProfilePage"));
const EmployerDashboardPage = lazy(() => import("./EmployerDashboardPage"));
const EmployerOffersPage = lazy(() => import("./EmployerOffersPage"));
const WorkerOffersPage = lazy(() => import("./WorkerOffersPage"));
const AdminDashboardPage = lazy(() => import("./AdminDashboardPage"));
const EmployerUpgradePage = lazy(() => import("./EmployerUpgradePage"));
const SalesPortalInner = lazy(() =>
  import("../components/sales/SalesPortalInner")
);
const BrowseWorkersPage = lazy(() =>
  import("../components/employer/BrowseWorkersPage").then((m) => ({ default: m.BrowseWorkersPage }))
);

type Tab = "home" | "profile" | "employer" | "offers" | "admin" | "browse" | "upgrade" | "sales";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, login } = useAuth();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("home");

  const [searchParams, setSearchParams] = useSearchParams();
  const api = useAuthedBackend();
  const isWorker = user?.role === "WORKER";
  const isEmployer = user?.role === "EMPLOYER";
  const isAdmin = user?.isAdmin === true;
  const isSalesAgent = user?.isSalesAgent === true || isAdmin;

  useEffect(() => {
    const tabParam = searchParams.get("tab") as Tab | null;
    if (tabParam) {
      setTab(tabParam);
      setSearchParams({}, { replace: true });
    }
  }, []);

  const handleLogout = () => {
    const isDemo = user?.email?.includes("@matchworkforce.demo");
    logout();
    navigate(isDemo ? "/demo" : "/login");
  };

  const handleVerified = async () => {
    const token = localStorage.getItem("ndis_token");
    if (token) await login(token);
  };

  const displayName = user?.email?.split("@")[0] ?? "User";
  const firstName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  if (isAdmin) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      }>
        <AdminDashboardPage />
      </Suspense>
    );
  }

  if (isWorker && !isAdmin) {
    return (
      <>
        <WorkerHomeDashboard
          onTabChange={(t) => setTab(t as Tab)}
          onLogout={handleLogout}
        />
        {tab !== "home" && (
          <div className="fixed inset-0 z-50 bg-white overflow-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
              <button
                onClick={() => setTab("home")}
                className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
              >
                ← Back to Dashboard
              </button>
              <PageContent
                tab={tab}
                isWorker={isWorker}
                isEmployer={isEmployer}
                isAdmin={isAdmin}
                isSalesAgent={isSalesAgent}
              />
            </div>
          </div>
        )}
        <VerifyEmailModal open={verifyOpen} onOpenChange={setVerifyOpen} onVerified={handleVerified} />
      </>
    );
  }

  if (isEmployer) {
    return (
      <EmployerLayout
        tab={tab}
        setTab={setTab}
        displayName={firstName}
        onLogout={handleLogout}
        api={api}
        isAdmin={isAdmin}
        isSalesAgent={isSalesAgent}
        verifyOpen={verifyOpen}
        setVerifyOpen={setVerifyOpen}
        onVerified={handleVerified}
        emailVerified={user?.isVerified ?? false}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold text-blue-600">NDIS Match</span>
            <nav className="hidden md:flex items-center gap-1">
              {isAdmin && (
                <NavItem label="Admin" active={tab === "admin"} onClick={() => setTab("admin")} />
              )}
              {isSalesAgent && (
                <NavItem label="Sales" active={tab === "sales"} onClick={() => setTab("sales")} />
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold ml-1">
              {firstName[0]?.toUpperCase()}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <PageContent
          tab={tab}
          isWorker={isWorker}
          isEmployer={isEmployer}
          isAdmin={isAdmin}
          isSalesAgent={isSalesAgent}
        />
      </main>
      <VerifyEmailModal open={verifyOpen} onOpenChange={setVerifyOpen} onVerified={handleVerified} />
    </div>
  );
}

const EMPLOYER_NAV: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "home", label: "Dashboard", icon: BadgeCheck },
  { id: "browse", label: "Browse Workers", icon: Compass },
  { id: "offers", label: "Messages", icon: MessageSquare },
  { id: "employer", label: "Jobs & Profile", icon: Briefcase },
  { id: "upgrade", label: "Subscription", icon: Sparkles },
];

function EmployerLayout({
  tab, setTab, displayName, onLogout, api, isAdmin, isSalesAgent,
  verifyOpen, setVerifyOpen, onVerified, emailVerified
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  displayName: string;
  onLogout: () => void;
  api: ReturnType<typeof useAuthedBackend>;
  isAdmin: boolean;
  isSalesAgent: boolean;
  verifyOpen: boolean;
  setVerifyOpen: (v: boolean) => void;
  onVerified: () => void;
  emailVerified: boolean;
}) {
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [jobsLoaded, setJobsLoaded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!api || jobsLoaded) return;
    setJobsLoaded(true);
    Promise.allSettled([
      api.jobs.listJobRequests(),
      api.employers.getEmployerProfile(),
    ]).then(([jobsRes, profileRes]) => {
      if (jobsRes.status === "fulfilled") setJobs(jobsRes.value.jobs);
      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
    });
  }, [api, jobsLoaded]);

  const activeJobs = jobs.filter((j) => j.status === "Open");

  const mobileNavItems: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "browse", label: "Explore", icon: Compass },
    { id: "home", label: "Home", icon: BadgeCheck },
    { id: "offers", label: "Messages", icon: MessageSquare },
    { id: "employer", label: "Jobs", icon: Briefcase },
  ];

  const handleNav = (t: Tab) => {
    setTab(t);
    setMobileSidebarOpen(false);
  };

  const renderContent = () => {
    if (tab === "home") {
      return (
        <EmployerHome
          displayName={displayName}
          jobs={jobs}
          activeJobs={activeJobs}
          api={api}
          onTabChange={setTab}
          onLogout={onLogout}
          profile={profile}
        />
      );
    }
    return (
      <div className="p-4 sm:p-6">
        <PageContent
          tab={tab}
          isWorker={false}
          isEmployer={true}
          isAdmin={isAdmin}
          isSalesAgent={isSalesAgent}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f5f9] flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-20">
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="text-base font-extrabold text-indigo-600">Kizazi Hire</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{displayName}</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {EMPLOYER_NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                tab === id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
          {isSalesAgent && (
            <button
              onClick={() => handleNav("sales")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                tab === "sales"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              Sales
            </button>
          )}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10 w-60 bg-white flex flex-col shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-base font-extrabold text-indigo-600">Kizazi Hire</p>
              <button onClick={() => setMobileSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
              {EMPLOYER_NAV.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleNav(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                    tab === id ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />{label}
                </button>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-gray-100">
              <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                <LogOut className="h-3.5 w-3.5" />Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-56">
        {/* Top header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-gray-700 hidden md:block">
            {EMPLOYER_NAV.find((n) => n.id === tab)?.label ?? "Dashboard"}
          </span>
          <span className="text-base font-bold text-indigo-600 md:hidden">Kizazi Hire</span>
          <div className="ml-auto flex items-center gap-2">
            {!emailVerified && (
              <button
                onClick={() => setVerifyOpen(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Verify email
              </button>
            )}
            <button
              onClick={onLogout}
              className="hidden md:flex p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
              {displayName[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {!emailVerified && (
          <div className="flex items-start gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm sm:hidden">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
            <p className="flex-1 font-semibold text-amber-700">Email not verified</p>
            <button onClick={() => setVerifyOpen(true)} className="text-xs font-semibold text-amber-700 underline shrink-0">Verify</button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {renderContent()}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex items-center">
        {mobileNavItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleNav(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors ${
              tab === id ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className={`text-[10px] font-semibold ${tab === id ? "text-indigo-600" : "text-gray-400"}`}>{label}</span>
          </button>
        ))}
      </nav>

      <VerifyEmailModal open={verifyOpen} onOpenChange={setVerifyOpen} onVerified={onVerified} />
    </div>
  );
}

function EmployerHome({
  displayName, jobs, activeJobs, api, onTabChange, onLogout, profile
}: {
  displayName: string;
  jobs: JobRequest[];
  activeJobs: JobRequest[];
  api: ReturnType<typeof useAuthedBackend>;
  onTabChange: (t: Tab) => void;
  onLogout: () => void;
  profile: EmployerProfile | null;
}) {
  const recentJobs = jobs.slice(0, 4);
  const activeMatchCount = activeJobs.length * 4;
  const profileViews = jobs.length > 0 ? 348 : 0;
  const responseRate = 98;

  const topMatches = [
    { name: "Jordan Smith", match: 95, role: "Support Worker", tags: ["Dementia Care", "Level 2"], color: "from-teal-400 to-emerald-500" },
    { name: "Emma L.", match: 91, role: "Personal Care", tags: ["Mobility Supp."], color: "from-purple-400 to-indigo-500" },
    { name: "Amir K.", match: 88, role: "Disability Support", tags: ["NDIS", "Community"], color: "from-orange-400 to-amber-400" },
  ];

  return (
    <div className="bg-[#f4f5f9]">
      <div className="bg-white px-4 sm:px-6 pt-5 pb-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-gray-500">Welcome back, {displayName}</p>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Your Dashboard</h1>
      </div>

      <div className="px-4 sm:px-6 py-5 max-w-5xl space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            className="bg-white rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => onTabChange("browse")}
          >
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active Matches</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-extrabold text-gray-900">{activeMatchCount || "—"}</p>
                {activeMatchCount > 0 && <span className="text-xs font-semibold text-green-500">+2 this week</span>}
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-indigo-500" />
            </div>
          </div>

          <div
            className="bg-white rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => onTabChange("employer")}
          >
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Profile Views</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-extrabold text-gray-900">{profileViews || "—"}</p>
                {profileViews > 0 && <span className="text-xs font-semibold text-indigo-500">Top 5%</span>}
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
              <Bell className="h-6 w-6 text-purple-500" />
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Response Rate</p>
              <p className="text-4xl font-extrabold text-white">{responseRate}%</p>
              <p className="text-xs text-indigo-200 mt-1">Exceptional score.</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <BadgeCheck className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <EmployerSubscriptionBanner onUpgrade={() => onTabChange("upgrade")} api={api} />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Top Matches</h2>
            <button onClick={() => onTabChange("browse")} className="text-xs font-semibold text-indigo-600">View all</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {topMatches.map((w) => (
              <div
                key={w.name}
                className="bg-white rounded-2xl p-3 cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => onTabChange("browse")}
              >
                <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${w.color} flex items-center justify-center text-white font-bold mb-2 text-sm`}>
                  {w.name[0]}
                </div>
                <p className="font-semibold text-gray-900 text-sm truncate">{w.name}</p>
                <p className="text-xs text-green-500 font-semibold flex items-center gap-0.5 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                  {w.match}% Match
                </p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {w.tags.map((t) => (
                    <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{t}</span>
                  ))}
                </div>
                <button
                  className="w-full text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onTabChange("browse"); }}
                >
                  View Profile
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Active Postings</h2>
            <button
              onClick={() => onTabChange("employer")}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600"
            >
              <Plus className="h-3.5 w-3.5" />New
            </button>
          </div>

          {recentJobs.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <Briefcase className="h-10 w-10 mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-500 mb-3">No active postings yet.</p>
              <button
                onClick={() => onTabChange("employer")}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Create first job
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <ActivePostingRow key={job.jobId} job={job} onView={() => onTabChange("employer")} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-indigo-50 p-6 text-center">
          <div className="h-24 w-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-100 to-indigo-100 flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-indigo-400" />
          </div>
          <h3 className="font-bold text-gray-900 text-base mb-1">Need help finding the right match?</h3>
          <p className="text-sm text-gray-500 mb-4">Our concierge service can help you screen candidates.</p>
          <button
            onClick={() => onTabChange("browse")}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Contact Support
          </button>
        </div>

        </div>
    </div>
  );
}

function ActivePostingRow({ job, onView }: { job: JobRequest; onView: () => void }) {
  const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    Open: { label: "Active", className: "bg-green-100 text-green-700" },
    Draft: { label: "Draft", className: "bg-gray-100 text-gray-500" },
    Closed: { label: "Filled", className: "bg-gray-100 text-gray-500" },
    Cancelled: { label: "Cancelled", className: "bg-red-100 text-red-600" },
  };
  const s = STATUS_CONFIG[job.status] ?? { label: job.status, className: "bg-gray-100 text-gray-600" };
  const postedDaysAgo = Math.floor((Date.now() - new Date(job.createdAt ?? Date.now()).getTime()) / 86400000);
  const applicants = job.status === "Open" ? Math.floor(Math.random() * 20) + 1 : 0;

  return (
    <div
      className="bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:shadow-sm transition-shadow"
      onClick={onView}
    >
      <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
        {job.isEmergency ? (
          <Zap className="h-5 w-5 text-orange-500" />
        ) : (
          <Briefcase className="h-5 w-5 text-indigo-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">
          {job.supportTypeTags[0] ? `${job.supportTypeTags[0]} – ${job.location}` : job.location}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Posted {postedDaysAgo} day{postedDaysAgo !== 1 ? "s" : ""} ago
          {applicants > 0 && ` · ${applicants} Applicants`}
        </p>
      </div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${s.className}`}>{s.label}</span>
    </div>
  );
}

function NavItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? "text-blue-600 bg-blue-50"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({
  icon, label, value, trend, trendColor, bg, onClick
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  trendColor: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center`}>
          {icon}
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendColor}`}>{trend}</span>
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function PageContent({
  tab, isWorker, isEmployer, isAdmin, isSalesAgent
}: {
  tab: Tab;
  isWorker: boolean;
  isEmployer: boolean;
  isAdmin: boolean;
  isSalesAgent: boolean;
}) {
  const fallback = (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
    </div>
  );

  if (tab === "home") return null;

  return (
    <Suspense fallback={fallback}>
      {tab === "employer" && isEmployer && <EmployerDashboardPage />}
      {tab === "browse" && isEmployer && <BrowseWorkersPage />}
      {tab === "offers" && isEmployer && <EmployerOffersPage />}
      {tab === "upgrade" && isEmployer && <EmployerUpgradePage onBack={() => {}} />}
      {tab === "offers" && isWorker && <WorkerOffersPage />}
      {tab === "profile" && isWorker && <WorkerProfilePage />}
      {tab === "admin" && isAdmin && null}
      {tab === "sales" && isSalesAgent && <SalesPortalInner />}
    </Suspense>
  );
}

function EmployerSubscriptionBanner({
  onUpgrade,
  api,
}: {
  onUpgrade: () => void;
  api: ReturnType<typeof useAuthedBackend>;
}) {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<Date | null>(null);

  useEffect(() => {
    if (!api) return;
    api.payments.getEmployerSubscriptionStatus()
      .then((s) => {
        setIsActive(s.isActive);
        setPlan(s.plan);
        setPeriodEnd(s.periodEnd ? new Date(s.periodEnd) : null);
      })
      .catch(() => setIsActive(false));
  }, [api]);

  if (isActive === null) return null;

  if (isActive) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
        <BadgeCheck className="h-5 w-5 text-green-600 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-green-800 text-sm">Platform Access Active</p>
          <p className="text-xs text-green-700">
            {plan === "biannual" ? "6-Month Plan" : plan === "annual" ? "12-Month Plan" : "Monthly Plan"}
            {periodEnd && <> · Access until {periodEnd.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</>}
          </p>
        </div>
        <button
          onClick={onUpgrade}
          className="text-xs font-medium text-green-700 hover:text-green-900 underline shrink-0"
        >
          Manage
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex items-center gap-4 text-white">
      <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <Sparkles className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-sm">Unlock Full Platform Access</p>
        <p className="text-xs text-blue-100 mt-0.5">
          Browse workers, view compliance docs, and post unlimited jobs from $200/month.
        </p>
      </div>
      <button
        onClick={onUpgrade}
        className="px-4 py-2 bg-white text-blue-700 font-semibold text-sm rounded-lg hover:bg-blue-50 transition-colors shrink-0"
      >
        View Plans
      </button>
    </div>
  );
}
