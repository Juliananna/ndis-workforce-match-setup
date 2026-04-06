import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Mail, Plus, Edit2, Trash2, Send, Users, FileText,
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, X,
  ImagePlus, Copy, Check, ChevronDown, ChevronUp, MessageCircle, Phone,
} from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { EmailTemplate, EmailLogEntry } from "~backend/admin/email_comms";
import type { WhatsAppLogEntry } from "~backend/admin/whatsapp_comms";
import { RichEmailEditor } from "./RichEmailEditor";
import { useProxyUpload } from "../../hooks/useProxyUpload";

type CommsTab = "templates" | "send" | "log" | "whatsapp";

const CATEGORIES = ["general", "onboarding", "compliance", "billing", "marketing", "system"];

function htmlToPlainPreview(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) + "…";
}

function buildDefaultHtml(subject: string): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a1a;">${subject}</h2>
  <p style="color: #555; font-size: 15px;">Hello,</p>
  <p style="color: #555; font-size: 15px;">Your message here.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="color: #999; font-size: 12px;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
</div>`;
}

interface TemplateFormProps {
  initial?: EmailTemplate | null;
  onSave: (data: { name: string; description: string; subject: string; htmlBody: string; category: string }) => Promise<void>;
  onCancel: () => void;
}

function TemplateForm({ initial, onSave, onCancel }: TemplateFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [htmlBody, setHtmlBody] = useState(initial?.htmlBody ?? "");
  const [category, setCategory] = useState(initial?.category ?? "general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubjectChange = (v: string) => {
    setSubject(v);
    if (!initial && !htmlBody) setHtmlBody(buildDefaultHtml(v));
  };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !htmlBody.trim()) {
      setError("Name, subject, and HTML body are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name, description, subject, htmlBody, category });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />{initial ? "Cancel edit" : "Back"}
        </button>
        <h3 className="text-sm font-semibold text-foreground">{initial ? "Edit Template" : "New Template"}</h3>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Template Name *</Label>
          <Input className="h-8 text-sm" placeholder="Welcome Email" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring capitalize">
            {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input className="h-8 text-sm" placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Subject Line *</Label>
        <Input className="h-8 text-sm" placeholder="Welcome to Kizazi Hire" value={subject} onChange={(e) => handleSubjectChange(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Email Body *</Label>
        <RichEmailEditor value={htmlBody} onChange={setHtmlBody} rows={12} />
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
          {initial ? "Save Changes" : "Create Template"}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function TemplatesPanel({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null | "new">(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.admin.adminListEmailTemplates();
      setTemplates(res.templates);
    } catch (e: unknown) { console.error(e); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: Parameters<typeof TemplateForm>[0]["onSave"] extends (d: infer D) => unknown ? D : never) => {
    if (!api) return;
    const t = await api.admin.adminCreateEmailTemplate(data);
    setTemplates((prev) => [t, ...prev]);
    setEditing(null);
  };

  const handleUpdate = async (data: Parameters<typeof TemplateForm>[0]["onSave"] extends (d: infer D) => unknown ? D : never) => {
    if (!api || !editing || editing === "new") return;
    const t = await api.admin.adminUpdateEmailTemplate({ id: (editing as EmailTemplate).id, ...data });
    setTemplates((prev) => prev.map((x) => x.id === t.id ? t : x));
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!api) return;
    setDeleting(id);
    try {
      await api.admin.adminDeleteEmailTemplate({ id });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e: unknown) { console.error(e); }
    finally { setDeleting(null); }
  };

  if (editing !== null) {
    return (
      <TemplateForm
        initial={editing === "new" ? null : editing}
        onSave={editing === "new" ? handleCreate : handleUpdate}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{templates.length} templates</span>
        <Button size="sm" className="h-8 text-xs" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5 mr-1" />New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-8">No templates yet. Create one to get started.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <Badge className="text-xs bg-muted text-muted-foreground border-transparent capitalize">{t.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.subject}</p>
                  {t.description && <p className="text-xs text-muted-foreground/60 mt-0.5">{t.description}</p>}
                  <p className="text-xs text-muted-foreground/40 mt-1">{htmlToPlainPreview(t.htmlBody)}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(t)}>
                    <Edit2 className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30" disabled={deleting === t.id} onClick={() => handleDelete(t.id)}>
                    {deleting === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type SendTarget = "single" | "bulk";

function SendPanel({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [sendTarget, setSendTarget] = useState<SendTarget>("single");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [targetRole, setTargetRole] = useState<string>("all");
  const [category, setCategory] = useState("general");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<Array<{ userId: string; email: string; name: string; role: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [locationContains, setLocationContains] = useState("");
  const [lastLoginDays, setLastLoginDays] = useState("");
  const [registeredWithinDays, setRegisteredWithinDays] = useState("");
  const [workerHasDocuments, setWorkerHasDocuments] = useState("");
  const [workerHasSkills, setWorkerHasSkills] = useState("");
  const [workerHasBio, setWorkerHasBio] = useState("");
  const [employerSubStatus, setEmployerSubStatus] = useState("");

  useEffect(() => {
    if (!api) return;
    api.admin.adminListEmailTemplates().then((res) => setTemplates(res.templates)).catch(console.error);
  }, [api]);

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setSubject(t.subject);
      setHtmlBody(t.htmlBody);
      setCategory(t.category);
    }
  };

  const handleUserSearch = async () => {
    if (!api || !userSearch.trim()) return;
    setSearching(true);
    try {
      const res = await api.admin.adminListUsers();
      const q = userSearch.toLowerCase();
      setUserResults(
        res.users
          .filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
          .slice(0, 8)
          .map((u) => ({ userId: u.userId, email: u.email, name: u.name, role: u.role }))
      );
    } catch (e: unknown) { console.error(e); }
    finally { setSearching(false); }
  };

  const handleSend = async () => {
    if (!subject.trim() || !htmlBody.trim()) { setError("Subject and HTML body are required"); return; }
    if (sendTarget === "single" && !userId) { setError("Please select a recipient user"); return; }
    setSending(true);
    setError(null);
    setResult(null);
    try {
      if (sendTarget === "single") {
        const res = await api!.admin.adminSendEmailToUser({
          userId, templateId: selectedTemplate || undefined,
          subject, htmlBody, category,
        });
        setResult(res);
      } else {
        const res = await api!.admin.adminSendBulkEmail({
          templateId: selectedTemplate || undefined,
          subject, htmlBody,
          targetRole: targetRole as "WORKER" | "EMPLOYER" | "all",
          category,
          locationContains: locationContains.trim() || undefined,
          lastLoginDays: lastLoginDays ? parseInt(lastLoginDays) : undefined,
          registeredWithinDays: registeredWithinDays ? parseInt(registeredWithinDays) : undefined,
          workerHasDocuments: workerHasDocuments === "" ? undefined : workerHasDocuments === "yes",
          workerHasSkills: workerHasSkills === "" ? undefined : workerHasSkills === "yes",
          workerHasBio: workerHasBio === "" ? undefined : workerHasBio === "yes",
          employerSubscriptionStatus: (employerSubStatus || undefined) as "none" | "active" | "cancelled" | "expired" | "any" | undefined,
        });
        setResult(res);
      }
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Send failed");
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit">
        <button onClick={() => setSendTarget("single")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${sendTarget === "single" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          Single User
        </button>
        <button onClick={() => setSendTarget("bulk")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${sendTarget === "bulk" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          Bulk Send
        </button>
      </div>

      {result && (
        <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-md p-3">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Successfully sent to {result.sent} recipient{result.sent !== 1 ? "s" : ""}.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Use Template (optional)</Label>
        <select value={selectedTemplate} onChange={(e) => handleTemplateSelect(e.target.value)}
          className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="">— Compose manually —</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {sendTarget === "single" ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Recipient User *</Label>
          <div className="flex gap-2">
            <Input className="h-8 text-sm flex-1" placeholder="Search by name or email…"
              value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUserSearch()} />
            <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={handleUserSearch} disabled={searching}>
              {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
            </Button>
          </div>
          {userResults.length > 0 && (
            <div className="border border-border rounded-md overflow-hidden">
              {userResults.map((u) => (
                <button key={u.userId} onClick={() => { setUserId(u.userId); setUserEmail(u.email); setUserResults([]); setUserSearch(u.email); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between ${userId === u.userId ? "bg-primary/10" : ""}`}>
                  <span className="font-medium text-foreground">{u.name}</span>
                  <span className="text-xs text-muted-foreground">{u.email} · {u.role}</span>
                </button>
              ))}
            </div>
          )}
          {userId && userEmail && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
              <Mail className="h-3.5 w-3.5" />Sending to: <span className="font-medium text-foreground">{userEmail}</span>
              <button onClick={() => { setUserId(""); setUserEmail(""); setUserSearch(""); }} className="ml-auto hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Target Audience *</Label>
            <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)}
              className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="all">All verified users (workers + employers)</option>
              <option value="WORKER">Workers only</option>
              <option value="EMPLOYER">Employers only</option>
            </select>
            <p className="text-xs text-muted-foreground/60">Only sends to verified, non-suspended accounts.</p>
          </div>

          <div className="border border-border rounded-lg p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Additional Filters</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Location contains</Label>
                <Input className="h-8 text-sm" placeholder="e.g. Melbourne" value={locationContains} onChange={(e) => setLocationContains(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last logged in within (days)</Label>
                <Input className="h-8 text-sm" type="number" min="1" placeholder="e.g. 30" value={lastLoginDays} onChange={(e) => setLastLoginDays(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Registered within (days)</Label>
                <Input className="h-8 text-sm" type="number" min="1" placeholder="e.g. 7" value={registeredWithinDays} onChange={(e) => setRegisteredWithinDays(e.target.value)} />
              </div>
            </div>

            {(targetRole === "WORKER" || targetRole === "all") && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Worker has documents</Label>
                  <select value={workerHasDocuments} onChange={(e) => setWorkerHasDocuments(e.target.value)}
                    className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">Any</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Worker has skills</Label>
                  <select value={workerHasSkills} onChange={(e) => setWorkerHasSkills(e.target.value)}
                    className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">Any</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Worker has bio</Label>
                  <select value={workerHasBio} onChange={(e) => setWorkerHasBio(e.target.value)}
                    className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">Any</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            )}

            {(targetRole === "EMPLOYER" || targetRole === "all") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Employer subscription status</Label>
                <select value={employerSubStatus} onChange={(e) => setEmployerSubStatus(e.target.value)}
                  className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Any</option>
                  <option value="none">None (free)</option>
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Subject Line *</Label>
          <Input className="h-8 text-sm" placeholder="Your subject here" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring capitalize">
            {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Email Body *</Label>
        <RichEmailEditor value={htmlBody} onChange={setHtmlBody} rows={10} />
      </div>

      <Button className="h-9 text-sm gap-2" onClick={handleSend} disabled={sending}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {sendTarget === "bulk" ? "Send Bulk Email" : "Send Email"}
      </Button>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-500/15 text-green-400 border-transparent",
  failed: "bg-red-500/15 text-red-400 border-transparent",
};

function LogPanel({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [entries, setEntries] = useState<EmailLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 50;

  const load = useCallback(async (p: number) => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.admin.adminListEmailLog({ limit, offset: p * limit });
      setEntries(res.entries);
      setTotal(res.total);
    } catch (e: unknown) { console.error(e); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(page); }, [load, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{total} emails logged</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">{page + 1} / {Math.max(1, totalPages)}</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-8">No emails sent yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate max-w-xs">{e.subject}</p>
                    <Badge className={`text-xs ${STATUS_COLORS[e.status] ?? "bg-muted text-muted-foreground border-transparent"}`}>{e.status}</Badge>
                    {e.isBulk && <Badge className="text-xs bg-blue-500/15 text-blue-400 border-transparent">Bulk · {e.bulkCount} recipients</Badge>}
                    <Badge className="text-xs bg-muted text-muted-foreground border-transparent capitalize">{e.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    To: {e.recipientName ? `${e.recipientName} <${e.recipientEmail}>` : e.recipientEmail}
                    {e.targetRole && e.targetRole !== "all" && ` · ${e.targetRole}s`}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    By {e.sentByEmail ?? "system"} · {new Date(e.sentAt).toLocaleString()}
                  </p>
                  {e.errorMessage && <p className="text-xs text-destructive mt-0.5">{e.errorMessage}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface UploadedImage {
  url: string;
  name: string;
  uploadedAt: Date;
}

function ImageUploadPanel() {
  const { uploadEmailImage } = useProxyUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { imageUrl } = await uploadEmailImage(file);
      setImages((prev) => [{ url: imageUrl, name: file.name, uploadedAt: new Date() }, ...prev]);
      setOpen(true);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium text-foreground"
      >
        <div className="flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-muted-foreground" />
          Image Upload
          {images.length > 0 && (
            <span className="text-xs text-muted-foreground">({images.length} uploaded this session)</span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-4 space-y-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Upload an image and copy its public URL to paste into your email HTML.
          </p>

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {uploading ? "Uploading…" : "Choose Image"}
            </Button>
            <span className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP</span>
          </div>

          {images.length > 0 && (
            <div className="space-y-2">
              {images.map((img) => (
                <div key={img.url} className="flex items-center gap-2 bg-muted/20 border border-border rounded-md p-2">
                  <img src={img.url} alt={img.name} className="h-10 w-10 object-cover rounded shrink-0 border border-border" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{img.name}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">{img.url}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(img.url)}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs rounded border border-border hover:bg-muted transition-colors"
                  >
                    {copiedUrl === img.url ? (
                      <><Check className="h-3 w-3 text-green-500" /><span className="text-green-500">Copied</span></>
                    ) : (
                      <><Copy className="h-3 w-3" />Copy URL</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type WhatsAppSendTarget = "single" | "bulk";

function WhatsAppPanel({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [sendTarget, setSendTarget] = useState<WhatsAppSendTarget>("single");
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<Array<{ userId: string; email: string; name: string; phone: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [targetRole, setTargetRole] = useState("all");
  const [locationContains, setLocationContains] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<WhatsAppLogEntry[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(0);
  const [logLoading, setLogLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"send" | "log">("send");
  const LOG_LIMIT = 50;

  const loadLog = useCallback(async (p: number) => {
    if (!api) return;
    setLogLoading(true);
    try {
      const res = await api.admin.adminListWhatsAppLog({ limit: LOG_LIMIT, offset: p * LOG_LIMIT });
      setLogEntries(res.entries);
      setLogTotal(res.total);
    } catch (e) { console.error(e); }
    finally { setLogLoading(false); }
  }, [api]);

  useEffect(() => { if (activeTab === "log") loadLog(logPage); }, [activeTab, logPage, loadLog]);

  const handleUserSearch = async () => {
    if (!api || !userSearch.trim()) return;
    setSearching(true);
    try {
      const res = await api.admin.adminListUsers();
      const q = userSearch.toLowerCase();
      setUserResults(
        res.users
          .filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
          .slice(0, 8)
          .map((u) => ({ userId: u.userId, email: u.email, name: u.name, phone: u.phone ?? "" }))
      );
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  };

  const handleSend = async () => {
    if (!message.trim()) { setError("Message is required"); return; }
    if (sendTarget === "single" && !userId) { setError("Please select a recipient"); return; }
    setSending(true);
    setError(null);
    setResult(null);
    try {
      if (sendTarget === "single") {
        const res = await api!.admin.adminSendWhatsAppToUser({ userId, message });
        setResult(res);
      } else {
        const res = await api!.admin.adminSendBulkWhatsApp({
          message,
          targetRole: targetRole as "WORKER" | "EMPLOYER" | "all",
          locationContains: locationContains.trim() || undefined,
        });
        setResult(res);
      }
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Send failed");
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {(["send", "log"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t ? "text-foreground border-b-2 border-primary -mb-px" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t === "send" ? <Send className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
            {t === "send" ? "Send Message" : "Sent Log"}
          </button>
        ))}
      </div>

      {activeTab === "send" && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit">
            <button onClick={() => setSendTarget("single")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${sendTarget === "single" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              Single User
            </button>
            <button onClick={() => setSendTarget("bulk")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${sendTarget === "bulk" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              Bulk Send
            </button>
          </div>

          {result && (
            <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-md p-3">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Successfully sent to {result.sent} recipient{result.sent !== 1 ? "s" : ""}.
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {sendTarget === "single" ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Recipient User *</Label>
              <div className="flex gap-2">
                <Input className="h-8 text-sm flex-1" placeholder="Search by name or email…"
                  value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUserSearch()} />
                <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={handleUserSearch} disabled={searching}>
                  {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
                </Button>
              </div>
              {userResults.length > 0 && (
                <div className="border border-border rounded-md overflow-hidden">
                  {userResults.map((u) => (
                    <button key={u.userId} onClick={() => {
                      setUserId(u.userId);
                      setUserPhone(u.phone);
                      setUserResults([]);
                      setUserSearch(u.email);
                    }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between ${userId === u.userId ? "bg-primary/10" : ""}`}>
                      <span className="font-medium text-foreground">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.email} · {u.phone || "no phone"}</span>
                    </button>
                  ))}
                </div>
              )}
              {userId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Sending to: <span className="font-medium text-foreground">{userPhone || "phone on file"}</span>
                  <button onClick={() => { setUserId(""); setUserPhone(""); setUserSearch(""); }} className="ml-auto hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Target Audience *</Label>
                <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="all">All users (workers + employers)</option>
                  <option value="WORKER">Workers only</option>
                  <option value="EMPLOYER">Employers only</option>
                </select>
                <p className="text-xs text-muted-foreground/60">Only sends to verified, non-suspended users with a phone number.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location contains (optional)</Label>
                <Input className="h-8 text-sm" placeholder="e.g. Melbourne" value={locationContains} onChange={(e) => setLocationContains(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Message *</Label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              rows={5}
              maxLength={1600}
              placeholder="Your WhatsApp message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground/60">{message.length}/1600 characters</p>
          </div>

          <Button className="h-9 text-sm gap-2" onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            {sendTarget === "bulk" ? "Send Bulk WhatsApp" : "Send WhatsApp"}
          </Button>
        </div>
      )}

      {activeTab === "log" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{logTotal} messages logged</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={logPage === 0} onClick={() => setLogPage((p) => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground">{logPage + 1} / {Math.max(1, Math.ceil(logTotal / LOG_LIMIT))}</span>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={logPage >= Math.ceil(logTotal / LOG_LIMIT) - 1} onClick={() => setLogPage((p) => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {logLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : logEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No WhatsApp messages sent yet.</p>
          ) : (
            <div className="space-y-2">
              {logEntries.map((e) => (
                <Card key={e.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{e.recipientName ?? e.phoneNumber}</p>
                        <Badge className={`text-xs ${e.status === "sent" ? "bg-green-500/15 text-green-400 border-transparent" : "bg-red-500/15 text-red-400 border-transparent"}`}>{e.status}</Badge>
                        {e.isBulk && <Badge className="text-xs bg-blue-500/15 text-blue-400 border-transparent">Bulk</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{e.phoneNumber}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-2">{e.message}</p>
                      <p className="text-xs text-muted-foreground/40 mt-0.5">{new Date(e.sentAt).toLocaleString()}</p>
                      {e.errorMessage && <p className="text-xs text-destructive mt-0.5">{e.errorMessage}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EmailCommsTab({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [tab, setTab] = useState<CommsTab>("templates");

  const tabs: { id: CommsTab; label: string; icon: React.ReactNode }[] = [
    { id: "templates", label: "Templates",  icon: <FileText className="h-3.5 w-3.5" /> },
    { id: "send",      label: "Send Email", icon: <Send className="h-3.5 w-3.5" /> },
    { id: "log",       label: "Email Log",  icon: <Mail className="h-3.5 w-3.5" /> },
    { id: "whatsapp",  label: "WhatsApp",   icon: <MessageCircle className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Communications</h2>
          <p className="text-xs text-muted-foreground">Manage templates and send emails or WhatsApp messages to users</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? "text-foreground border-b-2 border-primary -mb-px" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {(tab === "templates" || tab === "send") && <ImageUploadPanel />}
      {tab === "templates" && <TemplatesPanel api={api} />}
      {tab === "send"      && <SendPanel api={api} />}
      {tab === "log"       && <LogPanel api={api} />}
      {tab === "whatsapp"  && <WhatsAppPanel api={api} />}
    </div>
  );
}
