import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { SalesDashboard } from "../components/sales/SalesDashboard";
import { UserAccountsPanel } from "../components/UserAccountsPanel";
import { SalesDiscounts } from "../components/sales/SalesDiscounts";
import { SalesDemos } from "../components/sales/SalesDemos";
import { SalesAgents } from "../components/sales/SalesAgents";
import {
  LayoutDashboard, Users, Tag, MonitorPlay, UserCog, LogOut, TrendingUp, Briefcase,
} from "lucide-react";
import { SalesJobs } from "../components/sales/SalesJobs";

type SalesTab = "dashboard" | "accounts" | "jobs" | "discounts" | "demos" | "agents";

const tabs: { id: SalesTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "accounts", label: "Accounts", icon: <Users className="h-4 w-4" /> },
  { id: "jobs", label: "Jobs", icon: <Briefcase className="h-4 w-4" /> },
  { id: "demos", label: "Demos", icon: <MonitorPlay className="h-4 w-4" /> },
  { id: "discounts", label: "Discounts", icon: <Tag className="h-4 w-4" /> },
  { id: "agents", label: "Sales Team", icon: <UserCog className="h-4 w-4" />, adminOnly: true },
];

interface SalesPortalContentProps {
  isAdmin: boolean;
  activeTab: SalesTab;
  setActiveTab: (tab: SalesTab) => void;
}

export function SalesPortalContent({ isAdmin, activeTab, setActiveTab }: SalesPortalContentProps) {
  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sales Portal</h1>
            <p className="text-sm text-gray-500">Manage accounts, demos, and growth metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg">
          <UserCog className="h-3.5 w-3.5 text-orange-500" />
          <span className="font-medium text-orange-700">Sales {isAdmin ? "Admin" : "Agent"}</span>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap rounded-t-lg ${
              activeTab === t.id
                ? "text-orange-600 border-b-2 border-orange-500 -mb-px bg-orange-50"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "dashboard" && <SalesDashboard />}
        {activeTab === "accounts" && <UserAccountsPanel />}
        {activeTab === "jobs" && <SalesJobs />}
        {activeTab === "demos" && <SalesDemos />}
        {activeTab === "discounts" && <SalesDiscounts />}
        {activeTab === "agents" && isAdmin && <SalesAgents />}
      </div>
    </div>
  );
}

export default function SalesPortalPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.isAdmin === true;
  const [activeTab, setActiveTab] = useState<SalesTab>("dashboard");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <span className="text-lg font-bold text-gray-900">NDIS Workforce</span>
            <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">Sales Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <SalesPortalContent isAdmin={isAdmin} activeTab={activeTab} setActiveTab={setActiveTab} />
      </main>
    </div>
  );
}
