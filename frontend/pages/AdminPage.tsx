import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Users, FileText, CheckCircle, X, ChevronRight, ArrowLeft, AlertTriangle,
  PhoneCall, Clock, UserCheck, Eye, ClipboardList, TrendingUp, ShieldAlert, ShieldCheck,
  Trash2, Plus, BarChart3, Briefcase, Building2, DollarSign, MessageSquare, Zap,
  Mail, Search, ChevronDown, Activity, HelpCircle,
} from "lucide-react";
import { useAuthedBackend } from "../hooks/useAuthedBackend";
import { useAuth } from "../contexts/AuthContext";
import type { AdminWorkerSummary, AdminWorkerDocumentView, AdminReferenceView } from "~backend/admin/workers";
import type { ReferenceCheckResult, SubmitReferenceCheckRequest } from "~backend/admin/reference_check";
import type { AdminEmployerSummary } from "~backend/admin/employers";
import type { PlatformStats, AdminJobSummary } from "~backend/admin/platform";
import { DocumentPreviewModal, type PreviewDoc } from "../components/DocumentPreviewModal";
import { ProfileCompletionBar, workerItemLabels, employerItemLabels } from "../components/ProfileCompletionBar";
import { ReferenceCheckWizard } from "../components/admin/ReferenceCheckWizard";
import { EmailCommsTab } from "../components/admin/EmailCommsTab";
import { UserAccountsPanel } from "../components/UserAccountsPanel";
import { SupportTicketsTab } from "../components/admin/SupportTicketsTab";

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-500/15 text-yellow-400 border-transparent",
  Verified: "bg-green-500/15 text-green-400 border-transparent",
  Missing: "bg-red-500/15 text-red-400 border-transparent",
  "Expiring Soon": "bg-orange-500/15 text-orange-400 border-transparent",
};

const REF_STATUS_CFG: Record<string, { color: string; icon: React.ReactNode }> = {
  Pending:   { color: "bg-yellow-500/15 text-yellow-400 border-transparent", icon: <Clock className="h-3 w-3" /> },
  Contacted: { color: "bg-blue-500/15 text-blue-400 border-transparent",    icon: <PhoneCall className="h-3 w-3" /> },
  Verified:  { color: "bg-green-500/15 text-green-400 border-transparent",  icon: <CheckCircle className="h-3 w-3" /> },
  Declined:  { color: "bg-red-500/15 text-red-400 border-transparent",      icon: <X className="h-3 w-3" /> },
};

const RISK_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  HIGH_RISK:   { color: "bg-red-500/15 text-red-400 border-red-500/30",       label: "High Risk",    icon: "🔴" },
  CAUTION:     { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", label: "Caution",   icon: "🟡" },
  STRONG:      { color: "bg-green-500/15 text-green-400 border-green-500/30",  label: "Strong",      icon: "🟢" },
  EXCEPTIONAL: { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "Exceptional", icon: "🌟" },
};

const SUB_COLORS: Record<string, string> = {
  active:    "bg-green-500/15 text-green-400 border-transparent",
  none:      "bg-muted text-muted-foreground border-transparent",
  cancelled: "bg-red-500/15 text-red-400 border-transparent",
  expired:   "bg-orange-500/15 text-orange-400 border-transparent",
};

const JOB_STATUS_COLORS: Record<string, string> = {
  Open:      "bg-green-500/15 text-green-400 border-transparent",
  Draft:     "bg-yellow-500/15 text-yellow-400 border-transparent",
  Closed:    "bg-muted text-muted-foreground border-transparent",
  Cancelled: "bg-red-500/15 text-red-400 border-transparent",
};

type AdminTab = "overview" | "workers" | "employers" | "jobs" | "users" | "compliance" | "email" | "support" | "home";
type WorkerView = "list" | "worker";
type WorkerTab = "documents" | "references";

function fmtAud(cents: number) {
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color ?? "bg-primary/10"}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground mt-3">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
    </Card>
  );
}

export default function AdminPage({
  initialTab,
  onTabChange,
}: {
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
} = {}) {
  const api = useAuthedBackend();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true;
  const [adminTab, setAdminTab] = useState<AdminTab>(initialTab ?? "overview");

  useEffect(() => {
    if (initialTab && initialTab !== "home") {
      setAdminTab(initialTab as AdminTab);
    }
  }, [initialTab]);

  const handleTabChange = (t: AdminTab) => {
    setAdminTab(t);
    onTabChange?.(t);
  };

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview",    label: "Analytics",   icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "workers",     label: "Workers",     icon: <Users className="h-3.5 w-3.5" /> },
    { id: "employers",   label: "Employers",   icon: <Building2 className="h-3.5 w-3.5" /> },
    { id: "jobs",        label: "Jobs",        icon: <Briefcase className="h-3.5 w-3.5" /> },
    { id: "users",       label: "Users",       icon: <UserCheck className="h-3.5 w-3.5" /> },
    ...(isAdmin ? [{ id: "compliance" as AdminTab, label: "Compliance Officers", icon: <ShieldCheck className="h-3.5 w-3.5" /> }] : []),
    { id: "email" as AdminTab,    label: "Email Comms", icon: <Mail className="h-3.5 w-3.5" /> },
    { id: "support" as AdminTab,  label: "Support",     icon: <HelpCircle className="h-3.5 w-3.5" /> },
  ];

  const effectiveTab = adminTab === "home" ? "overview" : adminTab;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border overflow-x-auto pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              effectiveTab === t.id
                ? "text-foreground border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {effectiveTab === "overview"    && <OverviewTab api={api} />}
      {effectiveTab === "workers"     && <WorkersTab api={api} isAdmin={isAdmin} />}
      {effectiveTab === "employers"   && <EmployersTab api={api} />}
      {effectiveTab === "jobs"        && <JobsTab api={api} />}
      {effectiveTab === "users"       && <UserAccountsPanel />}
      {effectiveTab === "compliance"  && isAdmin && <ComplianceTab api={api} />}
      {effectiveTab === "email"       && <EmailCommsTab api={api} />}
      {effectiveTab === "support"     && <SupportTicketsTab api={api} />}
    </div>
  );
}

function OverviewTab({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api) return;
    api.admin.adminGetPlatformStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />Platform Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard icon={<Users className="h-4.5 w-4.5 text-blue-400" />} label="Total Workers" value={stats.totalWorkers} sub={`+${stats.newWorkersThisMonth} this month`} color="bg-blue-500/10" />
          <StatCard icon={<Building2 className="h-4.5 w-4.5 text-purple-400" />} label="Total Employers" value={stats.totalEmployers} sub={`+${stats.newEmployersThisMonth} this month`} color="bg-purple-500/10" />
          <StatCard icon={<DollarSign className="h-4.5 w-4.5 text-green-400" />} label="Active Subscriptions" value={stats.activeSubscriptions} sub={`${fmtAud(stats.totalRevenueAudCents)} ARR`} color="bg-green-500/10" />
          <StatCard icon={<FileText className="h-4.5 w-4.5 text-yellow-400" />} label="Pending Docs" value={stats.pendingDocuments} sub="Awaiting review" color="bg-yellow-500/10" />
          <StatCard icon={<Briefcase className="h-4.5 w-4.5 text-indigo-400" />} label="Active Jobs" value={stats.activeJobs} sub={`${stats.totalJobs} total`} color="bg-indigo-500/10" />
          <StatCard icon={<CheckCircle className="h-4.5 w-4.5 text-emerald-400" />} label="Accepted Offers" value={stats.acceptedOffers} sub={`${stats.totalOffers} total offers`} color="bg-emerald-500/10" />
          <StatCard icon={<MessageSquare className="h-4.5 w-4.5 text-cyan-400" />} label="Messages Sent" value={stats.totalMessages} color="bg-cyan-500/10" />
          <StatCard icon={<UserCheck className="h-4.5 w-4.5 text-rose-400" />} label="Unverified Users" value={stats.unverifiedUsers} sub="Email not confirmed" color="bg-rose-500/10" />
        </div>
      </div>
    </div>
  );
}

function WorkersTab({ api, isAdmin }: { api: ReturnType<typeof useAuthedBackend>; isAdmin: boolean }) {
  const { token } = useAuth();
  const [workers, setWorkers] = useState<AdminWorkerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<WorkerView>("list");
  const [tab, setTab] = useState<WorkerTab>("documents");
  const [selectedWorker, setSelectedWorker] = useState<AdminWorkerSummary | null>(null);
  const [documents, setDocuments] = useState<AdminWorkerDocumentView[]>([]);
  const [references, setReferences] = useState<AdminReferenceView[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [wizardRef, setWizardRef] = useState<AdminReferenceView | null>(null);
  const [existingChecks, setExistingChecks] = useState<Record<string, ReferenceCheckResult | null>>({});
  const [checksLoading, setChecksLoading] = useState<Record<string, boolean>>({});
  const [messageDocId, setMessageDocId] = useState<string | null>(null);
  const [messageDocLabel, setMessageDocLabel] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [messageSent, setMessageSent] = useState<string | null>(null);

  const loadWorkers = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.admin.adminListWorkers();
      setWorkers(res.workers);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load workers");
    } finally { setLoading(false); }
  }, [api]);

  const loadWorkerDocs = useCallback(async (workerId: string) => {
    if (!api) return;
    setDocsLoading(true);
    setDocuments([]);
    try {
      const res = await api.admin.adminGetWorkerDocuments({ workerId });
      setDocuments(res.documents);
    } finally { setDocsLoading(false); }
  }, [api]);

  const loadWorkerRefs = useCallback(async (workerId: string) => {
    if (!api) return;
    setRefsLoading(true);
    setReferences([]);
    setExistingChecks({});
    try {
      const res = await api.admin.adminGetWorkerReferences({ workerId });
      setReferences(res.references);
      for (const ref of res.references) loadRefCheck(ref.id);
    } finally { setRefsLoading(false); }
  }, [api]);

  const loadRefCheck = useCallback(async (refId: string) => {
    if (!api) return;
    setChecksLoading((prev) => ({ ...prev, [refId]: true }));
    try {
      const res = await api.admin.adminGetReferenceCheck({ referenceId: refId });
      setExistingChecks((prev) => ({ ...prev, [refId]: res.check }));
    } catch {
      setExistingChecks((prev) => ({ ...prev, [refId]: null }));
    } finally {
      setChecksLoading((prev) => ({ ...prev, [refId]: false }));
    }
  }, [api]);

  useEffect(() => { loadWorkers(); }, [loadWorkers]);

  const handleSelectWorker = (worker: AdminWorkerSummary) => {
    setSelectedWorker(worker);
    setView("worker");
    setTab("documents");
    setError(null);
    loadWorkerDocs(worker.workerId);
    loadWorkerRefs(worker.workerId);
  };

  const handleGetDownloadUrl = async (docId: string): Promise<string> => {
    if (!api) throw new Error("Not authenticated");
    const { downloadUrl } = await api.admin.adminGetDocumentDownloadUrl({ documentId: docId });
    return downloadUrl;
  };

  const handleVerify = async (docId: string) => {
    if (!api) return;
    setVerifying(docId);
    setError(null);
    try {
      const res = await api.admin.adminVerifyDocument({ documentId: docId, action: "verify" });
      setDocuments((prev) => prev.map((d) => d.id === docId ? { ...d, verificationStatus: res.verificationStatus, verifiedAt: res.verifiedAt, rejectionReason: null } : d));
      setPreviewDoc((prev) => prev && prev.id === docId ? { ...prev, verificationStatus: res.verificationStatus, verifiedAt: res.verifiedAt, rejectionReason: null } : prev);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Verify failed");
    } finally { setVerifying(null); }
  };

  const handleReject = async (docId: string) => {
    if (!api || !rejectReason.trim()) { setError("Rejection reason is required"); return; }
    setVerifying(docId);
    setError(null);
    try {
      const res = await api.admin.adminVerifyDocument({ documentId: docId, action: "reject", rejectionReason: rejectReason });
      setDocuments((prev) => prev.map((d) => d.id === docId ? { ...d, verificationStatus: res.verificationStatus, rejectionReason: res.rejectionReason } : d));
      setPreviewDoc((prev) => prev && prev.id === docId ? { ...prev, verificationStatus: res.verificationStatus, rejectionReason: res.rejectionReason } : prev);
      setRejectId(null);
      setRejectReason("");
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally { setVerifying(null); }
  };

  const handleOpenMessage = (docId: string, docLabel: string) => {
    setMessageDocId(docId);
    setMessageDocLabel(docLabel);
    setMessageText("");
    setMessageSent(null);
    setError(null);
  };

  const handleSendMessage = async () => {
    if (!token || !selectedWorker || !messageDocId || !messageText.trim()) return;
    setMessageSending(true);
    setError(null);
    try {
      const apiBase = (import.meta.env.VITE_CLIENT_TARGET as string) ?? "http://localhost:4000";
      const resp = await fetch(
        `${apiBase}/admin/workers/${selectedWorker.workerId}/documents/${messageDocId}/message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ workerId: selectedWorker.workerId, documentId: messageDocId, message: messageText.trim() }),
        }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: "Failed to send message" }));
        throw new Error(err.message ?? "Failed to send message");
      }
      setMessageSent(messageDocId);
      setMessageText("");
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setMessageSending(false);
    }
  };

  const handleSubmitRefCheck = async (req: SubmitReferenceCheckRequest): Promise<ReferenceCheckResult> => {
    if (!api) throw new Error("Not authenticated");
    const result = await api.admin.adminSubmitReferenceCheck(req);
    setExistingChecks((prev) => ({ ...prev, [req.referenceId]: result }));
    setReferences((prev) => prev.map((r) => r.id === req.referenceId ? { ...r, status: "Verified" } : r));
    return result;
  };

  const filtered = workers.filter(
    (w) => !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.email.toLowerCase().includes(search.toLowerCase())
  );

  if (view === "worker" && selectedWorker) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setView("list"); setSelectedWorker(null); setDocuments([]); setReferences([]); }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />Back to workers
        </button>

        <Card className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-foreground">{selectedWorker.name}</p>
              <p className="text-sm text-muted-foreground">{selectedWorker.email}</p>
              <p className="text-xs text-muted-foreground">{selectedWorker.phone}{selectedWorker.location ? ` · ${selectedWorker.location}` : ""}</p>
            </div>
            <Badge className={selectedWorker.isVerified ? "bg-green-500/15 text-green-400 border-transparent" : "bg-muted text-muted-foreground border-transparent"}>
              {selectedWorker.isVerified ? "Email verified" : "Unverified"}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Profile completion</p>
            <ProfileCompletionBar
              pct={selectedWorker.profileCompletionPct}
              items={selectedWorker.profileCompletionItems}
              itemLabels={workerItemLabels()}
            />
          </div>
        </Card>

        <div className="flex gap-1 border-b border-border">
          {(["documents", "references"] as WorkerTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 capitalize ${
                tab === t ? "text-foreground border-b-2 border-primary -mb-px" : "text-muted-foreground hover:text-foreground"
              }`}>
              {t === "documents" ? <FileText className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
              {t}
              {t === "documents" && documents.filter((d) => d.verificationStatus === "Pending").length > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">
                  {documents.filter((d) => d.verificationStatus === "Pending").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && <div className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}

        {tab === "documents" && (
          <div className="space-y-2">
            {docsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="h-4 w-4 animate-spin" />Loading documents…</div>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center">No documents uploaded.</p>
            ) : (
              documents.map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{doc.documentType}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge className={`text-xs ${STATUS_COLORS[doc.verificationStatus] ?? "bg-muted text-muted-foreground border-transparent"}`}>{doc.verificationStatus}</Badge>
                        <span className="text-xs text-muted-foreground">Uploaded {new Date(doc.uploadDate).toLocaleDateString()}</span>
                        {doc.expiryDate && <span className="text-xs text-muted-foreground">· Expires {new Date(doc.expiryDate).toLocaleDateString()}</span>}
                      </div>
                      {doc.rejectionReason && <p className="text-xs text-destructive mt-1">Reason: {doc.rejectionReason}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0 flex-wrap">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setPreviewDoc(doc as PreviewDoc); setPreviewOpen(true); setRejectId(null); setRejectReason(""); }}>
                        <Eye className="h-3 w-3 mr-1" />View
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setRejectId(null); handleOpenMessage(doc.id, doc.documentType); }}>
                        <MessageSquare className="h-3 w-3 mr-1" />Message
                      </Button>
                      {doc.verificationStatus !== "Verified" && (
                        <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" disabled={verifying === doc.id} onClick={() => handleVerify(doc.id)}>
                          {verifying === doc.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}Verify
                        </Button>
                      )}
                      {doc.verificationStatus !== "Missing" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30" disabled={verifying === doc.id}
                          onClick={() => { setMessageDocId(null); setRejectId(doc.id); setRejectReason(""); setError(null); }}>
                          <X className="h-3 w-3 mr-1" />Reject
                        </Button>
                      )}
                    </div>
                  </div>
                  {messageDocId === doc.id && (
                    <div className="space-y-2 pt-3 border-t border-border mt-1">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        Message worker about: <span className="text-primary font-semibold">{messageDocLabel}</span>
                      </p>
                      {messageSent === doc.id ? (
                        <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />Message sent — worker notified in-app and by email.
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: "Expired doc", text: `Hi {FirstName},\n\nYour ${messageDocLabel} appears to be expired. Please upload a current, valid copy to continue with your application.\n\nThanks,\nCompliance Team` },
                              { label: "Unclear image", text: `Hi {FirstName},\n\nThe ${messageDocLabel} you uploaded is unclear or difficult to read. Please re-upload a clearer, higher-quality image.\n\nThanks,\nCompliance Team` },
                              { label: "Wrong document", text: `Hi {FirstName},\n\nIt looks like the document uploaded for ${messageDocLabel} may be incorrect. Please ensure you upload the right document type.\n\nThanks,\nCompliance Team` },
                              { label: "Missing info", text: `Hi {FirstName},\n\nYour ${messageDocLabel} is missing some required information (e.g. full name, date, or issuing authority). Please upload a complete copy.\n\nThanks,\nCompliance Team` },
                              { label: "Approved", text: `Hi {FirstName},\n\nGreat news — your ${messageDocLabel} has been verified successfully. No further action is needed.\n\nThanks,\nCompliance Team` },
                            ].map((tpl) => (
                              <button
                                key={tpl.label}
                                type="button"
                                onClick={() => setMessageText(tpl.text)}
                                className="text-xs px-2 py-1 rounded-md border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {tpl.label}
                              </button>
                            ))}
                          </div>
                          <textarea
                            rows={4}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none resize-none focus:ring-1 focus:ring-ring"
                            placeholder={`e.g. Your ${messageDocLabel} appears to be expired or unclear. Please upload a renewed copy.`}
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground/60">{"{FirstName}"} will be replaced with the worker's first name when sent.</p>
                          <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs gap-1" disabled={messageSending || !messageText.trim()} onClick={handleSendMessage}>
                              {messageSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}Send Message
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setMessageDocId(null); setMessageText(""); setError(null); }}>Cancel</Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {rejectId === doc.id && (
                    <div className="space-y-2 pt-2">
                      <textarea rows={2} className="w-full rounded-md border border-destructive/40 bg-background px-3 py-2 text-sm focus:outline-none resize-none"
                        placeholder="Reason for rejection…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/30 h-7 text-xs" disabled={verifying === doc.id} onClick={() => handleReject(doc.id)}>
                          {verifying === doc.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Confirm Reject
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "references" && (
          <div className="space-y-2">
            {refsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="h-4 w-4 animate-spin" />Loading references…</div>
            ) : references.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center">No references added.</p>
            ) : (
              references.map((ref) => {
                const cfg = REF_STATUS_CFG[ref.status];
                const check = existingChecks[ref.id];
                const checkLoading = checksLoading[ref.id];
                const risk = check ? RISK_CONFIG[check.riskLevel] : null;
                return (
                  <Card key={ref.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{ref.refereeName}</p>
                          <Badge className={`text-xs flex items-center gap-1 ${cfg.color}`}>{cfg.icon}{ref.status}</Badge>
                          {risk && <Badge className={`text-xs ${risk.color}`}>{risk.icon} {risk.label} · {check!.totalScore}/100</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{ref.refereeTitle} · {ref.refereeOrganisation}</p>
                        {(ref.refereeEmail || ref.refereePhone) && (
                          <p className="text-xs text-muted-foreground/60">{[ref.refereeEmail, ref.refereePhone].filter(Boolean).join(" | ")}</p>
                        )}
                        {check && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {check.scores.rehire <= 2 && <span className="text-xs text-red-400 flex items-center gap-0.5"><ShieldAlert className="h-3 w-3" />Rehire flag</span>}
                            {check.scores.concerns <= 2 && <span className="text-xs text-red-400 flex items-center gap-0.5"><ShieldAlert className="h-3 w-3" />Concerns flag</span>}
                            <span className="text-xs text-muted-foreground/60">Checked by {check.conductedBy} · {new Date(check.conductedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {checkLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
                          <Button size="sm" variant={check ? "outline" : "default"} className={`h-8 text-xs gap-1.5 ${!check ? "bg-primary hover:bg-primary/90" : ""}`} onClick={() => setWizardRef(ref)}>
                            {check ? <><TrendingUp className="h-3.5 w-3.5" />View Results</> : <><ClipboardList className="h-3.5 w-3.5" />Start Check</>}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        <DocumentPreviewModal doc={previewDoc} open={previewOpen}
          onClose={() => { setPreviewOpen(false); setRejectId(null); setRejectReason(""); setError(null); }}
          onGetDownloadUrl={handleGetDownloadUrl}
          adminActions={{ onVerify: handleVerify, onRejectStart: (id) => { setRejectId(id); setRejectReason(""); setError(null); }, verifying, rejectId, rejectReason, setRejectReason, onConfirmReject: handleReject, onCancelReject: () => { setRejectId(null); setRejectReason(""); }, error }} />

        {wizardRef && (
          <ReferenceCheckWizard reference={wizardRef} workerName={selectedWorker.name}
            existingCheck={existingChecks[wizardRef.id] ?? null} onSubmit={handleSubmitRefCheck} onClose={() => setWizardRef(null)} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder="Search workers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} workers</span>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 italic">No workers found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((w) => (
            <button key={w.workerId} onClick={() => handleSelectWorker(w)} className="w-full text-left">
              <Card className="p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-foreground">{w.name}</p>
                      {!w.isVerified && <Badge className="text-xs bg-muted text-muted-foreground border-transparent">Unverified</Badge>}
                      {w.pendingDocumentCount > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">{w.pendingDocumentCount} pending</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{w.email} · {w.documentCount} docs · Joined {new Date(w.createdAt).toLocaleDateString()}</p>
                    <div className="mt-1.5 max-w-48">
                      <ProfileCompletionBar pct={w.profileCompletionPct} items={w.profileCompletionItems} itemLabels={workerItemLabels()} compact />
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmployersTab({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [employers, setEmployers] = useState<AdminEmployerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grantingFor, setGrantingFor] = useState<string | null>(null);
  const [grantPlan, setGrantPlan] = useState<"monthly" | "biannual" | "annual">("monthly");
  const [grantDays, setGrantDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.admin.adminListEmployers();
      setEmployers(res.employers);
    } catch (e: unknown) {
      console.error(e);
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleGrantSub = async (employerId: string) => {
    if (!api) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.admin.adminGrantSubscription({ employerId, plan: grantPlan, durationDays: parseInt(grantDays) || 30 });
      setEmployers((prev) => prev.map((e) => e.employerId === employerId
        ? { ...e, subscriptionStatus: res.subscriptionStatus, subscriptionPlan: res.subscriptionPlan, subscriptionPeriodEnd: res.subscriptionPeriodEnd }
        : e
      ));
      setGrantingFor(null);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to grant subscription");
    } finally { setSubmitting(false); }
  };

  const handleRevokeSub = async (employerId: string) => {
    if (!api) return;
    try {
      await api.admin.adminRevokeSubscription({ employerId });
      setEmployers((prev) => prev.map((e) => e.employerId === employerId
        ? { ...e, subscriptionStatus: "cancelled", subscriptionPlan: null, subscriptionPeriodEnd: null }
        : e
      ));
    } catch (e: unknown) {
      console.error(e);
    }
  };

  const filtered = employers.filter(
    (e) => !search || e.organisationName.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder="Search employers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} employers</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 italic">No employers found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((emp) => (
            <Card key={emp.employerId} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground">{emp.organisationName}</p>
                    <Badge className={`text-xs ${SUB_COLORS[emp.subscriptionStatus] ?? "bg-muted text-muted-foreground border-transparent"}`}>
                      {emp.subscriptionPlan ?? emp.subscriptionStatus}
                    </Badge>
                    {!emp.isVerified && <Badge className="text-xs bg-muted text-muted-foreground border-transparent">Unverified email</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{emp.email} · {emp.contactPerson} · ABN {emp.abn}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {emp.activeJobCount} active / {emp.totalJobCount} total jobs
                    {emp.subscriptionPeriodEnd && ` · Sub ends ${new Date(emp.subscriptionPeriodEnd).toLocaleDateString()}`}
                    {emp.location && ` · ${emp.location}`}
                  </p>
                  <div className="mt-1.5 max-w-48">
                    <ProfileCompletionBar pct={emp.profileCompletionPct} items={emp.profileCompletionItems} itemLabels={employerItemLabels()} compact />
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setGrantingFor(grantingFor === emp.employerId ? null : emp.employerId)}>
                    <DollarSign className="h-3 w-3 mr-1" />Grant Sub
                  </Button>
                  {emp.subscriptionStatus === "active" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30" onClick={() => handleRevokeSub(emp.employerId)}>
                      <X className="h-3 w-3 mr-1" />Revoke
                    </Button>
                  )}
                </div>
              </div>

              {grantingFor === emp.employerId && (
                <div className="border-t border-border pt-3 space-y-2">
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex gap-2 flex-wrap items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Plan</Label>
                      <select value={grantPlan} onChange={(e) => setGrantPlan(e.target.value as typeof grantPlan)}
                        className="h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="monthly">Monthly</option>
                        <option value="biannual">6-Month</option>
                        <option value="annual">Annual</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Duration (days)</Label>
                      <Input className="h-8 text-sm w-24" type="number" min="1" value={grantDays} onChange={(e) => setGrantDays(e.target.value)} />
                    </div>
                    <Button size="sm" className="h-8 text-xs" disabled={submitting} onClick={() => handleGrantSub(emp.employerId)}>
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}Confirm
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setGrantingFor(null); setError(null); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function JobsTab({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [jobs, setJobs] = useState<AdminJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingJob, setUpdatingJob] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.admin.adminListJobs();
      setJobs(res.jobs);
    } catch (e: unknown) {
      console.error(e);
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (jobId: string, status: "Draft" | "Open" | "Closed" | "Cancelled") => {
    if (!api) return;
    setUpdatingJob(jobId);
    try {
      await api.admin.adminUpdateJobStatus({ jobId, status });
      setJobs((prev) => prev.map((j) => j.jobId === jobId ? { ...j, status } : j));
    } catch (e: unknown) {
      console.error(e);
    } finally { setUpdatingJob(null); }
  };

  const filtered = jobs.filter((j) => {
    const matchSearch = !search || j.employerName.toLowerCase().includes(search.toLowerCase()) || j.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder="Search jobs…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">All statuses</option>
          <option value="Open">Open</option>
          <option value="Draft">Draft</option>
          <option value="Closed">Closed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} jobs</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 italic">No jobs found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((job) => (
            <Card key={job.jobId} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {job.isEmergency && <Zap className="h-3.5 w-3.5 text-orange-400 shrink-0" />}
                    <p className="text-sm font-medium text-foreground">
                      {job.jobTitle ?? job.supportTypeTags.slice(0, 2).join(", ") ?? job.location}
                    </p>
                    <Badge className={`text-xs ${JOB_STATUS_COLORS[job.status] ?? "bg-muted text-muted-foreground border-transparent"}`}>{job.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {job.employerName} · {job.location}
                    {job.shiftDate && ` · ${job.shiftDate}`}
                    {job.shiftDurationHours && ` · ${job.shiftDurationHours}h`}
                    {` · $${job.weekdayRate}/h`}
                  </p>
                  <p className="text-xs text-muted-foreground/60">Posted {new Date(job.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {updatingJob === job.jobId ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="relative">
                      <select
                        value={job.status}
                        onChange={(e) => handleStatusChange(job.jobId, e.target.value as "Draft" | "Open" | "Closed" | "Cancelled")}
                        className="h-7 text-xs rounded-md border border-input bg-background pl-2 pr-6 focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Open">Open</option>
                        <option value="Closed">Closed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ComplianceTab({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [officers, setOfficers] = useState<Array<{ userId: string; email: string; fullName: string; createdAt: Date }>>([]);
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.admin.listComplianceOfficers();
      setOfficers(res.officers);
    } catch (e: unknown) {
      console.error(e);
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!api) return;
    setError(null);
    if (!newEmail.trim() || !newName.trim() || !newPassword.trim()) { setError("All fields are required"); return; }
    setCreating(true);
    try {
      const res = await api.admin.createComplianceOfficer({ email: newEmail.trim(), password: newPassword, fullName: newName.trim() });
      setOfficers((prev) => [{ userId: res.userId, email: res.email, fullName: res.fullName, createdAt: new Date() }, ...prev]);
      setNewEmail(""); setNewName(""); setNewPassword("");
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to create officer");
    } finally { setCreating(false); }
  };

  const handleDelete = async (userId: string) => {
    if (!api) return;
    setDeleting(userId);
    try {
      await api.admin.deleteComplianceOfficer({ userId });
      setOfficers((prev) => prev.filter((o) => o.userId !== userId));
    } catch (e: unknown) {
      console.error(e);
    } finally { setDeleting(null); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Plus className="h-4 w-4" />Create Compliance Officer</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Full Name</Label>
            <Input placeholder="Jane Smith" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input type="email" placeholder="compliance@org.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Password</Label>
            <Input type="password" placeholder="Min. 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
        {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />{error}</p>}
        <Button size="sm" onClick={handleCreate} disabled={creating} className="h-8 text-xs">
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}Create Officer
        </Button>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : officers.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-4 text-center">No compliance officers yet.</p>
      ) : (
        <div className="space-y-2">
          {officers.map((o) => (
            <Card key={o.userId} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{o.fullName}</p>
                  <p className="text-xs text-muted-foreground">{o.email} · Created {new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 shrink-0" disabled={deleting === o.userId} onClick={() => handleDelete(o.userId)}>
                  {deleting === o.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Trash2 className="h-3 w-3 mr-1" />Remove</>}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
