import { useState } from "react";
import { Calendar, Clock, MapPin, FileText, X, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";

const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
];

interface TimeSlot {
  date: string;
  time: string;
}

interface Props {
  open: boolean;
  workerId: string;
  workerName: string;
  onClose: () => void;
  onRequested: () => void;
}

export function RequestInterviewModal({ open, workerId, workerName, onClose, onRequested }: Props) {
  const api = useAuthedBackend();
  const [slots, setSlots] = useState<TimeSlot[]>([{ date: "", time: "" }]);
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setSlots([{ date: "", time: "" }]);
    setDuration(30);
    setLocation("");
    setNotes("");
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const addSlot = () => {
    if (slots.length < 5) setSlots((prev) => [...prev, { date: "", time: "" }]);
  };

  const removeSlot = (idx: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, field: keyof TimeSlot, value: string) => {
    setSlots((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async () => {
    if (!api) return;

    const filledSlots = slots.filter((s) => s.date && s.time);
    if (filledSlots.length === 0) {
      setError("Please add at least one suggested time slot");
      return;
    }

    const now = new Date();
    const suggestedSlots: string[] = [];
    for (const s of filledSlots) {
      const dt = new Date(`${s.date}T${s.time}:00`);
      if (isNaN(dt.getTime())) { setError("One or more slots have an invalid date/time"); return; }
      if (dt <= now) { setError("All suggested slots must be in the future"); return; }
      suggestedSlots.push(dt.toISOString());
    }

    setSaving(true);
    setError(null);
    try {
      await api.employers.requestInterview({
        workerId,
        suggestedSlots,
        durationMinutes: duration,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      onRequested();
      setTimeout(() => { handleClose(); }, 1800);
    } catch (e: unknown) {
      console.error("Failed to send interview request:", e);
      setError(e instanceof Error ? e.message : "Failed to send interview request");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">Suggest Interview Times</h2>
            <p className="text-xs text-muted-foreground mt-0.5">with {workerName} — they'll pick the best time</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <p className="text-base font-bold text-foreground">Times Suggested!</p>
            <p className="text-sm text-muted-foreground">{workerName} will be notified to pick a time that works for them.</p>
          </div>
        ) : (
          <div className="overflow-y-auto px-6 py-5 space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Suggested Time Slots
                  <span className="text-muted-foreground/60">({slots.length}/5)</span>
                </Label>
                {slots.length < 5 && (
                  <button
                    type="button"
                    onClick={addSlot}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />Add slot
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {slots.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2.5">
                    <span className="text-xs font-semibold text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                    <Input
                      type="date"
                      value={slot.date}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => updateSlot(idx, "date", e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <Input
                      type="time"
                      value={slot.time}
                      onChange={(e) => updateSlot(idx, "time", e.target.value)}
                      className="h-8 text-xs w-28"
                    />
                    {slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlot(idx)}
                        className="text-muted-foreground/40 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-muted-foreground">
                Suggest up to 5 options — {workerName} will choose the one that suits them best.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />Duration
              </Label>
              <div className="flex gap-2 flex-wrap">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDuration(opt.value)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      duration === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />Location / Meeting link (optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g. Zoom link, office address…"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />Notes (optional)
              </Label>
              <textarea
                rows={2}
                placeholder="Anything the worker should know beforehand…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Sending…" : "Send Time Suggestions"}
              </Button>
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
