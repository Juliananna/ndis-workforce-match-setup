import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Clock, MapPin, FileText, Loader2, CheckCircle2, UserCheck, XCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { InterviewRequest } from "~backend/employers/interview_requests";

const STATUS_STYLE: Record<InterviewRequest["status"], string> = {
  AwaitingWorker: "bg-amber-50 text-amber-700 border-amber-200",
  Confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  Declined: "bg-gray-100 text-gray-500 border-gray-200",
  Cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

function formatDateTime(d: string | Date): string {
  return new Date(d).toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function InterviewRequestsPanel() {
  const api = useAuthedBackend();
  const [requests, setRequests] = useState<InterviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.employers.listWorkerInterviewRequests();
      setRequests(res.requests);
    } catch (e: unknown) {
      console.error("Failed to load interview requests:", e);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async (requestId: string, confirmedSlot: string) => {
    if (!api) return;
    setActioningId(requestId);
    setError(null);
    try {
      const updated = await api.employers.confirmInterviewRequestSlot({ requestId, confirmedSlot });
      setRequests((prev) => prev.map((r) => r.id === requestId ? updated : r));
    } catch (e: unknown) {
      console.error("Failed to confirm slot:", e);
      setError(e instanceof Error ? e.message : "Failed to confirm slot");
    } finally {
      setActioningId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    if (!api) return;
    if (!confirm("Decline this interview request?")) return;
    setActioningId(requestId);
    setError(null);
    try {
      const updated = await api.employers.declineInterviewRequest({ requestId });
      setRequests((prev) => prev.map((r) => r.id === requestId ? updated : r));
    } catch (e: unknown) {
      console.error("Failed to decline:", e);
      setError(e instanceof Error ? e.message : "Failed to decline");
    } finally {
      setActioningId(null);
    }
  };

  const pending = requests.filter((r) => r.status === "AwaitingWorker");
  const others = requests.filter((r) => r.status !== "AwaitingWorker");

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />Loading interview requests…
      </div>
    );
  }

  if (requests.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-extrabold text-gray-900">Interview Requests</h2>
        {pending.length > 0 && (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500 text-white text-xs font-bold">
            {pending.length}
          </span>
        )}
      </div>

      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <UserCheck className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            {pending.length} employer{pending.length !== 1 ? "s" : ""} want{pending.length === 1 ? "s" : ""} to interview you — pick a time!
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="space-y-3">
        {pending.map((req) => (
          <InterviewRequestCard
            key={req.id}
            request={req}
            actioning={actioningId === req.id}
            onConfirm={(slot) => handleConfirm(req.id, slot)}
            onDecline={() => handleDecline(req.id)}
          />
        ))}
      </div>

      {others.length > 0 && (
        <details className="group">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 list-none flex items-center gap-1">
            <span className="group-open:hidden">Show {others.length} past request{others.length !== 1 ? "s" : ""}</span>
            <span className="hidden group-open:inline">Hide past requests</span>
          </summary>
          <div className="mt-2 space-y-2">
            {others.map((req) => (
              <InterviewRequestCard
                key={req.id}
                request={req}
                actioning={false}
                onConfirm={() => {}}
                onDecline={() => {}}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function InterviewRequestCard({
  request,
  actioning,
  onConfirm,
  onDecline,
}: {
  request: InterviewRequest;
  actioning: boolean;
  onConfirm: (slot: string) => void;
  onDecline: () => void;
}) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const isAwaiting = request.status === "AwaitingWorker";

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${
      isAwaiting ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-200 opacity-75"
    }`}>
      {isAwaiting && <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />}

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shrink-0">
              <Building2 className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[request.status]}`}>
                {isAwaiting && <UserCheck className="h-3 w-3" />}
                {request.status === "Confirmed" && <CheckCircle2 className="h-3 w-3" />}
                {isAwaiting ? "Pick your time" : request.status}
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {request.durationMinutes >= 60
                  ? `${request.durationMinutes / 60}h${request.durationMinutes % 60 ? ` ${request.durationMinutes % 60}min` : ""}`
                  : `${request.durationMinutes} min`} interview
              </div>
            </div>
          </div>
          {isAwaiting && (
            <button
              onClick={onDecline}
              disabled={actioning}
              className="shrink-0 text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />Decline
            </button>
          )}
        </div>

        {request.status === "Confirmed" && request.confirmedSlot && (
          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
            <CalendarDays className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            Confirmed: {formatDateTime(request.confirmedSlot)}
          </div>
        )}

        {request.location && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {request.location}
          </div>
        )}
        {request.notes && (
          <div className="flex items-start gap-1.5 text-xs text-gray-500">
            <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="italic">{request.notes}</span>
          </div>
        )}

        {isAwaiting && request.suggestedSlots.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-700">Choose a time that works for you:</p>
            <div className="space-y-1.5">
              {request.suggestedSlots.map((slot) => (
                <label
                  key={slot}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                    selectedSlot === slot
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/40"
                  }`}
                >
                  <input
                    type="radio"
                    name={`req-slot-${request.id}`}
                    value={slot}
                    checked={selectedSlot === slot}
                    onChange={() => setSelectedSlot(slot)}
                    className="accent-blue-600"
                  />
                  <span className="text-xs font-medium text-gray-800">{formatDateTime(slot)}</span>
                </label>
              ))}
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!selectedSlot || actioning}
              onClick={() => selectedSlot && onConfirm(selectedSlot)}
            >
              {actioning
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Confirming…</>
                : "Confirm This Time"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
