import { useEffect, useState, useCallback } from "react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { DemoSession, DemoStatus, DemoType } from "~backend/sales/demos";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, MonitorPlay, Plus, Calendar, Clock, CheckCircle, X,
  AlertCircle, ChevronDown, Trash2, ArrowLeft,
} from "lucide-react";

const STATUS_CFG: Record<DemoStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700 border-transparent", icon: <Calendar className="h-3 w-3" /> },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 border-transparent", icon: <CheckCircle className="h-3 w-3" /> },
  no_show: { label: "No Show", color: "bg-red-100 text-red-600 border-transparent", icon: <AlertCircle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500 border-transparent", icon: <X className="h-3 w-3" /> },
};

const TYPE_CFG: Record<DemoType, string> = {
  standard: "Standard",
  employer: "Employer",
  worker: "Worker",
  full_platform: "Full Platform",
};

export function SalesDemos() {
  const api = useAuthedBackend();
  const [demos, setDemos] = useState<DemoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<DemoSession | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | DemoStatus>("all");
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState("");

  const [form, setForm] = useState({
    prospectName: "",
    prospectEmail: "",
    prospectCompany: "",
    prospectPhone: "",
    notes: "",
    demoType: "standard" as DemoType,
    scheduledAt: "",
    followUpAt: "",
  });

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.sales.listDemos();
      setDemos(res.demos);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!api) return;
    setError(null);
    if (!form.prospectName.trim() || !form.prospectEmail.trim() || !form.scheduledAt) {
      setError("Name, email, and scheduled time are required");
      return;
    }
    setSaving(true);
    try {
      const res = await api.sales.createDemo({
        prospectName: form.prospectName.trim(),
        prospectEmail: form.prospectEmail.trim(),
        prospectCompany: form.prospectCompany || undefined,
        prospectPhone: form.prospectPhone || undefined,
        notes: form.notes || undefined,
        demoType: form.demoType,
        scheduledAt: new Date(form.scheduledAt),
        followUpAt: form.followUpAt ? new Date(form.followUpAt) : undefined,
      });
      setDemos((prev) => [res.demo, ...prev]);
      setShowForm(false);
      setForm({ prospectName: "", prospectEmail: "", prospectCompany: "", prospectPhone: "", notes: "", demoType: "standard", scheduledAt: "", followUpAt: "" });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (demoId: string, status: DemoStatus) => {
    if (!api) return;
    setUpdatingStatus(demoId);
    try {
      await api.sales.updateDemoStatus({ demoId, status, outcome: outcome || undefined });
      setDemos((prev) => prev.map((d) => d.id === demoId ? { ...d, status, outcome: outcome || d.outcome } : d));
      if (selected?.id === demoId) setSelected((prev) => prev ? { ...prev, status, outcome: outcome || prev.outcome } : null);
      setOutcome("");
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (demoId: string) => {
    if (!api) return;
    setDeleting(demoId);
    try {
      await api.sales.deleteDemo({ demoId });
      setDemos((prev) => prev.filter((d) => d.id !== demoId));
      if (selected?.id === demoId) setSelected(null);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = filterStatus === "all" ? demos : demos.filter((d) => d.status === filterStatus);

  if (selected) {
    const cfg = STATUS_CFG[selected.status];
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />Back to demos
        </button>

        <Card className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{selected.prospectName}</p>
                <Badge className={`text-xs flex items-center gap-1 ${cfg.color}`}>
                  {cfg.icon}{cfg.label}
                </Badge>
                <Badge className="bg-purple-100 text-purple-700 border-transparent text-xs">
                  {TYPE_CFG[selected.demoType]}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">{selected.prospectEmail}</p>
              {selected.prospectCompany && <p className="text-sm text-gray-500">{selected.prospectCompany}</p>}
              {selected.prospectPhone && <p className="text-xs text-gray-400">{selected.prospectPhone}</p>}
              <p className="text-xs text-gray-400">Scheduled {new Date(selected.scheduledAt).toLocaleString()}</p>
              {selected.followUpAt && <p className="text-xs text-gray-400">Follow-up {new Date(selected.followUpAt).toLocaleDateString()}</p>}
              {selected.conductedByEmail && <p className="text-xs text-gray-400">Conducted by {selected.conductedByEmail}</p>}
              {selected.notes && <p className="text-sm text-gray-600 mt-1 bg-gray-50 rounded p-2">{selected.notes}</p>}
              {selected.outcome && <p className="text-sm text-gray-600 mt-1 bg-blue-50 rounded p-2"><span className="font-medium">Outcome: </span>{selected.outcome}</p>}
            </div>
            <button
              onClick={() => handleDelete(selected.id)}
              disabled={deleting === selected.id}
              className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
            >
              {deleting === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </Card>

        {selected.status === "scheduled" && (
          <Card className="p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-800">Update Status</p>
            <Input
              placeholder="Outcome / notes (optional)"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="flex gap-2 flex-wrap">
              {(["completed", "no_show", "cancelled"] as DemoStatus[]).map((s) => {
                const c = STATUS_CFG[s];
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    disabled={updatingStatus === selected.id}
                    onClick={() => handleUpdateStatus(selected.id, s)}
                    className="h-8 text-xs gap-1.5"
                  >
                    {updatingStatus === selected.id ? <Loader2 className="h-3 w-3 animate-spin" /> : c.icon}
                    {c.label}
                  </Button>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {(["all", "scheduled", "completed", "no_show", "cancelled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === f
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "All" : STATUS_CFG[f].label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm((p) => !p)}
          className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />Schedule Demo
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 space-y-4 border-orange-200 bg-orange-50/30">
          <p className="text-sm font-semibold text-gray-800">Schedule Demo</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Prospect Name *</Label>
              <Input value={form.prospectName} onChange={(e) => setForm((p) => ({ ...p, prospectName: e.target.value }))} className="h-8 text-sm" placeholder="Jane Smith" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={form.prospectEmail} onChange={(e) => setForm((p) => ({ ...p, prospectEmail: e.target.value }))} className="h-8 text-sm" placeholder="jane@org.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Company</Label>
              <Input value={form.prospectCompany} onChange={(e) => setForm((p) => ({ ...p, prospectCompany: e.target.value }))} className="h-8 text-sm" placeholder="Acme Care" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input value={form.prospectPhone} onChange={(e) => setForm((p) => ({ ...p, prospectPhone: e.target.value }))} className="h-8 text-sm" placeholder="04xx xxx xxx" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Demo Type</Label>
              <select
                value={form.demoType}
                onChange={(e) => setForm((p) => ({ ...p, demoType: e.target.value as DemoType }))}
                className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
              >
                {(Object.entries(TYPE_CFG) as [DemoType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Scheduled At *</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Follow-up Date</Label>
              <Input type="date" value={form.followUpAt} onChange={(e) => setForm((p) => ({ ...p, followUpAt: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="h-8 text-sm" placeholder="Context, requirements, etc." />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={saving} className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Schedule
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-8 text-xs">Cancel</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-10">No demos found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const cfg = STATUS_CFG[d.status];
            return (
              <button key={d.id} onClick={() => setSelected(d)} className="w-full text-left">
                <Card className="p-4 hover:border-orange-300 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                      <MonitorPlay className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{d.prospectName}</p>
                        <Badge className={`text-xs flex items-center gap-1 ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </Badge>
                        <Badge className="bg-purple-50 text-purple-600 border-transparent text-xs">
                          {TYPE_CFG[d.demoType]}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {d.prospectEmail}{d.prospectCompany ? ` · ${d.prospectCompany}` : ""}
                        {" · "}{new Date(d.scheduledAt).toLocaleString()}
                      </p>
                    </div>
                    <Clock className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
