import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Clock, MapPin, FileText, Plus, XCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookInterviewModal } from "./BookInterviewModal";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { InterviewBooking } from "~backend/offers/interviews";

interface Props {
  offerId: string;
  workerName: string;
  role: "EMPLOYER" | "WORKER";
}

const STATUS_STYLE: Record<InterviewBooking["status"], string> = {
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

function formatDateTime(d: Date): string {
  const date = new Date(d);
  return date.toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function InterviewPanel({ offerId, workerName, role }: Props) {
  const api = useAuthedBackend();
  const [interviews, setInterviews] = useState<InterviewBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.offers.listInterviews({ offerId });
      setInterviews(res.interviews);
    } catch (e: unknown) {
      console.error("Failed to load interviews:", e);
    } finally {
      setLoading(false);
    }
  }, [api, offerId]);

  useEffect(() => { load(); }, [load]);

  const handleBooked = (interview: InterviewBooking) => {
    setInterviews((prev) => [...prev, interview].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    ));
  };

  const handleCancel = async (id: string) => {
    if (!api) return;
    if (!confirm("Cancel this interview?")) return;
    setCancellingId(id);
    setError(null);
    try {
      const updated = await api.offers.cancelInterview({ offerId, interviewId: id });
      setInterviews((prev) => prev.map((i) => i.id === id ? updated : i));
    } catch (e: unknown) {
      console.error("Failed to cancel interview:", e);
      setError(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />Loading interviews…
      </div>
    );
  }

  const active = interviews.filter((i) => i.status !== "Cancelled");
  const cancelled = interviews.filter((i) => i.status === "Cancelled");

  return (
    <div className="space-y-3">
      {role === "EMPLOYER" && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Book Interview
        </Button>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {interviews.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          {role === "EMPLOYER"
            ? "No interviews booked yet. Use the button above to schedule one."
            : "No interviews have been scheduled yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {active.map((interview) => (
            <InterviewCard
              key={interview.id}
              interview={interview}
              role={role}
              cancelling={cancellingId === interview.id}
              onCancel={() => handleCancel(interview.id)}
            />
          ))}
          {cancelled.length > 0 && (
            <details className="group">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 list-none flex items-center gap-1">
                <span className="group-open:hidden">Show {cancelled.length} cancelled</span>
                <span className="hidden group-open:inline">Hide cancelled</span>
              </summary>
              <div className="mt-2 space-y-2">
                {cancelled.map((interview) => (
                  <InterviewCard
                    key={interview.id}
                    interview={interview}
                    role={role}
                    cancelling={false}
                    onCancel={() => {}}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <BookInterviewModal
        open={modalOpen}
        offerId={offerId}
        workerName={workerName}
        onClose={() => setModalOpen(false)}
        onBooked={handleBooked}
      />
    </div>
  );
}

function InterviewCard({
  interview,
  role,
  cancelling,
  onCancel,
}: {
  interview: InterviewBooking;
  role: "EMPLOYER" | "WORKER";
  cancelling: boolean;
  onCancel: () => void;
}) {
  const isPast = new Date(interview.scheduledAt) < new Date();

  return (
    <div className={`rounded-xl border px-4 py-3 space-y-2 ${
      interview.status === "Cancelled" ? "opacity-60" : ""
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[interview.status]}`}>
              {interview.status === "Completed" && <CheckCircle2 className="h-3 w-3" />}
              {interview.status}
            </span>
            {isPast && interview.status === "Scheduled" && (
              <span className="text-[10px] text-orange-600 font-semibold">Past</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <CalendarDays className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            {formatDateTime(interview.scheduledAt)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {interview.durationMinutes >= 60
              ? `${interview.durationMinutes / 60}h${interview.durationMinutes % 60 ? ` ${interview.durationMinutes % 60}min` : ""}`
              : `${interview.durationMinutes} min`}
          </div>
          {interview.location && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{interview.location}</span>
            </div>
          )}
          {interview.notes && (
            <div className="flex items-start gap-1.5 text-xs text-gray-500">
              <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="italic">{interview.notes}</span>
            </div>
          )}
        </div>

        {role === "EMPLOYER" && interview.status === "Scheduled" && (
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="shrink-0 text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
          >
            {cancelling
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <XCircle className="h-3.5 w-3.5" />}
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
