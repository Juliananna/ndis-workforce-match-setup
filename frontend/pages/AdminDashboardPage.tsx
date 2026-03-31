import { useState, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, Users, Building2, Briefcase, UserCheck, ShieldCheck,
  Mail, LogOut, Menu, X, Loader2, LayoutDashboard, TrendingUp, HelpCircle, FileText, SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { AdminDashboardHome } from "../components/admin/AdminDashboardHome";
import { useAuthedBackend } from "../hooks/useAuthedBackend";

const AdminPage = lazy(() => import("./AdminPage"));
const SalesPortalInner = lazy(() => import("../components/sales/SalesPortalInner"));
const PrivacyPolicyEditor = lazy(() => import("../components/admin/PrivacyPolicyEditor"));
const PlatformSettingsTab = lazy(() => import("../components/admin/PlatformSettingsTab").then((m) => ({ default: m.PlatformSettingsTab })));

type AdminTab = "home" | "overview" | "workers" | "employers" | "jobs" | "users" | "compliance" | "email" | "support" | "sales" | "privacy" | "platform";

const NAV_ITEMS: { id: AdminTab; label: string; Icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: "home",       label: "Dashboard",    Icon: LayoutDashboard },
  { id: "overview",   label: "Analytics",    Icon: BarChart3 },
  { id: "workers",    label: "Workers",      Icon: Users },
  { id: "employers",  label: "Employers",    Icon: Building2 },
  { id: "jobs",       label: "Jobs",         Icon: Briefcase },
  { id: "users",      label: "Users",        Icon: UserCheck },
  { id: "compliance", label: "Compliance Officers", Icon: ShieldCheck, adminOnly: true },
  { id: "email",      label: "Email Comms",  Icon: Mail },
  { id: "support",    label: "Support",      Icon: HelpCircle },
  { id: "sales",      label: "Sales Portal", Icon: TrendingUp },
  { id: "privacy",    label: "Privacy Policy", Icon: FileText, adminOnly: true },
  { id: "platform",   label: "Platform Settings", Icon: SlidersHorizontal, adminOnly: true },
];

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const api = useAuthedBackend();
  const [tab, setTab] = useState<AdminTab>("home");
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.isAdmin === true;
  const isSalesAgent = user?.isSalesAgent === true || isAdmin;
  const displayName = user?.email?.split("@")[0] ?? "Admin";

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.id === "sales" && !isSalesAgent) return false;
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNav = (t: AdminTab) => {
    setTab(t);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-5 w-5 text-indigo-400" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground">NDIS Match</p>
          <p className="text-xs text-muted-foreground">Admin Portal</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => handleNav(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              tab === id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${tab === id ? "text-primary" : "text-muted-foreground"}`} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-background border-b border-border flex items-center h-14 px-4 gap-3 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
        <span className="font-bold text-foreground flex-1">
          {visibleItems.find((i) => i.id === tab)?.label ?? "Admin"}
        </span>
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
          {displayName[0]?.toUpperCase()}
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-72 max-w-[85vw] bg-background border-r border-border flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-bold text-foreground">Navigation</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex w-60 xl:w-64 bg-background border-r border-border flex-col shrink-0 sticky top-0 h-screen overflow-hidden">
          <SidebarContent />
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Suspense fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          }>
            {tab === "home" && <AdminDashboardHome onNavigate={(t) => setTab(t as AdminTab)} />}
            {tab === "sales" && <SalesPortalInner />}
            {tab === "privacy" && <PrivacyPolicyEditor />}
            {tab === "platform" && <PlatformSettingsTab api={api} />}
            {tab !== "home" && tab !== "sales" && tab !== "privacy" && tab !== "platform" && (
              <AdminPage
                initialTab={tab as "overview" | "workers" | "employers" | "jobs" | "users" | "compliance" | "email" | "support"}
                onTabChange={(t) => setTab(t as AdminTab)}
              />
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
}


