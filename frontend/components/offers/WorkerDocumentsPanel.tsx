import { useState, useEffect, useCallback } from "react";
import { FileText, Download, Loader2, AlertTriangle, CheckCircle, Clock, X, Lock, Archive, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { useAuth } from "../../contexts/AuthContext";
import type { EmployerDocumentView } from "~backend/workers/employer_documents";
import { DocumentPreviewModal, type PreviewDoc } from "../DocumentPreviewModal";

type VerificationStatus = "Pending" | "Verified" | "Missing" | "Expiring Soon" | "Expired";

function StatusChip({ status }: { status: VerificationStatus }) {
  const cfg: Record<VerificationStatus, { color: string; icon: React.ReactNode }> = {
    Pending: { color: "border-amber-500/40 text-amber-400", icon: <Clock className="h-3 w-3" /> },
    Verified: { color: "border-green-500/40 text-green-400", icon: <CheckCircle className="h-3 w-3" /> },
    Missing: { color: "border-red-500/40 text-red-400", icon: <X className="h-3 w-3" /> },
    Expired: { color: "border-red-600/60 text-red-500", icon: <AlertTriangle className="h-3 w-3" /> },
    "Expiring Soon": { color: "border-orange-500/40 text-orange-400", icon: <AlertTriangle className="h-3 w-3" /> },
  };
  const c = cfg[status] ?? cfg["Pending"];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${c.color}`}>
      {c.icon}{status}
    </span>
  );
}

interface Props {
  workerId: string;
}

export function WorkerDocumentsPanel({ workerId }: Props) {
  const api = useAuthedBackend();
  const { token } = useAuth();
  const [documents, setDocuments] = useState<EmployerDocumentView[]>([]);
  const [workerName, setWorkerName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.workers.listWorkerDocumentsForEmployer({ workerId });
      setDocuments(res.documents);
      setWorkerName(res.workerName);
    } catch (e: unknown) {
      console.error("Failed to load worker documents:", e);
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [api, workerId]);

  useEffect(() => { load(); }, [load]);

  const handleDownloadZip = async () => {
    if (!token) return;
    setZipping(true);
    try {
      const baseUrl = (import.meta.env.VITE_CLIENT_TARGET as string) ?? "http://localhost:4000";
      const res = await fetch(
        `${baseUrl}/employers/workers/${workerId}/documents/download-zip`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? "Failed to download zip");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = workerName.replace(/[^a-z0-9]/gi, "_") || workerId;
      a.download = `${safeName}_documents.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      console.error("Failed to download zip:", e);
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setZipping(false);
    }
  };

  const handleGetDownloadUrl = async (documentId: string): Promise<string> => {
    if (!api) throw new Error("Not authenticated");
    const { downloadUrl } = await api.workers.getDocumentDownloadUrl({ workerId, documentId });
    return downloadUrl;
  };

  const handleQuickView = (doc: EmployerDocumentView) => {
    setPreviewDoc(doc as unknown as PreviewDoc);
    setPreviewOpen(true);
  };

  const handleDownload = async (doc: EmployerDocumentView) => {
    if (!api) return;
    setDownloadingId(doc.id);
    try {
      const url = await handleGetDownloadUrl(doc.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      console.error("Failed to generate download URL:", e);
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading worker documents…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center italic">
        This worker has not uploaded any compliance documents yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5"
          disabled={zipping || documents.length === 0}
          onClick={handleDownloadZip}
        >
          {zipping ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Archive className="h-3.5 w-3.5" />
          )}
          Download All as ZIP
        </Button>
      </div>
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5"
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{doc.documentType}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <StatusChip status={doc.verificationStatus as VerificationStatus} />
              <span className="text-xs text-muted-foreground">
                Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
              </span>
              {doc.expiryDate && (
                <span className="text-xs text-muted-foreground">
                  &bull; Expires {new Date(doc.expiryDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => handleQuickView(doc)}
            >
              <Eye className="h-3 w-3 mr-1" />Quick View
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={downloadingId === doc.id}
              onClick={() => handleDownload(doc)}
            >
              {downloadingId === doc.id ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              Download
            </Button>
          </div>
        </div>
      ))}

      <DocumentPreviewModal
        doc={previewDoc}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onGetDownloadUrl={handleGetDownloadUrl}
      />
    </div>
  );
}

export function WorkerDocumentsLockedPlaceholder() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
      <Lock className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
      <div>
        <p className="font-medium text-foreground">Documents locked</p>
        <p className="mt-0.5">
          Worker compliance documents become available once the offer is accepted.
        </p>
      </div>
    </div>
  );
}
