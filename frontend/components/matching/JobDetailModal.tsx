import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Calendar, DollarSign, Zap, X, CheckCircle, Loader2 } from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { MatchedJob } from "~backend/matching/match_jobs";

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
}

interface Props {
  job: MatchedJob | null;
  onClose: () => void;
}

export function JobDetailModal({ job, onClose }: Props) {
  const api = useAuthedBackend();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!job) return null;

  const handleExpressInterest = async () => {
    if (!api) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.jobs.expressJobInterest({ jobId: job.jobId, note: note.trim() || undefined });
      setSubmitted(true);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to express interest");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-foreground">{job.location}</h2>
            {job.isEmergency && (
              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-semibold">
                <Zap className="h-3 w-3" />Emergency
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium text-foreground">{toDateStr(job.shiftDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Start Time</p>
                <p className="font-medium text-foreground">{job.shiftStartTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-medium text-foreground">{job.shiftDurationHours}h</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="font-medium text-foreground">
                  {job.distanceKm != null ? `${job.distanceKm} km` : "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />Rates
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-semibold text-primary">
                ${job.weekdayRate.toFixed(2)}/hr{" "}
                <span className="font-normal text-muted-foreground text-xs">weekday</span>
              </span>
              <span className="font-semibold text-foreground">
                ${job.weekendRate.toFixed(2)}/hr{" "}
                <span className="font-normal text-muted-foreground text-xs">weekend</span>
              </span>
              <span className="font-semibold text-foreground">
                ${job.publicHolidayRate.toFixed(2)}/hr{" "}
                <span className="font-normal text-muted-foreground text-xs">public holiday</span>
              </span>
            </div>
          </div>

          {job.supportTypeTags.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Support Types</p>
              <div className="flex flex-wrap gap-1.5">
                {job.supportTypeTags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {job.genderPreference && job.genderPreference !== "No preference" && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground">Gender Preference</p>
              <p className="text-foreground">{job.genderPreference}</p>
            </div>
          )}

          {job.ageRangePreference && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground">Age Range</p>
              <p className="text-foreground">{job.ageRangePreference}</p>
            </div>
          )}

          {job.clientNotes && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground">Client Notes</p>
              <p className="text-foreground whitespace-pre-wrap">{job.clientNotes}</p>
            </div>
          )}

          {job.behaviouralConsiderations && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground">Behavioural Considerations</p>
              <p className="text-foreground whitespace-pre-wrap">{job.behaviouralConsiderations}</p>
            </div>
          )}

          {job.medicalRequirements && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground">Medical Requirements</p>
              <p className="text-foreground whitespace-pre-wrap">{job.medicalRequirements}</p>
            </div>
          )}

          {job.responseDeadline && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-sm">
              <p className="text-xs text-amber-400/80">Response Deadline</p>
              <p className="text-amber-400 font-medium">
                {new Date(job.responseDeadline).toLocaleString()}
              </p>
            </div>
          )}

          <div className="border-t border-border pt-4 space-y-3">
            {submitted ? (
              <div className="flex items-center gap-2 text-sm text-green-400 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Interest expressed! The employer will be notified.
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-foreground">Express Interest</p>
                <textarea
                  className="w-full rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="Optional: introduce yourself or mention relevant experience…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={handleExpressInterest}
                    disabled={submitting}
                  >
                    {submitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Sending…</> : "Express Interest"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
