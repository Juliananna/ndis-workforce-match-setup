import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Pencil, Check, X, Send, Zap, Loader2, Users, Share2, Copy, CheckCheck } from "lucide-react";
import type { JobRequest } from "~backend/jobs/get";
import type { UpdateJobRequestRequest } from "~backend/jobs/update";
import type { Offer } from "~backend/offers/types";
import type { EmergencyShiftResponse } from "~backend/jobs/emergency_respond";
import { SendOfferModal } from "../offers/SendOfferModal";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { MatchedWorkersList } from "../matching/MatchedWorkersList";

const SUPPORT_TYPE_TAGS = [
  "Autism support",
  "Intellectual disability",
  "Mobility support",
  "Personal care",
  "Behavioural support",
  "Community participation",
  "Medication administration",
  "Complex care",
  "PEG feeding",
  "Wound care",
  "Mental health support",
];

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Open: "bg-green-500/15 text-green-400",
  Closed: "bg-blue-500/15 text-blue-400",
  Cancelled: "bg-red-500/15 text-red-400",
};

interface Props {
  job: JobRequest;
  onBack: () => void;
  onUpdate: (req: UpdateJobRequestRequest) => Promise<JobRequest>;
  onCancel: (jobId: string) => Promise<void>;
  onSendOffer?: (workerId: string, rate: number, notes: string) => Promise<Offer>;
}

export function JobRequestDetail({ job, onBack, onUpdate, onCancel, onSendOffer }: Props) {
  const api = useAuthedBackend();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<JobRequest>(job);
  const [form, setForm] = useState<Partial<UpdateJobRequestRequest>>({});
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [pendingWorkerId, setPendingWorkerId] = useState<string | undefined>(undefined);
  const [pendingWorkerName, setPendingWorkerName] = useState<string | undefined>(undefined);
  const [interestResponses, setInterestResponses] = useState<EmergencyShiftResponse[]>([]);
  const [loadingInterest, setLoadingInterest] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadInterest = useCallback(async () => {
    if (!api || !current.isEmergency) return;
    setLoadingInterest(true);
    try {
      const res = await api.jobs.listEmergencyResponses({ jobId: current.jobId });
      setInterestResponses(res.responses);
    } catch {
      /* silent */
    } finally {
      setLoadingInterest(false);
    }
  }, [api, current.isEmergency, current.jobId]);

  useEffect(() => { loadInterest(); }, [loadInterest]);

  const canEdit = current.status === "Draft" || current.status === "Open";
  const canCancel = current.status === "Draft" || current.status === "Open";

  const shareUrl = `${window.location.origin}/jobs/share/${current.jobId}`;
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: current.jobTitle ?? `Support Worker – ${current.location}`,
          text: `Job opportunity at ${current.location}. Apply on KIZAZIHIRE.`,
          url: shareUrl,
        });
        return;
      } catch { /* user dismissed or not supported */ }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const el = document.createElement("textarea");
      el.value = shareUrl;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = () => {
    setForm({
      location: current.location,
      shiftDate: current.shiftDate ? toDateStr(current.shiftDate) : undefined,
      shiftStartTime: current.shiftStartTime ?? undefined,
      shiftDurationHours: current.shiftDurationHours ?? undefined,
      supportTypeTags: [...current.supportTypeTags],
      clientNotes: current.clientNotes ?? "",
      genderPreference: current.genderPreference ?? undefined,
      ageRangePreference: current.ageRangePreference ?? "",
      behaviouralConsiderations: current.behaviouralConsiderations ?? "",
      medicalRequirements: current.medicalRequirements ?? "",
      weekdayRate: current.weekdayRate,
      weekendRate: current.weekendRate,
      publicHolidayRate: current.publicHolidayRate,
      status: current.status,
    });
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await onUpdate({ ...form, jobId: current.jobId });
      setCurrent(updated);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update job request");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this job request?")) return;
    setCancelling(true);
    try {
      await onCancel(current.jobId);
      setCurrent((j) => ({ ...j, status: "Cancelled" }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to cancel job request");
    } finally {
      setCancelling(false);
    }
  };

  const toggleTag = (tag: string) => {
    const current = form.supportTypeTags ?? [];
    setForm((f) => ({
      ...f,
      supportTypeTags: current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    }));
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />Back to list
      </button>

      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-foreground">{current.location}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[current.status]}`}>{current.status}</span>
              {current.isEmergency && (
                <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-semibold">
                  <Zap className="h-3 w-3" />Emergency
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {current.jobType === "shift"
                ? <>{toDateStr(current.shiftDate)} &bull; {current.shiftStartTime} &bull; {current.shiftDurationHours}h</>
                : <span className="italic">General Job</span>}
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {current.status === "Open" && !editing && (
              <Button size="sm" variant="outline" onClick={handleShare}>
                {copied ? <CheckCheck className="h-3.5 w-3.5 mr-1 text-green-500" /> : <Share2 className="h-3.5 w-3.5 mr-1" />}
                {copied ? "Copied!" : "Share"}
              </Button>
            )}
            {canEdit && !editing && (
              <Button size="sm" variant="outline" onClick={startEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" />Edit
              </Button>
            )}
            {onSendOffer && current.status === "Open" && !editing && (
              <Button size="sm" onClick={() => setOfferModalOpen(true)}>
                <Send className="h-3.5 w-3.5 mr-1" />Send Offer
              </Button>
            )}
            {canCancel && !editing && (
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel Job"}
              </Button>
            )}
            {editing && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}><X className="h-3.5 w-3.5 mr-1" />Discard</Button>
                <Button size="sm" onClick={save} disabled={saving}><Check className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}</Button>
              </>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <DetailField label="Weekday Rate" value={`$${current.weekdayRate}/hr`} />
              <DetailField label="Weekend Rate" value={`$${current.weekendRate}/hr`} />
              <DetailField label="Public Holiday Rate" value={`$${current.publicHolidayRate}/hr`} />
              <DetailField label="Gender Preference" value={current.genderPreference} />
              <DetailField label="Age Range" value={current.ageRangePreference} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Support Type Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {current.supportTypeTags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
              </div>
            </div>
            {current.clientNotes && <DetailField label="Client Notes" value={current.clientNotes} />}
            {current.behaviouralConsiderations && <DetailField label="Behavioural Considerations" value={current.behaviouralConsiderations} />}
            {current.medicalRequirements && <DetailField label="Medical Requirements" value={current.medicalRequirements} />}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Location *" value={form.location ?? ""} onChange={(v) => setForm((f) => ({ ...f, location: v }))} />
              <FormField label="Shift Date *" type="date" value={toDateStr(form.shiftDate)} onChange={(v) => setForm((f) => ({ ...f, shiftDate: v }))} />
              <FormField label="Shift Start Time *" type="time" value={form.shiftStartTime ?? ""} onChange={(v) => setForm((f) => ({ ...f, shiftStartTime: v }))} />
              <div className="space-y-1">
                <Label className="text-xs">Duration (hours) *</Label>
                <Input type="number" min={0.5} max={24} step={0.5} value={form.shiftDurationHours ?? ""} onChange={(e) => setForm((f) => ({ ...f, shiftDurationHours: parseFloat(e.target.value) || undefined }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Weekday Rate</Label>
                <Input type="number" min={0} step={0.01} value={form.weekdayRate ?? ""} onChange={(e) => setForm((f) => ({ ...f, weekdayRate: parseFloat(e.target.value) || undefined }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Weekend Rate</Label>
                <Input type="number" min={0} step={0.01} value={form.weekendRate ?? ""} onChange={(e) => setForm((f) => ({ ...f, weekendRate: parseFloat(e.target.value) || undefined }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Public Holiday Rate</Label>
                <Input type="number" min={0} step={0.01} value={form.publicHolidayRate ?? ""} onChange={(e) => setForm((f) => ({ ...f, publicHolidayRate: parseFloat(e.target.value) || undefined }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.status ?? current.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as JobRequest["status"] }))}
                >
                  <option value="Draft">Draft</option>
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Support Type Tags *</Label>
              <div className="flex flex-wrap gap-1.5">
                {SUPPORT_TYPE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-0.5 rounded text-xs border transition-colors ${
                      (form.supportTypeTags ?? []).includes(tag)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Client Notes</Label>
                <textarea rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" value={form.clientNotes ?? ""} onChange={(e) => setForm((f) => ({ ...f, clientNotes: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Behavioural Considerations</Label>
                <textarea rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" value={form.behaviouralConsiderations ?? ""} onChange={(e) => setForm((f) => ({ ...f, behaviouralConsiderations: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Medical Requirements</Label>
                <textarea rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" value={form.medicalRequirements ?? ""} onChange={(e) => setForm((f) => ({ ...f, medicalRequirements: e.target.value }))} />
              </div>
            </div>
          </div>
        )}
      </Card>
      {onSendOffer && (
        <SendOfferModal
          open={offerModalOpen}
          onClose={() => { setOfferModalOpen(false); setPendingWorkerId(undefined); setPendingWorkerName(undefined); }}
          jobId={current.jobId}
          defaultRate={current.weekdayRate}
          prefilledWorkerId={pendingWorkerId}
          prefilledWorkerName={pendingWorkerName}
          onSend={onSendOffer}
        />
      )}

      {current.status === "Open" && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Matched Workers</p>
          </div>
          <MatchedWorkersList
            jobId={current.jobId}
            jobRate={current.weekdayRate}
            onSendOffer={onSendOffer ? (wId, wName) => { setPendingWorkerId(wId); setPendingWorkerName(wName); setOfferModalOpen(true); } : undefined}
          />
        </Card>
      )}

      {current.isEmergency && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-400" />
            <p className="text-sm font-semibold text-foreground">Worker Interest Responses</p>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {interestResponses.length}
            </span>
            <button onClick={loadInterest} className="ml-auto text-xs text-primary hover:underline" disabled={loadingInterest}>
              {loadingInterest ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
            </button>
          </div>
          {current.responseDeadline && (
            <p className="text-xs text-muted-foreground">
              Response deadline: {new Date(current.responseDeadline).toLocaleString()}
            </p>
          )}
          {interestResponses.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No workers have expressed interest yet.</p>
          ) : (
            <div className="space-y-2">
              {interestResponses.map((r) => (
                <div key={r.responseId} className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.workerName}</p>
                    {r.note && <p className="text-xs text-muted-foreground mt-0.5">{r.note}</p>}
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {new Date(r.createdAt).toLocaleString()} &bull; ID: {r.workerId.slice(0, 8)}…
                    </p>
                  </div>
                  {onSendOffer && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-7 text-xs"
                      onClick={() => {
                        setOfferModalOpen(true);
                      }}
                    >
                      <Send className="h-3 w-3 mr-1" />Offer
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || <span className="italic text-muted-foreground">Not set</span>}</p>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}
