import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Offer } from "~backend/offers/types";

interface Props {
  open: boolean;
  onClose: () => void;
  jobId: string;
  defaultRate: number;
  prefilledWorkerId?: string;
  prefilledWorkerName?: string;
  onSend: (workerId: string, offeredRate: number, notes: string) => Promise<Offer>;
}

export function SendOfferModal({ open, onClose, jobId: _jobId, defaultRate, prefilledWorkerId, prefilledWorkerName, onSend }: Props) {
  const [workerId, setWorkerId] = useState(prefilledWorkerId ?? "");
  const [rate, setRate] = useState(defaultRate.toString());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setWorkerId(prefilledWorkerId ?? "");
      setRate(defaultRate.toString());
      setNotes("");
      setError(null);
    }
  }, [open, prefilledWorkerId, defaultRate]);

  const handleSend = async () => {
    if (!workerId.trim()) { setError("Worker ID is required"); return; }
    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate < 0) { setError("Enter a valid rate"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSend(workerId.trim(), parsedRate, notes);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send offer");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Send Work Offer</h2>
          <div className="space-y-3">
            {prefilledWorkerName ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <p className="text-xs text-muted-foreground">Sending offer to</p>
                <p className="text-sm font-medium text-foreground">{prefilledWorkerName}</p>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs">Worker ID *</Label>
                <Input
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  placeholder="Paste worker UUID"
                  className="h-8 text-sm font-mono"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Offered Rate ($/hr) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Additional Notes</Label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any extra details for the worker…"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={handleSend} disabled={saving}>
              {saving ? "Sending…" : "Send Offer"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
