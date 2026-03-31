import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { SalesDashboard } from "./SalesDashboard";
import { UserAccountsPanel } from "../UserAccountsPanel";
import { SalesDiscounts } from "./SalesDiscounts";
import { SalesDemos } from "./SalesDemos";
import { SalesAgents } from "./SalesAgents";
import { LayoutDashboard, Users, Tag, MonitorPlay, UserCog, Briefcase, UserPlus } from "lucide-react";
import { SalesJobs } from "./SalesJobs";
import { DemoLeadsTab } from "../admin/DemoLeadsTab";

type SalesTab = "dashboard" | "accounts" | "jobs" | "discounts" | "demos" | "agents" | "leads";

const tabs: { id: SalesTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "accounts", label: "Accounts", icon: <Users className="h-4 w-4" /> },
  { id: "jobs", label: "Jobs", icon: <Briefcase className="h-4 w-4" /> },
  { id: "demos", label: "Demos", icon: <MonitorPlay className="h-4 w-4" /> },
  { id: "leads", label: "Demo Leads", icon: <UserPlus className="h-4 w-4" /> },
  { id: "discounts", label: "Discounts", icon: <Tag className="h-4 w-4" /> },
  { id: "agents", label: "Sales Team", icon: <UserCog className="h-4 w-4" />, adminOnly: true },
];

export default function SalesPortalInner() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true;
  const [activeTab, setActiveTab] = useState<SalesTab>("dashboard");
  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sales Portal</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage accounts, demos, and growth metrics</p>
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
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? "text-orange-600 border-b-2 border-orange-500 -mb-px"
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
        {activeTab === "leads" && <DemoLeadsTab />}
        {activeTab === "discounts" && <SalesDiscounts />}
        {activeTab === "agents" && isAdmin && <SalesAgents />}
      </div>
    </div>
  );
}
