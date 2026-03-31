import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Users2, Mail, Briefcase, Clock, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { DemoLead } from "~backend/admin/demo_leads";

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    EMPLOYER: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    WORKER: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    OTHER: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${map[role] ?? map["OTHER"]}`}>
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}

export function DemoLeadsTab() {
  const api = useAuthedBackend();
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api!.admin.listDemoLeads();
      setLeads(res.leads);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load demo leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Demo Leads</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            People who have entered the demo portal
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted/50 hover:bg-muted text-sm font-medium rounded-lg border border-border transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
            <Users2 className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{leads.length}</p>
            <p className="text-xs text-muted-foreground">Total leads</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Briefcase className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {leads.filter((l) => l.role === "EMPLOYER").length}
            </p>
            <p className="text-xs text-muted-foreground">Employers</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
            <Users2 className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {leads.filter((l) => l.role === "WORKER").length}
            </p>
            <p className="text-xs text-muted-foreground">Workers</p>
          </div>
        </Card>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No demo leads yet.
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold shrink-0">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        {lead.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {lead.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          {lead.phone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={lead.role} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {new Date(lead.createdAt).toLocaleDateString("en-AU", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
