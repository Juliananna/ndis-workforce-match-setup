import { useState, useEffect, useCallback } from "react";
import {
  FileText, Video, FilePlus, XCircle, CheckCircle2,
  Loader2, ExternalLink, ChevronDown, ChevronUp, Plus, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { OfferDocumentRequest } from "~backend/offers/document_requests";

const REQUESTABLE_TYPES = [
  "Resume",
  "Video Presentation",
  "Cover Letter",
  "Driver's Licence",
  "Passport / ID",
  "Working With Children Check",
  "Police Clearance",
  "NDIS Worker Screening Check",
  "NDIS Worker Orientation Module",
  "NDIS Code of Conduct acknowledgement",
  "Infection Control Certificate",
  "First Aid Certificate",
  "CPR Certificate",
  "Certificate III / IV Disability",
  "Nursing qualifications",
  "Other relevant training",
  "Other",
] as const;

const TYPE_ICON: Record<string, React.ReactNode> = {
  "Resume": <FileText className="h-3.5 w-3.5" />,
  "Video Presentation": <Video className="h-3.5 w-3.5" />,
  "Cover Letter": <FileText className="h-3.5 w-3.5" />,
};

function getIcon(type: string) {
  return TYPE_ICON[type] ?? <FilePlus className="h-3.5 w-3.5" />;
}

const STATUS_STYLE: Record<OfferDocumentRequest["status"], string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Fulfilled: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-gray-100 text-gray-400 border-gray-200",
};

function formatDate(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

interface PanelProps {
  offerId: string;
  workerName?: string;
}

export function EmployerDocumentRequestsPanel({ offerId, workerName }: PanelProps) {
  const api = useAuthedBackend();
  const [requests, setRequests] = useState<OfferDocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.offers.listDocumentRequests({ offerId });
      setRequests(res.requests);
    } catch (e: unknown) {
      console.error("Failed to load document requests:", e);
    } finally {
      setLoading(false);
    }
  }, [api, offerId]);

  useEffect(() => { load(); }, [load]);

  const handleRequest = async () => {
    if (!api || selectedTypes.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const newReqs = await Promise.all(
        Array.from(selectedTypes).map((documentType) =>
          api.offers.createDocumentRequest({
            offerId,
            documentType,
            note: note.trim() || undefined,
          })
        )
      );
      setRequests((prev) => [...prev, ...newReqs]);
      setShowForm(false);
      setSelectedTypes(new Set());
      setNote("");
    } catch (e: unknown) {
      console.error("Failed to request documents:", e);
      setError(e instanceof Error ? e.message : "Failed to send requests");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!api) return;
    setCancellingId(requestId);
    setError(null);
    try {
      const updated = await api.offers.cancelDocumentRequest({ offerId, requestId });
      setRequests((prev) => prev.map((r) => r.id === requestId ? updated : r));
    } catch (e: unknown) {
      console.error("Failed to cancel request:", e);
      setError(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setCancellingId(null);
    }
  };

  const pending = requests.filter((r) => r.status === "Pending");
  const fulfilled = requests.filter((r) => r.status === "Fulfilled");
  const cancelled = requests.filter((r) => r.status === "Cancelled");

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />Loading…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {requests.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 italic">No document requests sent yet.</p>
      )}

      {(pending.length > 0 || fulfilled.length > 0) && (
        <div className="space-y-2">
          {[...pending, ...fulfilled].map((req) => (
            <DocumentRequestRow
              key={req.id}
              request={req}
              cancelling={cancellingId === req.id}
              onCancel={() => handleCancel(req.id)}
              role="EMPLOYER"
            />
          ))}
        </div>
      )}

      {cancelled.length > 0 && (
        <button
          type="button"
          onClick={() => setShowCancelled((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showCancelled ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showCancelled ? "Hide" : "Show"} {cancelled.length} cancelled
        </button>
      )}
      {showCancelled && cancelled.length > 0 && (
        <div className="space-y-2">
          {cancelled.map((req) => (
            <DocumentRequestRow
              key={req.id}
              request={req}
              cancelling={false}
              onCancel={() => {}}
              role="EMPLOYER"
            />
          ))}
        </div>
      )}

      {!showForm ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Request Documents
        </Button>
      ) : (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Request documents from {workerName ?? "the worker"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Select one or more documents to request</p>
            </div>
            <button
              type="button"
              onClick={() => { setShowForm(false); setSelectedTypes(new Set()); setNote(""); setError(null); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {REQUESTABLE_TYPES.map((type) => {
              const checked = selectedTypes.has(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSelectedTypes((prev) => {
                      const next = new Set(prev);
                      if (next.has(type)) next.delete(type);
                      else next.add(type);
                      return next;
                    });
                  }}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors text-left ${
                    checked
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <div className={`h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center transition-colors ${
                    checked ? "bg-primary border-primary" : "border-muted-foreground/40"
                  }`}>
                    {checked && (
                      <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="leading-tight">{type}</span>
                </button>
              );
            })}
          </div>

          {selectedTypes.size > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Note for worker (optional — applies to all selected)</label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Please upload as PDF, certified copy required…"
                maxLength={300}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleRequest}
              disabled={selectedTypes.size === 0 || saving}
            >
              {saving
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Sending…</>
                : `Send Request${selectedTypes.size > 1 ? `s (${selectedTypes.size})` : ""}`}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowForm(false); setSelectedTypes(new Set()); setNote(""); setError(null); }}
              disabled={saving}
            >
              Cancel
            </Button>
            {selectedTypes.size > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">{selectedTypes.size} selected</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function WorkerDocumentRequestsPanel({ offerId }: { offerId: string }) {
  const api = useAuthedBackend();
  const [requests, setRequests] = useState<OfferDocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);
  const [fulfillUrl, setFulfillUrl] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.offers.listDocumentRequests({ offerId });
      setRequests(res.requests);
    } catch (e: unknown) {
      console.error("Failed to load document requests:", e);
    } finally {
      setLoading(false);
    }
  }, [api, offerId]);

  useEffect(() => { load(); }, [load]);

  const handleFulfill = async (requestId: string) => {
    if (!api) return;
    const url = fulfillUrl[requestId]?.trim();
    if (!url) { setError("Please paste a link to your document"); return; }

    setFulfillingId(requestId);
    setError(null);
    try {
      const updated = await api.offers.fulfillDocumentRequest({ offerId, requestId, fulfilledUrl: url });
      setRequests((prev) => prev.map((r) => r.id === requestId ? updated : r));
      setFulfillUrl((prev) => { const n = { ...prev }; delete n[requestId]; return n; });
    } catch (e: unknown) {
      console.error("Failed to fulfill:", e);
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setFulfillingId(null);
    }
  };

  const pending = requests.filter((r) => r.status === "Pending");

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />Loading…
      </div>
    );
  }

  if (requests.length === 0) return null;

  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2.5">
          <FilePlus className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            The employer has requested {pending.length} document{pending.length !== 1 ? "s" : ""} from you
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className={`rounded-xl border overflow-hidden ${req.status === "Cancelled" ? "opacity-60" : ""}`}>
            <div className={`flex items-center gap-2 px-3 py-2 ${
              req.status === "Pending" ? "bg-amber-50 border-b border-amber-100" :
              req.status === "Fulfilled" ? "bg-emerald-50 border-b border-emerald-100" :
              "bg-gray-50 border-b border-gray-100"
            }`}>
              <span className="text-muted-foreground">{getIcon(req.documentType)}</span>
              <span className="text-sm font-semibold text-foreground flex-1">{req.documentType}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[req.status]}`}>
                {req.status === "Fulfilled" && <CheckCircle2 className="h-3 w-3 inline mr-0.5" />}
                {req.status}
              </span>
            </div>

            <div className="px-3 py-3 space-y-2.5">
              {req.note && (
                <p className="text-xs text-muted-foreground italic">"{req.note}"</p>
              )}

              {req.status === "Fulfilled" && req.fulfilledUrl && (
                <a
                  href={req.fulfilledUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View submitted document
                </a>
              )}

              {req.status === "Fulfilled" && req.fulfilledAt && (
                <p className="text-xs text-muted-foreground">Submitted {formatDate(req.fulfilledAt)}</p>
              )}

              {req.status === "Pending" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Paste a link to your {req.documentType} (Google Drive, Dropbox, direct URL, etc.)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://…"
                      value={fulfillUrl[req.id] ?? ""}
                      onChange={(e) => setFulfillUrl((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <Button
                      size="sm"
                      className="h-8 text-xs px-3"
                      disabled={!fulfillUrl[req.id]?.trim() || fulfillingId === req.id}
                      onClick={() => handleFulfill(req.id)}
                    >
                      {fulfillingId === req.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : "Submit"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentRequestRow({
  request,
  cancelling,
  onCancel,
  role,
}: {
  request: OfferDocumentRequest;
  cancelling: boolean;
  onCancel: () => void;
  role: "EMPLOYER";
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
      request.status === "Cancelled" ? "opacity-60 bg-muted/30" : "bg-card"
    }`}>
      <span className="text-muted-foreground shrink-0">{getIcon(request.documentType)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{request.documentType}</p>
        {request.note && (
          <p className="text-xs text-muted-foreground truncate italic">"{request.note}"</p>
        )}
        {request.status === "Fulfilled" && request.fulfilledAt && (
          <p className="text-xs text-emerald-600">Fulfilled {formatDate(request.fulfilledAt)}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {request.status === "Fulfilled" && request.fulfilledUrl && (
          <a
            href={request.fulfilledUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />View
          </a>
        )}
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[request.status]}`}>
          {request.status === "Fulfilled" && <CheckCircle2 className="h-3 w-3" />}
          {request.status}
        </span>
        {role === "EMPLOYER" && request.status === "Pending" && (
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Cancel request"
          >
            {cancelling
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <XCircle className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
