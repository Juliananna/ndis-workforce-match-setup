import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Eye, Send, RefreshCw, Calendar, CalendarDays,
  CheckCircle, AlertTriangle, Users, Briefcase,
} from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";

type Period = "weekly" | "daily";

interface PreviewState {
  html: string;
  jobCount: number;
  workerCount: number;
}

interface SendResult {
  sent: number;
  skipped: number;
  jobCount: number;
}

export function JobDigestTab({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [period, setPeriod] = useState<Period>("weekly");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!api) return;
    setLoadingPreview(true);
    setError(null);
    setSendResult(null);
    try {
      const res = await api.emailer.adminPreviewJobDigest({ period });
      setPreview(res);
    } catch (e: unknown) {
      console.error(e);
      setError("Failed to load preview");
    } finally {
      setLoadingPreview(false);
    }
  }, [api, period]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const handleSend = async () => {
    if (!api) return;
    setSending(true);
    setError(null);
    setSendResult(null);
    setConfirmOpen(false);
    try {
      const res = await api.emailer.adminSendJobDigest({ period });
      setSendResult(res);
    } catch (e: unknown) {
      console.error(e);
      setError("Failed to send digest");
    } finally {
      setSending(false);
    }
  };

  const periodLabel = period === "weekly" ? "week" : "day";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Send className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Job Digest</h2>
          <p className="text-xs text-muted-foreground">Preview and manually send the worker job digest email</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setPeriod("weekly")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              period === "weekly" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Weekly
          </button>
          <button
            onClick={() => setPeriod("daily")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-border ${
              period === "daily" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Daily
          </button>
        </div>

        <Button size="sm" variant="outline" onClick={loadPreview} disabled={loadingPreview} className="h-9 gap-1.5">
          {loadingPreview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh Preview
        </Button>

        <Button
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={sending || loadingPreview || !preview || preview.jobCount === 0}
          className="h-9 gap-1.5 ml-auto"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send to All Workers
        </Button>
      </div>

      {preview && (
        <div className="flex flex-wrap gap-3">
          <Card className="flex items-center gap-2.5 px-4 py-2.5">
            <Briefcase className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-lg font-bold text-foreground leading-none">{preview.jobCount}</p>
              <p className="text-xs text-muted-foreground">jobs this {periodLabel}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-2.5 px-4 py-2.5">
            <Users className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-lg font-bold text-foreground leading-none">{preview.workerCount}</p>
              <p className="text-xs text-muted-foreground">workers will receive it</p>
            </div>
          </Card>
        </div>
      )}

      {sendResult && (
        <div className="flex items-center gap-2 text-sm bg-green-500/10 border border-green-500/20 text-green-600 rounded-lg px-4 py-3">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Digest sent — <strong>{sendResult.sent}</strong> delivered, <strong>{sendResult.skipped}</strong> failed.
          ({sendResult.jobCount} jobs featured)
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {preview?.jobCount === 0 && !loadingPreview && (
        <div className="flex items-center gap-2 text-sm bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          No open jobs found in the last {periodLabel}. Widen the period or wait for new jobs to be posted.
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Email Preview</span>
          </div>
          {preview && (
            <Badge variant="outline" className="text-xs">
              {period === "weekly" ? "Last 7 days" : "Last 24 hours"}
            </Badge>
          )}
        </div>

        {loadingPreview ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : preview ? (
          <iframe
            srcDoc={preview.html}
            title="Email Preview"
            className="w-full border-0"
            style={{ height: "600px" }}
            sandbox="allow-same-origin"
          />
        ) : null}
      </Card>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-semibold text-foreground">Confirm Send</h3>
            <p className="text-sm text-muted-foreground">
              This will send the {period} job digest to{" "}
              <strong className="text-foreground">{preview?.workerCount ?? 0} workers</strong> right now.
              Are you sure?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSend} disabled={sending} className="gap-1.5">
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send Now
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
