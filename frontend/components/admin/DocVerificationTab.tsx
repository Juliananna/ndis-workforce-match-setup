import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2, CheckCircle, X, Eye, MessageSquare, AlertTriangle, Search,
  FileText, Clock, Filter, RefreshCw, User, History, ChevronLeft,
} from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { AdminWorkerDocumentView } from "~backend/admin/workers";
import type { ComplianceMessageLogEntry } from "~backend/admin/document_message";
import { DocumentPreviewModal, type PreviewDoc } from "../DocumentPreviewModal";

interface DocWithWorker extends AdminWorkerDocumentView {
  workerName: string;
  workerEmail: string;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-500/15 text-yellow-400 border-transparent",
  Verified: "bg-green-500/15 text-green-400 border-transparent",
  Missing: "bg-red-500/15 text-red-400 border-transparent",
  "Expiring Soon": "bg-orange-500/15 text-orange-400 border-transparent",
};

const QUICK_TEMPLATES = [
  { label: "Expired doc", text: `Hi {FirstName},\n\nYour {docType} appears to be expired. Please upload a current, valid copy to continue with your application.\n\nThanks,\nCompliance Team` },
  { label: "Unclear image", text: `Hi {FirstName},\n\nThe {docType} you uploaded is unclear or difficult to read. Please re-upload a clearer, higher-quality image.\n\nThanks,\nCompliance Team` },
  { label: "Wrong document", text: `Hi {FirstName},\n\nIt looks like the document uploaded for {docType} may be incorrect. Please ensure you upload the right document type.\n\nThanks,\nCompliance Team` },
  { label: "Missing info", text: `Hi {FirstName},\n\nYour {docType} is missing some required information (e.g. full name, date, or issuing authority). Please upload a complete copy.\n\nThanks,\nCompliance Team` },
  { label: "Approved", text: `Hi {FirstName},\n\nGreat news — your {docType} has been verified successfully. No further action is needed.\n\nThanks,\nCompliance Team` },
];

function MessageLog({ api, workerId, documentId, onBack }: {
  api: ReturnType<typeof useAuthedBackend>;
  workerId?: string;
  documentId?: string;
  onBack: () => void;
}) {
  const [entries, setEntries] = useState<ComplianceMessageLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 50;

  const load = useCallback(async (p: number) => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.admin.adminListComplianceMessageLog({
        workerId,
        documentId,
        limit,
        offset: p * limit,
      });
      setEntries(res.entries);
      setTotal(res.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [api, workerId, documentId]);

  useEffect(() => { load(page); }, [load, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />Back
        </button>
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Compliance Message History</h3>
          <span className="text-xs text-muted-foreground">({total} messages)</span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-8">No compliance messages sent yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {e.workerName && (
                      <span className="text-sm font-medium text-foreground">{e.workerName}</span>
                    )}
                    <span className="text-xs text-muted-foreground">re: <span className="font-medium text-foreground/80">{e.documentType}</span></span>
                    {e.templateLabel && (
                      <Badge className="text-xs bg-primary/10 text-primary border-transparent">{e.templateLabel}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{e.message}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                    <span>Sent by {e.sentByName ?? "unknown"}</span>
                    <span>·</span>
                    <span>{new Date(e.sentAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocVerificationTab() {
  const api = useAuthedBackend();

  const [docs, setDocs] = useState<DocWithWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Pending" | "Verified">("Pending");
  const [verifying, setVerifying] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [messageDocId, setMessageDocId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageTemplateLabel, setMessageTemplateLabel] = useState<string | null>(null);
  const [messageSending, setMessageSending] = useState(false);
  const [messageSent, setMessageSent] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [logWorkerId, setLogWorkerId] = useState<string | undefined>(undefined);
  const [logDocumentId, setLogDocumentId] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.adminListWorkers();
      const allDocs: DocWithWorker[] = [];
      await Promise.all(
        res.workers.map(async (w) => {
          try {
            const docRes = await api.admin.adminGetWorkerDocuments({ workerId: w.workerId });
            for (const d of docRes.documents) {
              allDocs.push({ ...d, workerName: w.name, workerEmail: w.email });
            }
          } catch {
          }
        })
      );
      allDocs.sort((a, b) => {
        const order = { Pending: 0, "Expiring Soon": 1, Missing: 2, Verified: 3 };
        const oa = order[a.verificationStatus as keyof typeof order] ?? 99;
        const ob = order[b.verificationStatus as keyof typeof order] ?? 99;
        if (oa !== ob) return oa - ob;
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      });
      setDocs(allDocs);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

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
      setDocs((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, verificationStatus: res.verificationStatus, verifiedAt: res.verifiedAt, rejectionReason: null }
            : d
        )
      );
      setPreviewDoc((prev) =>
        prev && prev.id === docId
          ? { ...prev, verificationStatus: res.verificationStatus, verifiedAt: res.verifiedAt, rejectionReason: null }
          : prev
      );
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Verify failed");
    } finally {
      setVerifying(null);
    }
  };

  const handleReject = async (docId: string) => {
    if (!api || !rejectReason.trim()) { setError("Rejection reason is required"); return; }
    setVerifying(docId);
    setError(null);
    try {
      const res = await api.admin.adminVerifyDocument({ documentId: docId, action: "reject", rejectionReason: rejectReason });
      setDocs((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, verificationStatus: res.verificationStatus, rejectionReason: res.rejectionReason }
            : d
        )
      );
      setPreviewDoc((prev) =>
        prev && prev.id === docId
          ? { ...prev, verificationStatus: res.verificationStatus, rejectionReason: res.rejectionReason }
          : prev
      );
      setRejectId(null);
      setRejectReason("");
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setVerifying(null);
    }
  };

  const handleSendMessage = async (doc: DocWithWorker) => {
    if (!api || !messageText.trim()) return;
    setMessageSending(true);
    setError(null);
    try {
      await api.admin.adminSendDocumentMessage({
        workerId: doc.workerId,
        documentId: doc.id,
        message: messageText.trim(),
        templateLabel: messageTemplateLabel ?? undefined,
      });
      setMessageSent(doc.id);
      setMessageText("");
      setMessageTemplateLabel(null);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setMessageSending(false);
    }
  };

  const filtered = docs.filter((d) => {
    if (statusFilter !== "all" && d.verificationStatus !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !d.workerName.toLowerCase().includes(q) &&
        !d.workerEmail.toLowerCase().includes(q) &&
        !d.documentType.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const pendingCount = docs.filter((d) => d.verificationStatus === "Pending").length;

  if (showLog) {
    return (
      <MessageLog
        api={api}
        workerId={logWorkerId}
        documentId={logDocumentId}
        onBack={() => { setShowLog(false); setLogWorkerId(undefined); setLogDocumentId(undefined); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search by worker or document type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="Pending">Pending only</option>
              <option value="Verified">Verified only</option>
              <option value="all">All statuses</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">
                {pendingCount} pending
              </span>
            )}
            <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => { setShowLog(true); setLogWorkerId(undefined); setLogDocumentId(undefined); }}
          >
            <History className="h-3.5 w-3.5" />Message Log
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <FileText className="h-10 w-10 opacity-20" />
          <p className="text-sm italic">
            {statusFilter === "Pending" ? "No pending documents — all caught up!" : "No documents found."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{doc.documentType}</p>
                    <Badge className={`text-xs flex items-center gap-1 ${STATUS_COLORS[doc.verificationStatus] ?? "bg-muted text-muted-foreground border-transparent"}`}>
                      {doc.verificationStatus === "Pending" ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                      {doc.verificationStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="font-medium text-foreground/80">{doc.workerName}</span>
                    <span>·</span>
                    <span>{doc.workerEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-muted-foreground">
                    <span>Uploaded {new Date(doc.uploadDate).toLocaleDateString()}</span>
                    {doc.expiryDate && <span>· Expires {new Date(doc.expiryDate).toLocaleDateString()}</span>}
                    {doc.verifiedAt && <span>· Actioned {new Date(doc.verifiedAt).toLocaleDateString()}</span>}
                  </div>
                  {doc.rejectionReason && (
                    <p className="text-xs text-destructive mt-1">Rejection reason: {doc.rejectionReason}</p>
                  )}
                </div>

                <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setPreviewDoc(doc as PreviewDoc);
                      setPreviewOpen(true);
                      setRejectId(null);
                      setRejectReason("");
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setRejectId(null);
                      setMessageDocId(messageDocId === doc.id ? null : doc.id);
                      setMessageText("");
                      setMessageTemplateLabel(null);
                      setMessageSent(null);
                      setError(null);
                    }}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />Message
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    title="View message history for this document"
                    onClick={() => {
                      setShowLog(true);
                      setLogWorkerId(doc.workerId);
                      setLogDocumentId(doc.id);
                    }}
                  >
                    <History className="h-3 w-3" />
                  </Button>
                  {doc.verificationStatus !== "Verified" && (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                      disabled={verifying === doc.id}
                      onClick={() => handleVerify(doc.id)}
                    >
                      {verifying === doc.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                      Verify
                    </Button>
                  )}
                  {doc.verificationStatus !== "Missing" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-destructive border-destructive/30"
                      disabled={verifying === doc.id}
                      onClick={() => {
                        setMessageDocId(null);
                        setRejectId(rejectId === doc.id ? null : doc.id);
                        setRejectReason("");
                        setError(null);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />Reject
                    </Button>
                  )}
                </div>
              </div>

              {messageDocId === doc.id && (
                <div className="space-y-2 pt-3 border-t border-border mt-3">
                  <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    Message worker about: <span className="text-primary font-semibold">{doc.documentType}</span>
                  </p>
                  {messageSent === doc.id ? (
                    <div className="flex items-center justify-between gap-2 text-xs text-green-500 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />Message sent — worker notified in-app and by email.
                      </div>
                      <button
                        onClick={() => {
                          setShowLog(true);
                          setLogWorkerId(doc.workerId);
                          setLogDocumentId(doc.id);
                        }}
                        className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                      >
                        <History className="h-3 w-3" />View history
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl.label}
                            type="button"
                            onClick={() => {
                              setMessageText(tpl.text.replace(/\{docType\}/g, doc.documentType));
                              setMessageTemplateLabel(tpl.label);
                            }}
                            className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                              messageTemplateLabel === tpl.label
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {tpl.label}
                          </button>
                        ))}
                        {messageTemplateLabel && (
                          <button
                            type="button"
                            onClick={() => setMessageTemplateLabel(null)}
                            className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={4}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none resize-none focus:ring-1 focus:ring-ring"
                        placeholder={`e.g. Your ${doc.documentType} appears to be expired or unclear. Please upload a renewed copy.`}
                        value={messageText}
                        onChange={(e) => {
                          setMessageText(e.target.value);
                          setMessageTemplateLabel(null);
                        }}
                      />
                      <p className="text-xs text-muted-foreground/60">{"{FirstName}"} will be replaced with the worker's first name when sent.</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={messageSending || !messageText.trim()}
                          onClick={() => handleSendMessage(doc)}
                        >
                          {messageSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
                          Send Message
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setMessageDocId(null); setMessageText(""); setMessageTemplateLabel(null); setError(null); }}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {rejectId === doc.id && (
                <div className="space-y-2 pt-3 border-t border-border mt-3">
                  <textarea
                    rows={2}
                    className="w-full rounded-md border border-destructive/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none resize-none focus:ring-1 focus:ring-destructive"
                    placeholder="Reason for rejection…"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 h-7 text-xs"
                      disabled={verifying === doc.id}
                      onClick={() => handleReject(doc.id)}
                    >
                      {verifying === doc.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      Confirm Reject
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setRejectId(null); setRejectReason(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <DocumentPreviewModal
        doc={previewDoc}
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setRejectId(null); setRejectReason(""); setError(null); }}
        onGetDownloadUrl={handleGetDownloadUrl}
        adminActions={{
          onVerify: handleVerify,
          onRejectStart: (id) => { setRejectId(id); setRejectReason(""); setError(null); },
          verifying,
          rejectId,
          rejectReason,
          setRejectReason,
          onConfirmReject: handleReject,
          onCancelReject: () => { setRejectId(null); setRejectReason(""); },
          error,
        }}
      />
    </div>
  );
}
