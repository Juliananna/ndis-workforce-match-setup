import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck, FileText, UserCheck, Users, Clock, AlertTriangle, BarChart2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import AdminPage from "./AdminPage";
import { useAuthedBackend } from "../hooks/useAuthedBackend";
import type { AdminWorkerSummary } from "~backend/admin/workers";

type Section = "verification" | "overview";

export default function ComplianceDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const api = useAuthedBackend();
  const [section, setSection] = useState<Section>("verification");
  const [workers, setWorkers] = useState<AdminWorkerSummary[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadWorkers = useCallback(async () => {
    if (!api) return;
    setStatsLoading(true);
    try {
      const res = await api.admin.adminListWorkers();
      setWorkers(res.workers);
    } catch {
    } finally {
      setStatsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const totalWorkers = workers.length;
  const pendingDocs = workers.reduce((sum, w) => sum + w.pendingDocumentCount, 0);
  const verifiedWorkers = workers.filter((w) => w.isVerified).length;
  const workersWithPending = workers.filter((w) => w.pendingDocumentCount > 0).length;
  const avgCompletion = totalWorkers > 0
    ? Math.round(workers.reduce((sum, w) => sum + w.profileCompletionPct, 0) / totalWorkers)
    : 0;
  const incompleteWorkers = workers.filter((w) => w.profileCompletionPct < 50).length;

  const displayName = user?.email?.split("@")[0] ?? "Officer";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <ShieldCheck className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Kizazi Hire</p>
                <p className="text-xs text-indigo-600 font-medium leading-tight">Compliance Portal</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              <NavItem
                label="Overview"
                active={section === "overview"}
                onClick={() => setSection("overview")}
              />
              <NavItem
                label="Worker Verification"
                active={section === "verification"}
                onClick={() => setSection("verification")}
                badge={pendingDocs > 0 ? pendingDocs : undefined}
              />
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg">
              <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {displayName[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-indigo-700 font-medium">{displayName}</span>
              <span className="text-xs text-indigo-400 bg-indigo-100 px-1.5 py-0.5 rounded-full font-medium">Compliance</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {section === "overview" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 p-8 text-white">
              <h1 className="text-2xl font-bold mb-1">Compliance Dashboard</h1>
              <p className="text-indigo-100 text-sm">
                Review and verify worker documents, conduct reference checks, and manage staff compliance.
              </p>
            </div>

            {statsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                    <div className="h-10 w-10 bg-gray-100 rounded-xl mb-4" />
                    <div className="h-7 w-12 bg-gray-100 rounded mb-2" />
                    <div className="h-4 w-24 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                  icon={<Users className="h-5 w-5 text-indigo-600" />}
                  bg="bg-indigo-50"
                  label="Total Workers"
                  value={totalWorkers}
                  onClick={() => setSection("verification")}
                />
                <StatCard
                  icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />}
                  bg="bg-yellow-50"
                  label="Docs Pending"
                  value={pendingDocs}
                  highlight={pendingDocs > 0}
                  onClick={() => setSection("verification")}
                />
                <StatCard
                  icon={<Clock className="h-5 w-5 text-orange-600" />}
                  bg="bg-orange-50"
                  label="Workers w/ Pending"
                  value={workersWithPending}
                  onClick={() => setSection("verification")}
                />
                <StatCard
                  icon={<UserCheck className="h-5 w-5 text-green-600" />}
                  bg="bg-green-50"
                  label="Email Verified"
                  value={verifiedWorkers}
                  onClick={() => setSection("verification")}
                />
                <StatCard
                  icon={<BarChart2 className="h-5 w-5 text-purple-600" />}
                  bg="bg-purple-50"
                  label="Avg Profile Complete"
                  value={`${avgCompletion}%`}
                  onClick={() => setSection("verification")}
                />
                <StatCard
                  icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                  bg="bg-red-50"
                  label="Under 50% Complete"
                  value={incompleteWorkers}
                  highlight={incompleteWorkers > 0}
                  onClick={() => setSection("verification")}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ActionCard
                icon={<FileText className="h-5 w-5 text-indigo-600" />}
                bg="bg-indigo-50"
                title="Document Verification"
                description="Review uploaded compliance documents, verify or reject with reason."
                cta="Review Documents"
                badge={pendingDocs > 0 ? `${pendingDocs} pending` : undefined}
                badgeColor="bg-yellow-100 text-yellow-700"
                onClick={() => setSection("verification")}
              />
              <ActionCard
                icon={<UserCheck className="h-5 w-5 text-purple-600" />}
                bg="bg-purple-50"
                title="Reference Checks"
                description="Conduct structured reference checks and generate risk assessments."
                cta="Manage References"
                onClick={() => setSection("verification")}
              />
            </div>
          </div>
        )}

        {section === "verification" && <AdminPage />}
      </main>
    </div>
  );
}

function NavItem({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? "text-indigo-700 bg-indigo-50"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      }`}
    >
      {label}
      {badge !== undefined && (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-700 font-semibold">
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({
  icon,
  bg,
  label,
  value,
  highlight,
  onClick,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number | string;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border ${highlight ? "border-yellow-300" : "border-gray-200"} p-5 cursor-pointer hover:shadow-md transition-all`}
    >
      <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-yellow-600" : "text-gray-900"}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function ActionCard({
  icon,
  bg,
  title,
  description,
  cta,
  badge,
  badgeColor,
  onClick,
}: {
  icon: React.ReactNode;
  bg: string;
  title: string;
  description: string;
  cta: string;
  badge?: string;
  badgeColor?: string;
  onClick: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{title}</p>
            {badge && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>{badge}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        className="self-start px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {cta}
      </button>
    </div>
  );
}
