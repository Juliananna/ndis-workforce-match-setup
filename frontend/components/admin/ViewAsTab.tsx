import { useState, useEffect } from "react";
import { Eye, Users, Building2, Search, ExternalLink, Loader2, ChevronRight } from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { useAuth } from "../../contexts/AuthContext";

type ViewMode = "workers" | "employers";

interface WorkerEntry {
  userId: string;
  name: string;
  email: string;
}

interface EmployerEntry {
  userId: string;
  organisationName: string;
  email: string;
}

export function ViewAsTab() {
  const api = useAuthedBackend();
  const { login } = useAuth();
  const [mode, setMode] = useState<ViewMode>("workers");
  const [workers, setWorkers] = useState<WorkerEntry[]>([]);
  const [employers, setEmployers] = useState<EmployerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    setLoading(true);
    api.admin.listImpersonatableUsers()
      .then((res) => {
        setWorkers(res.workers);
        setEmployers(res.employers);
      })
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false));
  }, [api]);

  const handleViewAs = async (userId: string) => {
    if (!api) return;
    setImpersonating(userId);
    setError(null);
    try {
      const originalToken = localStorage.getItem("ndis_token");
      const res = await api.admin.impersonateUser({ userId });
      localStorage.setItem("ndis_impersonate_original_token", originalToken ?? "");
      await login(res.token);
      window.location.href = "/dashboard";
    } catch {
      setError("Failed to impersonate user");
      setImpersonating(null);
    }
  };

  const filteredWorkers = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEmployers = employers.filter(
    (e) =>
      e.organisationName.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
          <Eye className="h-5 w-5 text-violet-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">View As</h2>
          <p className="text-sm text-muted-foreground">Impersonate a worker or employer to see their view of the platform</p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        You will be logged in as the selected user and redirected to their dashboard. To return, log out and log back in with your admin credentials.
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setMode("workers"); setSearch(""); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            mode === "workers"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Users className="h-4 w-4" />
          Workers ({workers.length})
        </button>
        <button
          onClick={() => { setMode("employers"); setSearch(""); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            mode === "employers"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Employers ({employers.length})
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={mode === "workers" ? "Search workers..." : "Search employers..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {mode === "workers" && (
            filteredWorkers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No workers found</p>
            ) : (
              filteredWorkers.map((w) => (
                <UserRow
                  key={w.userId}
                  primary={w.name}
                  secondary={w.email}
                  icon={<Users className="h-4 w-4 text-indigo-500" />}
                  iconBg="bg-indigo-500/10"
                  loading={impersonating === w.userId}
                  onViewAs={() => handleViewAs(w.userId)}
                />
              ))
            )
          )}
          {mode === "employers" && (
            filteredEmployers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No employers found</p>
            ) : (
              filteredEmployers.map((e) => (
                <UserRow
                  key={e.userId}
                  primary={e.organisationName}
                  secondary={e.email}
                  icon={<Building2 className="h-4 w-4 text-emerald-500" />}
                  iconBg="bg-emerald-500/10"
                  loading={impersonating === e.userId}
                  onViewAs={() => handleViewAs(e.userId)}
                />
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}

function UserRow({
  primary, secondary, icon, iconBg, loading, onViewAs,
}: {
  primary: string;
  secondary: string;
  icon: React.ReactNode;
  iconBg: string;
  loading: boolean;
  onViewAs: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{primary}</p>
        <p className="text-xs text-muted-foreground truncate">{secondary}</p>
      </div>
      <button
        onClick={onViewAs}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-600 text-xs font-semibold hover:bg-violet-500/20 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ExternalLink className="h-3.5 w-3.5" />
        )}
        View as
      </button>
    </div>
  );
}
