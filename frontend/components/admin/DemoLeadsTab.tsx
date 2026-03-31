import { useEffect, useState, useCallback } from "react";
import {
  Loader2, RefreshCw, Users2, Mail, Briefcase, Clock, Phone, CalendarPlus, X,
  CheckCircle, AlertCircle, Calendar,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { DemoLead } from "~backend/admin/demo_leads";
import type { DemoType } from "~backend/sales/demos";

const TYPE_CFG: Record<DemoType, string> = {
  standard: "Standard",
  employer: "Employer",
  worker: "Worker",
  full_platform: "Full Platform",
};

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    EMPLOYER: "bg-emerald-100 text-emerald-700 border-transparent",
    WORKER: "bg-blue-100 text-blue-700 border-transparent",
    OTHER: "bg-gray-100 text-gray-600 border-transparent",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${map[role] ?? map["OTHER"]}`}>
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}

interface ScheduleFormState {
  leadId: string;
  prospectName: string;
  prospectEmail: string;
  prospectPhone: string;
  demoType: DemoType;
  scheduledAt: string;
  followUpAt: string;
  notes: string;
}

export function DemoLeadsTab() {
  const api = useAuthedBackend();
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [scheduledIds, setScheduledIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.listDemoLeads();
      setLeads(res.leads);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load demo leads");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const openSchedule = (lead: DemoLead) => {
    setSaveError(null);
    setScheduleForm({
      leadId: lead.id,
      prospectName: lead.name,
      prospectEmail: lead.email,
      prospectPhone: lead.phone ?? "",
      demoType: lead.role === "EMPLOYER" ? "employer" : lead.role === "WORKER" ? "worker" : "standard",
      scheduledAt: "",
      followUpAt: "",
      notes: "",
    });
  };

  const handleSchedule = async () => {
    if (!api || !scheduleForm) return;
    setSaveError(null);
    if (!scheduleForm.scheduledAt) {
      setSaveError("Please pick a date and time for the demo.");
      return;
    }
    setSaving(true);
    try {
      await api.sales.createDemo({
        prospectName: scheduleForm.prospectName,
        prospectEmail: scheduleForm.prospectEmail,
        prospectPhone: scheduleForm.prospectPhone || undefined,
        demoType: scheduleForm.demoType,
        scheduledAt: new Date(scheduleForm.scheduledAt),
        followUpAt: scheduleForm.followUpAt ? new Date(scheduleForm.followUpAt) : undefined,
        notes: scheduleForm.notes || undefined,
      });
      setScheduledIds((prev) => new Set([...prev, scheduleForm.leadId]));
      setScheduleForm(null);
    } catch (e: unknown) {
      console.error(e);
      setSaveError(e instanceof Error ? e.message : "Failed to schedule demo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-4 text-sm text-gray-500">
          <span><strong className="text-gray-800">{leads.length}</strong> total</span>
          <span><strong className="text-emerald-700">{leads.filter((l) => l.role === "EMPLOYER").length}</strong> employers</span>
          <span><strong className="text-blue-700">{leads.filter((l) => l.role === "WORKER").length}</strong> workers</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {scheduleForm && (
        <Card className="p-5 space-y-4 border-orange-200 bg-orange-50/30">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-orange-500" />
              Schedule Demo — {scheduleForm.prospectName}
            </p>
            <button onClick={() => setScheduleForm(null)} className="text-gray-400 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={scheduleForm.prospectName}
                onChange={(e) => setScheduleForm((p) => p && ({ ...p, prospectName: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={scheduleForm.prospectEmail}
                onChange={(e) => setScheduleForm((p) => p && ({ ...p, prospectEmail: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                value={scheduleForm.prospectPhone}
                onChange={(e) => setScheduleForm((p) => p && ({ ...p, prospectPhone: e.target.value }))}
                className="h-8 text-sm"
                placeholder="04xx xxx xxx"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Demo Type</Label>
              <select
                value={scheduleForm.demoType}
                onChange={(e) => setScheduleForm((p) => p && ({ ...p, demoType: e.target.value as DemoType }))}
                className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
              >
                {(Object.entries(TYPE_CFG) as [DemoType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Scheduled At *</Label>
              <Input
                type="datetime-local"
                value={scheduleForm.scheduledAt}
                onChange={(e) => setScheduleForm((p) => p && ({ ...p, scheduledAt: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Follow-up Date</Label>
              <Input
                type="date"
                value={scheduleForm.followUpAt}
                onChange={(e) => setScheduleForm((p) => p && ({ ...p, followUpAt: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Input
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm((p) => p && ({ ...p, notes: e.target.value }))}
                className="h-8 text-sm"
                placeholder="Context, requirements, etc."
              />
            </div>
          </div>

          {saveError && <p className="text-xs text-red-600">{saveError}</p>}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSchedule}
              disabled={saving}
              className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CalendarPlus className="h-3.5 w-3.5 mr-1" />}
              Schedule Demo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setScheduleForm(null)} className="h-8 text-xs">
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : leads.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-10">No demo leads yet.</p>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => {
            const done = scheduledIds.has(lead.id);
            return (
              <Card key={lead.id} className="p-4 hover:border-orange-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600 font-bold text-sm">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                      <RoleBadge role={lead.role} />
                      {done && (
                        <span className="text-xs bg-green-100 text-green-700 border-transparent border px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />Demo scheduled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail className="h-3 w-3" />{lead.email}
                      </span>
                      {lead.phone && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone className="h-3 w-3" />{lead.phone}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(lead.createdAt).toLocaleDateString("en-AU", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openSchedule(lead)}
                    disabled={!!scheduleForm}
                    className="h-8 text-xs gap-1.5 border-orange-200 text-orange-600 hover:bg-orange-50 shrink-0"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {done ? "Schedule Again" : "Schedule Demo"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
