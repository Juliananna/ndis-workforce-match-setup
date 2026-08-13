import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, MapPin, FileText, X, CheckCircle2 } from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { InterviewBooking } from "~backend/offers/interviews";

const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
];

interface Props {
  open: boolean;
  offerId: string;
  workerName: string;
  onClose: () => void;
  onBooked: (interview: InterviewBooking) => void;
}

export function BookInterviewModal({ open, offerId, workerName, onClose, onBooked }: Props) {
  const api = useAuthedBackend();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setDate(""); setTime(""); setDuration(30); setLocation(""); setNotes("");
    setError(null); setSuccess(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!api) return;
    if (!date || !time) { setError("Please select a date and time"); return; }

    const scheduledAt = new Date(`${date}T${time}:00`);
    if (isNaN(scheduledAt.getTime())) { setError("Invalid date/time"); return; }
    if (scheduledAt < new Date()) { setError("Interview must be scheduled in the future"); return; }

    setSaving(true);
    setError(null);
    try {
      const interview = await api.offers.createInterview({
        offerId,
        scheduledAt,
        durationMinutes: duration,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      onBooked(interview);
      setTimeout(() => { handleClose(); }, 1500);
    } catch (e: unknown) {
      console.error("Failed to book interview:", e);
      setError(e instanceof Error ? e.message : "Failed to book interview");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Book an Interview</h2>
            <p className="text-xs text-gray-500 mt-0.5">with {workerName}</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-base font-bold text-gray-900">Interview Booked!</p>
            <p className="text-sm text-gray-500">The interview has been scheduled successfully.</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />Date
                </Label>
                <Input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />Time
                </Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Duration</Label>
              <div className="flex gap-2 flex-wrap">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDuration(opt.value)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      duration === opt.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 text-gray-600 hover:border-blue-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 flex items-center gap-1.5">
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
              <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />Notes (optional)
              </Label>
              <textarea
                rows={2}
                placeholder="Anything the worker should know beforehand…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Booking…" : "Confirm Booking"}
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
