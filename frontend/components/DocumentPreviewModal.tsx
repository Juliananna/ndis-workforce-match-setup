import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download, X, Loader2, CheckCircle, AlertTriangle, Clock,
  FileText, ExternalLink,
} from "lucide-react";

type VerificationStatus = "Pending" | "Verified" | "Missing" | "Expiring Soon" | "Expired";

export interface PreviewDoc {
  id: string;
  documentType: string;
  title?: string | null;
  verificationStatus: string;
  uploadDate: Date | string;
  expiryDate?: Date | string | null;
  rejectionReason?: string | null;
  verifiedAt?: Date | string | null;
}

interface AdminActions {
  onVerify: (docId: string) => Promise<void>;
  onRejectStart: (docId: string) => void;
  verifying: string | null;
  rejectId: string | null;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  onConfirmReject: (docId: string) => Promise<void>;
  onCancelReject: () => void;
  error: string | null;
}

interface Props {
  doc: PreviewDoc | null;
  open: boolean;
  onClose: () => void;
  onGetDownloadUrl: (docId: string) => Promise<string>;
  adminActions?: AdminActions;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-500/15 text-yellow-400 border-transparent",
  Verified: "bg-green-500/15 text-green-400 border-transparent",
  Missing: "bg-red-500/15 text-red-400 border-transparent",
  "Expiring Soon": "bg-orange-500/15 text-orange-400 border-transparent",
  Expired: "bg-red-600/15 text-red-500 border-transparent",
};

function statusIcon(status: string) {
  if (status === "Verified") return <CheckCircle className="h-3.5 w-3.5" />;
  if (status === "Expired" || status === "Missing") return <AlertTriangle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

function isImage(url: string) {
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
}

function isPdf(url: string) {
  return /\.pdf(\?|$)/i.test(url);
}

export function DocumentPreviewModal({ doc, open, onClose, onGetDownloadUrl, adminActions }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !doc) return;
    setPreviewUrl(null);
    setPreviewError(null);
    setLoadingPreview(true);
    onGetDownloadUrl(doc.id)
      .then((url) => setPreviewUrl(url))
      .catch(() => setPreviewError("Failed to load document."))
      .finally(() => setLoadingPreview(false));
  }, [open, doc?.id]);

  const handleDownload = async () => {
    if (previewUrl) { window.open(previewUrl, "_blank", "noopener,noreferrer"); return; }
    if (!doc) return;
    try {
      const url = await onGetDownloadUrl(doc.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // ignore
    }
  };

  if (!open || !doc) return null;

  const displayName = doc.documentType === "Other relevant training" && doc.title
    ? doc.title
    : doc.documentType;

  const status = doc.verificationStatus as VerificationStatus;
  const isAdminMode = !!adminActions;
  const canVerify = isAdminMode && status !== "Verified";
  const canReject = isAdminMode && status !== "Missing";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm leading-tight truncate">{displayName}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={`text-xs flex items-center gap-1 ${STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-transparent"}`}>
                  {statusIcon(status)}{status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                </span>
                {doc.expiryDate && (
                  <span className="text-xs text-muted-foreground">
                    · Expires {new Date(doc.expiryDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              {doc.rejectionReason && (
                <p className="text-xs text-destructive mt-1">Reason: {doc.rejectionReason}</p>
              )}
              {doc.verifiedAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {status === "Verified" ? "Verified" : "Actioned"} {new Date(doc.verifiedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors ml-2 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 min-h-0">
          <PreviewArea
            previewUrl={previewUrl}
            loadingPreview={loadingPreview}
            previewError={previewError}
          />
        </div>

        {isAdminMode && adminActions && (
          <div className="border-t border-border p-4 space-y-3 shrink-0">
            {adminActions.error && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{adminActions.error}
              </div>
            )}
            {adminActions.rejectId === doc.id ? (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  className="w-full rounded-md border border-destructive/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-destructive resize-none"
                  placeholder="Reason for rejection…"
                  value={adminActions.rejectReason}
                  onChange={(e) => adminActions.setRejectReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 h-7 text-xs"
                    disabled={adminActions.verifying === doc.id}
                    onClick={() => adminActions.onConfirmReject(doc.id)}
                  >
                    {adminActions.verifying === doc.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Confirm Reject
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={adminActions.onCancelReject}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {canVerify && (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                    disabled={adminActions.verifying === doc.id}
                    onClick={() => adminActions.onVerify(doc.id)}
                  >
                    {adminActions.verifying === doc.id
                      ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      : <CheckCircle className="h-3 w-3 mr-1" />
                    }
                    Verify
                  </Button>
                )}
                {canReject && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-destructive border-destructive/30"
                    disabled={adminActions.verifying === doc.id}
                    onClick={() => adminActions.onRejectStart(doc.id)}
                  >
                    <X className="h-3 w-3 mr-1" />Reject
                  </Button>
                )}
                <div className="flex-1" />
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleDownload}>
                  <Download className="h-3 w-3 mr-1" />Download
                </Button>
              </div>
            )}
          </div>
        )}

        {!isAdminMode && (
          <div className="border-t border-border p-4 flex justify-end shrink-0">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleDownload}>
              <Download className="h-3 w-3 mr-1" />Download
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewArea({
  previewUrl,
  loadingPreview,
  previewError,
}: {
  previewUrl: string | null;
  loadingPreview: boolean;
  previewError: string | null;
}) {
  if (loadingPreview) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading preview…</span>
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">{previewError}</span>
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading preview…</span>
      </div>
    );
  }

  if (isImage(previewUrl)) {
    return (
      <div className="flex items-center justify-center">
        <img
          src={previewUrl}
          alt="Document preview"
          className="max-w-full max-h-[50vh] rounded-lg border border-border object-contain"
        />
      </div>
    );
  }

  if (isPdf(previewUrl)) {
    return (
      <iframe
        src={previewUrl}
        className="w-full rounded-lg border border-border"
        style={{ height: "50vh" }}
        title="Document preview"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <FileText className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}>
        <ExternalLink className="h-3 w-3 mr-1.5" />Open in new tab
      </Button>
    </div>
  );
}
