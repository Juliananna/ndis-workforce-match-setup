import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Calendar, Clock, Loader2, AlertTriangle } from "lucide-react";
import type { PendingReferenceItem } from "~backend/admin/reference_bookings";

interface Props {
  item: PendingReferenceItem;
  onConfirm: (referenceId: string, scheduledAt: string, notes: string) => Promise<void>;
  onClose: () => void;
}

export function BookingModal({ item, onConfirm, onClose }: Props) {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate() + 1)}`;
  const defaultTime = "10:00";

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!date || !time) {
      setError("Please select a date and time.");
      return;
    }
    const scheduledAt = new Date(`${date}T${time}:00`);
    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      setError("Scheduled time must be in the future.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(item.referenceId, scheduledAt.toISOString(), notes);
      onClose();
    } catch (e: unknown) {
      console.error("Booking failed:", e);
      setError(e instanceof Error ? e.message : "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Schedule Reference Call</p>
              <p className="text-xs text-gray-500">{item.refereeName} · {item.refereeOrganisation}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Worker:</span>
              <span className="font-medium text-gray-900">{item.workerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Referee:</span>
              <span className="font-medium text-gray-900">{item.refereeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Title:</span>
              <span className="text-gray-700">{item.refereeTitle}</span>
            </div>
            {item.refereePhone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Phone:</span>
                <span className="font-semibold text-indigo-700">{item.refereePhone}</span>
              </div>
            )}
            {item.refereeEmail && (
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="text-gray-700">{item.refereeEmail}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Call back number, preferred time, context..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700">
            Email reminders will be sent to you 24 hours and 1 hour before the scheduled call.
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading}
            className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5 mr-1.5" />}
            Schedule Call
          </Button>
        </div>
      </div>
    </div>
  );
}
