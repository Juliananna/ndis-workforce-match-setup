import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import type { Offer } from "~backend/offers/types";
import type { PublicSchadRate } from "~backend/offers/schads_rates";
import backend from "~backend/client";

function dateToStr(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

interface Props {
  open: boolean;
  onClose: () => void;
  jobId: string;
  defaultRate: number;
  prefilledWorkerId?: string;
  prefilledWorkerName?: string;
  onSend: (workerId: string, offeredRate: number, notes: string) => Promise<Offer>;
}

function SchadRatePicker({ onSelect }: { onSelect: (rate: number) => void }) {
  const [rates, setRates] = useState<PublicSchadRate[]>([]);
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rateType, setRateType] = useState<"ordinaryHourlyRate" | "saturdayRate" | "sundayRate" | "publicHolidayRate" | "afternoonShiftRate" | "nightShiftRate">("ordinaryHourlyRate");

  useEffect(() => {
    if (!open || rates.length > 0) return;
    setLoading(true);
    backend.offers.listSchadRates()
      .then((res) => {
        setRates(res.rates);
        setEffectiveDate(dateToStr(res.effectiveDate));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, rates.length]);

  const RATE_TYPE_OPTIONS = [
    { key: "ordinaryHourlyRate" as const, label: "Ordinary" },
    { key: "afternoonShiftRate" as const, label: "Afternoon Shift" },
    { key: "nightShiftRate" as const,     label: "Night Shift" },
    { key: "saturdayRate" as const,       label: "Saturday" },
    { key: "sundayRate" as const,         label: "Sunday" },
    { key: "publicHolidayRate" as const,  label: "Public Holiday" },
  ];

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-primary"
      >
        <span className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Use SCHADS Award Rate as reference
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-primary/10">
          <div className="flex flex-wrap gap-1.5 pt-2">
            {RATE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRateType(opt.key)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  rateType === opt.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground py-2 text-center">Loading rates…</p>
          ) : rates.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center italic">No SCHADS rates configured yet.</p>
          ) : (
            <>
              {effectiveDate && (
                <p className="text-[10px] text-muted-foreground">Effective {effectiveDate} · Click a rate to pre-fill</p>
              )}
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {rates.map((r) => {
                  const val = r[rateType] as number | null;
                  if (val == null) return null;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => { onSelect(val); setOpen(false); }}
                      className="w-full text-left flex items-center justify-between px-2.5 py-2 rounded-md border border-transparent hover:border-primary/30 hover:bg-primary/10 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">L{r.level}.{r.payPoint}</Badge>
                        <span className="text-xs text-muted-foreground truncate">{r.classificationName}</span>
                      </div>
                      <span className="text-xs font-bold text-primary shrink-0 ml-2 group-hover:underline">${val.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
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

            <SchadRatePicker onSelect={(v) => setRate(v.toFixed(2))} />

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
