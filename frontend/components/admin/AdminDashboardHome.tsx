import { useEffect, useState } from "react";
import {
  Users, Building2, FileText, Briefcase, CheckCircle, MessageSquare,
  DollarSign, UserCheck, TrendingUp, Activity, AlertTriangle,
  ShieldCheck, Zap, ArrowRight, Loader2, RefreshCw, BarChart2, RefreshCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { PlatformStats } from "~backend/admin/platform";

function fmtAud(cents: number) {
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function StatTile({
  icon, label, value, sub, color, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`p-4 sm:p-5 flex flex-col gap-3 ${onClick ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function QuickAction({
  icon, label, description, onClick, urgent,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  urgent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-sm ${
        urgent
          ? "border-yellow-500/40 bg-yellow-500/5 hover:border-yellow-500/60"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${urgent ? "bg-yellow-500/15" : "bg-primary/10"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export function AdminDashboardHome({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  const api = useAuthedBackend();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ghlSyncing, setGhlSyncing] = useState(false);
  const [ghlResult, setGhlResult] = useState<{ synced: number; failed: number } | null>(null);

  const load = async (silent = false) => {
    if (!api) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const s = await api.admin.adminGetPlatformStats();
      setStats(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const syncGHL = async () => {
    if (!api) return;
    setGhlSyncing(true);
    setGhlResult(null);
    try {
      const result = await api.ghl.bulkSyncToGHL();
      setGhlResult(result);
    } catch (e) {
      console.error(e);
      setGhlResult({ synced: 0, failed: -1 });
    } finally {
      setGhlSyncing(false);
    }
  };

  useEffect(() => { load(); }, [api]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #6366f1 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 40%)" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-widest">Admin Control Centre</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Platform Overview</h1>
            <p className="text-slate-300 text-sm mt-1.5">
              {stats ? `${stats.totalWorkers} workers · ${stats.totalEmployers} employers · ${stats.activeSubscriptions} active subscriptions` : "Loading platform data…"}
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {stats && stats.pendingDocuments > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {stats.pendingDocuments} document{stats.pendingDocuments !== 1 ? "s" : ""} awaiting review
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Workers are waiting for verification to proceed.</p>
          </div>
          <button
            onClick={() => onNavigate("workers")}
            className="text-xs font-semibold text-yellow-500 hover:text-yellow-400 whitespace-nowrap"
          >
            Review now →
          </button>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Key Metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            icon={<Users className="h-5 w-5 text-blue-400" />}
            label="Total Workers"
            value={stats?.totalWorkers ?? "—"}
            sub={stats ? `+${stats.newWorkersThisMonth} this month` : undefined}
            color="bg-blue-500/10"
            onClick={() => onNavigate("workers")}
          />
          <StatTile
            icon={<Building2 className="h-5 w-5 text-purple-400" />}
            label="Total Employers"
            value={stats?.totalEmployers ?? "—"}
            sub={stats ? `+${stats.newEmployersThisMonth} this month` : undefined}
            color="bg-purple-500/10"
            onClick={() => onNavigate("employers")}
          />
          <StatTile
            icon={<DollarSign className="h-5 w-5 text-green-400" />}
            label="Active Subscriptions"
            value={stats?.activeSubscriptions ?? "—"}
            sub={stats ? `${fmtAud(stats.totalRevenueAudCents)} ARR` : undefined}
            color="bg-green-500/10"
          />
          <StatTile
            icon={<FileText className="h-5 w-5 text-yellow-400" />}
            label="Pending Documents"
            value={stats?.pendingDocuments ?? "—"}
            sub="Awaiting review"
            color="bg-yellow-500/10"
            onClick={() => onNavigate("workers")}
          />
          <StatTile
            icon={<Briefcase className="h-5 w-5 text-indigo-400" />}
            label="Active Jobs"
            value={stats?.activeJobs ?? "—"}
            sub={stats ? `${stats.totalJobs} total` : undefined}
            color="bg-indigo-500/10"
            onClick={() => onNavigate("jobs")}
          />
          <StatTile
            icon={<CheckCircle className="h-5 w-5 text-emerald-400" />}
            label="Accepted Offers"
            value={stats?.acceptedOffers ?? "—"}
            sub={stats ? `${stats.totalOffers} total offers` : undefined}
            color="bg-emerald-500/10"
          />
          <StatTile
            icon={<MessageSquare className="h-5 w-5 text-cyan-400" />}
            label="Messages Sent"
            value={stats?.totalMessages ?? "—"}
            color="bg-cyan-500/10"
          />
          <StatTile
            icon={<UserCheck className="h-5 w-5 text-rose-400" />}
            label="Unverified Users"
            value={stats?.unverifiedUsers ?? "—"}
            sub="Email not confirmed"
            color="bg-rose-500/10"
            onClick={() => onNavigate("users")}
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Worker Profile Completion</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            icon={<BarChart2 className="h-5 w-5 text-violet-400" />}
            label="Avg. Completion"
            value={stats ? `${stats.workerProfileCompletionAvgPct}%` : "—"}
            sub="Across all worker profiles"
            color="bg-violet-500/10"
            onClick={() => onNavigate("workers")}
          />
          <StatTile
            icon={<CheckCircle className="h-5 w-5 text-green-400" />}
            label="Fully Complete"
            value={stats?.workersFullyComplete ?? "—"}
            sub={stats ? `≥80% complete (${stats.totalWorkers > 0 ? Math.round((stats.workersFullyComplete / stats.totalWorkers) * 100) : 0}% of workers)` : undefined}
            color="bg-green-500/10"
            onClick={() => onNavigate("workers")}
          />
          <StatTile
            icon={<TrendingUp className="h-5 w-5 text-yellow-400" />}
            label="Mostly Complete"
            value={stats?.workersMostlyComplete ?? "—"}
            sub={stats ? `50–79% complete (${stats.totalWorkers > 0 ? Math.round((stats.workersMostlyComplete / stats.totalWorkers) * 100) : 0}% of workers)` : undefined}
            color="bg-yellow-500/10"
            onClick={() => onNavigate("workers")}
          />
          <StatTile
            icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
            label="Incomplete Profiles"
            value={stats?.workersIncomplete ?? "—"}
            sub={stats ? `<50% complete (${stats.totalWorkers > 0 ? Math.round((stats.workersIncomplete / stats.totalWorkers) * 100) : 0}% of workers)` : undefined}
            color="bg-red-500/10"
            onClick={() => onNavigate("workers")}
          />
        </div>
        {stats && stats.totalWorkers > 0 && (
          <div className="mt-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Profile completion distribution</span>
              <span className="text-xs font-semibold text-violet-400">{stats.workerProfileCompletionAvgPct}% avg</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${Math.round((stats.workersFullyComplete / stats.totalWorkers) * 100)}%` }}
                title={`Fully complete: ${stats.workersFullyComplete}`}
              />
              <div
                className="bg-yellow-500 transition-all"
                style={{ width: `${Math.round((stats.workersMostlyComplete / stats.totalWorkers) * 100)}%` }}
                title={`Mostly complete: ${stats.workersMostlyComplete}`}
              />
              <div
                className="bg-red-400 transition-all flex-1"
                title={`Incomplete: ${stats.workersIncomplete}`}
              />
            </div>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" />≥80%</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-500" />50–79%</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400" />&lt;50%</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickAction
            icon={<FileText className="h-5 w-5 text-yellow-500" />}
            label="Review Worker Documents"
            description={stats?.pendingDocuments ? `${stats.pendingDocuments} documents pending verification` : "Verify uploaded compliance docs"}
            onClick={() => onNavigate("workers")}
            urgent={!!stats?.pendingDocuments && stats.pendingDocuments > 0}
          />
          <QuickAction
            icon={<Building2 className="h-5 w-5 text-purple-400" />}
            label="Manage Employers"
            description="Grant or revoke subscriptions, view accounts"
            onClick={() => onNavigate("employers")}
          />
          <QuickAction
            icon={<Briefcase className="h-5 w-5 text-indigo-400" />}
            label="Manage Jobs"
            description="View, update or cancel job listings"
            onClick={() => onNavigate("jobs")}
          />
          <QuickAction
            icon={<Users className="h-5 w-5 text-blue-400" />}
            label="Manage Users"
            description="Suspend, verify or delete user accounts"
            onClick={() => onNavigate("users")}
          />
          <QuickAction
            icon={<Activity className="h-5 w-5 text-emerald-400" />}
            label="Platform Analytics"
            description="Full stats across workers, jobs & revenue"
            onClick={() => onNavigate("overview")}
          />
          <QuickAction
            icon={<Zap className="h-5 w-5 text-orange-400" />}
            label="Email Communications"
            description="Send comms and manage email campaigns"
            onClick={() => onNavigate("email")}
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Integrations</h2>
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-orange-500/10">
            <RefreshCcw className="h-5 w-5 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">GoHighLevel CRM Sync</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Push all verified workers and employers to GHL as contacts.
            </p>
            {ghlResult && ghlResult.failed !== -1 && (
              <p className="text-xs text-emerald-400 mt-1 font-medium">
                Synced {ghlResult.synced} contacts{ghlResult.failed > 0 ? `, ${ghlResult.failed} failed` : ""}
              </p>
            )}
            {ghlResult && ghlResult.failed === -1 && (
              <p className="text-xs text-red-400 mt-1 font-medium">Sync failed — check GHL secrets in Settings</p>
            )}
          </div>
          <button
            onClick={syncGHL}
            disabled={ghlSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-xl text-sm font-medium text-orange-400 transition-colors disabled:opacity-60 shrink-0"
          >
            <RefreshCcw className={`h-4 w-4 ${ghlSyncing ? "animate-spin" : ""}`} />
            {ghlSyncing ? "Syncing…" : "Sync to GHL"}
          </button>
        </div>
      </div>
    </div>
  );
}
