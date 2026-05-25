import { useState, useEffect, useCallback } from "react";
import {
  Loader2, RefreshCw, Mail, Phone, Clock, MessageSquare,
  ChevronDown, Send, X, CheckCircle, AlertCircle, StickyNote,
  CalendarClock, Building2, GraduationCap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { RtoEnquiry, EnquiryStatus } from "~backend/admin/rto_enquiries";

const STATUS_CONFIG: Record<EnquiryStatus, { label: string; color: string; bg: string }> = {
  new:            { label: "New",            color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  contacted:      { label: "Contacted",      color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  qualified:      { label: "Qualified",      color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  onboarding:     { label: "Onboarding",     color: "text-teal-700",   bg: "bg-teal-50 border-teal-200" },
  partner:        { label: "Partner",        color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  not_interested: { label: "Not interested", color: "text-gray-500",   bg: "bg-gray-50 border-gray-200" },
};

const FUNNEL_ORDER: EnquiryStatus[] = ["new", "contacted", "qualified", "onboarding", "partner", "not_interested"];

const EMAIL_TEMPLATES: { label: string; subject: string; body: string }[] = [
  {
    label: "Initial welcome",
    subject: "Welcome — KIZAZI Hire RTO Partner Programme",
    body: `<p>Hi {FirstName},</p>
<p>Thanks for reaching out about the KIZAZI Hire RTO Partner Programme — we're excited to connect!</p>
<p>I'd love to set up a quick 15-minute call to walk you through how we can help {OrgName}'s students find placement and paid employment in the disability support sector.</p>
<p>Could you let me know your availability this week or next?</p>
<p>Looking forward to hearing from you.</p>
<p>Warm regards,<br/>The KIZAZI Hire Team</p>`,
  },
  {
    label: "Follow-up",
    subject: "Following up — KIZAZI Hire RTO Partnership",
    body: `<p>Hi {FirstName},</p>
<p>I just wanted to follow up on my previous message about the RTO Partner Programme for {OrgName}.</p>
<p>We work with RTOs across Australia to help their students get verified and matched with NDIS employers — at no cost to you or your students.</p>
<p>Happy to answer any questions or jump on a quick call at your convenience.</p>
<p>Best,<br/>The KIZAZI Hire Team</p>`,
  },
  {
    label: "Onboarding next steps",
    subject: "Your RTO Partner onboarding — next steps",
    body: `<p>Hi {FirstName},</p>
<p>Great news — we're ready to set up your dedicated student landing page for {OrgName}!</p>
<p>Once live, you'll have a unique referral link to share with your students. We'll track their progress and send you regular updates on how they're going.</p>
<p>To get started, please reply with:</p>
<ul>
  <li>Your preferred URL slug (e.g. kizazihire.com.au/rto/your-rto-name)</li>
  <li>Your organisation logo (optional)</li>
  <li>Any specific courses you'd like us to highlight</li>
</ul>
<p>We'll have you live within 24 hours.</p>
<p>Cheers,<br/>The KIZAZI Hire Team</p>`,
  },
];

function StatusBadge({ status }: { status: EnquiryStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function FunnelBar({ enquiries }: { enquiries: RtoEnquiry[] }) {
  const counts = FUNNEL_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = enquiries.filter((e) => e.status === s).length;
    return acc;
  }, {});
  const total = enquiries.length;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
      {FUNNEL_ORDER.map((s) => {
        const cfg = STATUS_CONFIG[s];
        const count = counts[s] ?? 0;
        return (
          <div key={s} className={`rounded-xl border px-3 py-2 text-center ${cfg.bg}`}>
            <div className={`text-2xl font-bold tabular-nums ${cfg.color}`}>{count}</div>
            <div className={`text-xs font-medium mt-0.5 ${cfg.color} opacity-80`}>{cfg.label}</div>
            {total > 0 && (
              <div className={`text-xs mt-1 ${cfg.color} opacity-60`}>
                {Math.round((count / total) * 100)}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface EmailPanelProps {
  enquiry: RtoEnquiry;
  onClose: () => void;
  onSent: (updated: RtoEnquiry) => void;
}

function EmailPanel({ enquiry, onClose, onSent }: EmailPanelProps) {
  const api = useAuthedBackend();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const applyTemplate = (t: { subject: string; body: string }) => {
    setSubject(t.subject);
    setBody(t.body);
  };

  const handleSend = async () => {
    if (!api) return;
    if (!subject.trim() || !body.trim()) {
      setError("Subject and body are required.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await api.admin.adminSendRtoEnquiryEmail({
        enquiryId: enquiry.enquiryId,
        subject: subject.trim(),
        htmlBody: body.trim(),
      });
      const updated = await api.admin.adminUpdateRtoEnquiry({
        enquiryId: enquiry.enquiryId,
        status: enquiry.status === "new" ? "contacted" : enquiry.status,
      });
      setSent(true);
      setTimeout(() => { onSent(updated); onClose(); }, 1200);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-5 space-y-4 border-teal-200 bg-teal-50/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Send className="h-4 w-4 text-teal-600" />
          Email {enquiry.name} ({enquiry.email})
        </p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {EMAIL_TEMPLATES.map((t) => (
          <button
            key={t.label}
            onClick={() => applyTemplate(t)}
            className="text-xs px-2.5 py-1 rounded-lg border border-teal-300 text-teal-700 bg-white hover:bg-teal-50 transition-colors"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Subject</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="h-8 text-sm"
          placeholder="Email subject"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Body (HTML — use {"{FirstName}"} and {"{OrgName}"})</Label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 resize-y"
          placeholder="<p>Hi {FirstName},</p>..."
        />
      </div>

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />{error}
        </p>
      )}

      {sent && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="h-3.5 w-3.5" />Email sent!
        </p>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || sent}
          className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
          Send Email
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-8 text-xs">
          Cancel
        </Button>
      </div>
    </Card>
  );
}

interface NotesPanelProps {
  enquiry: RtoEnquiry;
  onClose: () => void;
  onSaved: (updated: RtoEnquiry) => void;
}

function NotesPanel({ enquiry, onClose, onSaved }: NotesPanelProps) {
  const api = useAuthedBackend();
  const [notes, setNotes] = useState(enquiry.notes ?? "");
  const [assignedTo, setAssignedTo] = useState(enquiry.assignedTo ?? "");
  const [followUpAt, setFollowUpAt] = useState(enquiry.followUpAt ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!api) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.admin.adminUpdateRtoEnquiry({
        enquiryId: enquiry.enquiryId,
        notes: notes || undefined,
        assignedTo: assignedTo || undefined,
        followUpAt: followUpAt || undefined,
      });
      onSaved(updated);
      onClose();
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 space-y-3 border-amber-200 bg-amber-50/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-600" />
          Notes & Follow-up
        </p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Assigned to</Label>
          <Input
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="h-8 text-sm"
            placeholder="Team member name"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Follow-up date</Label>
          <Input
            type="date"
            value={followUpAt}
            onChange={(e) => setFollowUpAt(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Internal notes</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
            placeholder="Context, outcomes, next steps..."
          />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-8 text-xs">
          Cancel
        </Button>
      </div>
    </Card>
  );
}

interface EnquiryCardProps {
  enquiry: RtoEnquiry;
  onChange: (updated: RtoEnquiry) => void;
}

function EnquiryCard({ enquiry, onChange }: EnquiryCardProps) {
  const api = useAuthedBackend();
  const [expanded, setExpanded] = useState(false);
  const [panel, setPanel] = useState<"email" | "notes" | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusChange = async (status: EnquiryStatus) => {
    if (!api) return;
    setUpdatingStatus(true);
    try {
      const updated = await api.admin.adminUpdateRtoEnquiry({ enquiryId: enquiry.enquiryId, status });
      onChange(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openPanel = (p: "email" | "notes") => {
    setPanel((prev) => (prev === p ? null : p));
    setExpanded(true);
  };

  return (
    <Card className={`overflow-hidden transition-all ${enquiry.status === "not_interested" ? "opacity-60" : ""}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 text-teal-700 font-bold text-sm">
            {enquiry.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{enquiry.name}</p>
              <StatusBadge status={enquiry.status} />
              {enquiry.followUpAt && (
                <span className="text-xs text-amber-600 flex items-center gap-0.5">
                  <CalendarClock className="h-3 w-3" />
                  Follow-up {enquiry.followUpAt}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />{enquiry.organisationName}
              </span>
              <a href={`mailto:${enquiry.email}`} className="flex items-center gap-1 hover:text-foreground">
                <Mail className="h-3 w-3" />{enquiry.email}
              </a>
              {enquiry.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />{enquiry.phone}
                </span>
              )}
              {enquiry.rtoSlug && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />via /rto/{enquiry.rtoSlug}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(enquiry.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              {enquiry.lastContactedAt && (
                <span className="flex items-center gap-1 text-teal-600">
                  <CheckCircle className="h-3 w-3" />
                  Contacted {new Date(enquiry.lastContactedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>

            {enquiry.assignedTo && (
              <p className="text-xs text-muted-foreground mt-0.5">Assigned: {enquiry.assignedTo}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => openPanel("email")}
              className={`p-2 rounded-lg border text-xs transition-colors ${panel === "email" ? "bg-teal-100 border-teal-300 text-teal-700" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              title="Send email"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => openPanel("notes")}
              className={`p-2 rounded-lg border text-xs transition-colors ${panel === "notes" ? "bg-amber-100 border-amber-300 text-amber-700" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              title="Notes & follow-up"
            >
              <StickyNote className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Show message"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded && panel === null ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {FUNNEL_ORDER.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const active = enquiry.status === s;
            return (
              <button
                key={s}
                onClick={() => !active && handleStatusChange(s)}
                disabled={updatingStatus || active}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  active
                    ? `${cfg.bg} ${cfg.color} cursor-default`
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {(expanded || panel !== null) && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          {panel === "email" && (
            <EmailPanel
              enquiry={enquiry}
              onClose={() => setPanel(null)}
              onSent={onChange}
            />
          )}
          {panel === "notes" && (
            <NotesPanel
              enquiry={enquiry}
              onClose={() => setPanel(null)}
              onSaved={onChange}
            />
          )}
          {panel === null && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 border border-border">
                {enquiry.message}
              </p>
              {enquiry.notes && (
                <>
                  <p className="text-xs font-medium text-muted-foreground mt-3 mb-1.5 flex items-center gap-1">
                    <StickyNote className="h-3.5 w-3.5" />
                    Internal notes
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap bg-amber-50 rounded-lg p-3 border border-amber-200">
                    {enquiry.notes}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function RtoEnquiriesTab() {
  const api = useAuthedBackend();
  const [enquiries, setEnquiries] = useState<RtoEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | "all">("all");

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.admin.adminListRtoEnquiries({ status: statusFilter });
      setEnquiries(res.enquiries);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (updated: RtoEnquiry) => {
    setEnquiries((prev) => prev.map((e) => e.enquiryId === updated.enquiryId ? updated : e));
  };

  const displayed = statusFilter === "all"
    ? enquiries
    : enquiries.filter((e) => e.status === statusFilter);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-bold text-foreground">RTO Enquiry Funnel</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage inbound RTO partner enquiries from initial contact through to onboarding.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>

      {enquiries.length > 0 && <FunnelBar enquiries={enquiries} />}

      <div className="flex gap-1.5 flex-wrap">
        {(["all", ...FUNNEL_ORDER] as (EnquiryStatus | "all")[]).map((s) => {
          const cfg = s !== "all" ? STATUS_CONFIG[s] : null;
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-colors ${
                active
                  ? cfg
                    ? `${cfg.bg} ${cfg.color}`
                    : "bg-foreground/10 border-foreground/20 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {s === "all" ? `All (${enquiries.length})` : STATUS_CONFIG[s].label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {statusFilter === "all"
              ? "No enquiries yet. They'll appear here when RTOs submit the contact form."
              : `No enquiries with status "${STATUS_CONFIG[statusFilter as EnquiryStatus]?.label}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((e) => (
            <EnquiryCard key={e.enquiryId} enquiry={e} onChange={handleChange} />
          ))}
        </div>
      )}
    </div>
  );
}
