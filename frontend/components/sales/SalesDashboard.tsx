import { useEffect, useState } from "react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { SalesDashboardStats } from "~backend/sales/dashboard";
import {
  Users, Building2, DollarSign, FileText, Briefcase, TrendingUp,
  MonitorPlay, Tag, Loader2, ArrowUpRight, UserPlus, RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function StatCard({
  icon, label, value, sub, accent, trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  trend?: string;
}) {
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`h-10 w-10 rounded-xl ${accent} flex items-center justify-center`}>
          {icon}
        </div>
        {trend && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            <ArrowUpRight className="h-3 w-3" />{trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

export function SalesDashboard() {
  const api = useAuthedBackend();
  const [stats, setStats] = useState<SalesDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const s = await api.sales.getSalesDashboard();
      setStats(s);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [api]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-center gap-2">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const acceptRate = stats.totalOffers > 0
    ? Math.round((stats.acceptedOffers / stats.totalOffers) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Overview</p>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-600" />}
          label="Total Workers"
          value={stats.totalWorkers.toLocaleString()}
          sub={`+${stats.newWorkersThisMonth} this month`}
          accent="bg-blue-50"
          trend={`+${stats.newWorkersThisMonth}`}
        />
        <StatCard
          icon={<Building2 className="h-5 w-5 text-indigo-600" />}
          label="Total Employers"
          value={stats.totalEmployers.toLocaleString()}
          sub={`+${stats.newEmployersThisMonth} this month`}
          accent="bg-indigo-50"
          trend={`+${stats.newEmployersThisMonth}`}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          label="Active Revenue"
          value={fmt(stats.totalRevenueAudCents)}
          sub={`${fmt(stats.monthlyRevenueAudCents)} this month`}
          accent="bg-green-50"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          label="Active Subscriptions"
          value={stats.activeSubscriptions.toLocaleString()}
          accent="bg-purple-50"
        />
        <StatCard
          icon={<Briefcase className="h-5 w-5 text-orange-600" />}
          label="Active Jobs"
          value={stats.activeJobs.toLocaleString()}
          accent="bg-orange-50"
        />
        <StatCard
          icon={<FileText className="h-5 w-5 text-yellow-600" />}
          label="Pending Documents"
          value={stats.pendingDocuments.toLocaleString()}
          sub="Awaiting verification"
          accent="bg-yellow-50"
        />
        <StatCard
          icon={<MonitorPlay className="h-5 w-5 text-cyan-600" />}
          label="Demos"
          value={`${stats.scheduledDemos} scheduled`}
          sub={`${stats.completedDemos} completed`}
          accent="bg-cyan-50"
        />
        <StatCard
          icon={<Tag className="h-5 w-5 text-rose-600" />}
          label="Active Discounts"
          value={stats.activeDiscounts.toLocaleString()}
          accent="bg-rose-50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Offer Conversion</p>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-bold text-gray-900">{acceptRate}%</p>
            <p className="text-sm text-gray-500 pb-1">acceptance rate</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all"
              style={{ width: `${acceptRate}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">
            {stats.acceptedOffers} accepted / {stats.totalOffers} total offers
          </p>
        </Card>

        <Card className="p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Monthly Growth</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-gray-600">
                <UserPlus className="h-3.5 w-3.5 text-blue-500" />
                New Workers
              </span>
              <span className="font-semibold text-gray-900">+{stats.newWorkersThisMonth}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-gray-600">
                <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                New Employers
              </span>
              <span className="font-semibold text-gray-900">+{stats.newEmployersThisMonth}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-gray-600">
                <DollarSign className="h-3.5 w-3.5 text-green-500" />
                New Revenue
              </span>
              <span className="font-semibold text-gray-900">{fmt(stats.monthlyRevenueAudCents)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
