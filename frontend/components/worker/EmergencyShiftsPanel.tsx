import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Loader2 } from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
}

interface EmergencyJob {
  jobId: string;
  location: string;
  shiftDate: string | null;
  shiftStartTime: string | null;
  shiftDurationHours: number | null;
  weekdayRate: number;
  supportTypeTags: string[];
  responseDeadline: Date | null;
}

export function EmergencyShiftsPanel() {
  const api = useAuthedBackend();
  const [jobs, setJobs] = useState<EmergencyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [expressing, setExpressing] = useState<string | null>(null);
  const [expressed, setExpressed] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.jobs.listEmergencyJobs();
      setJobs(
        res.jobs.map((j) => ({
          jobId: j.jobId,
          location: j.location,
          shiftDate: toDateStr(j.shiftDate),
          shiftStartTime: j.shiftStartTime,
          shiftDurationHours: j.shiftDurationHours,
          weekdayRate: j.weekdayRate,
          supportTypeTags: j.supportTypeTags,
          responseDeadline: j.responseDeadline,
        }))
      );
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleExpress = async (jobId: string) => {
    if (!api) return;
    setExpressing(jobId);
    try {
      await api.jobs.expressInterest({ jobId, note: note || undefined });
      setExpressed((prev) => new Set([...prev, jobId]));
      setNote("");
    } catch (e: unknown) {
      console.error("Failed to express interest:", e);
    } finally {
      setExpressing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading emergency shifts…
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6 italic">
        No emergency shifts available right now.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <Card key={job.jobId} className="p-4 border-orange-500/20 bg-orange-500/5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-400 shrink-0" />
                <p className="font-semibold text-sm text-foreground">{job.location}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {job.shiftDate ? <>{job.shiftDate} &bull; {job.shiftStartTime} &bull; {job.shiftDurationHours}h</> : <span className="italic">General Job</span>}
              </p>
              <p className="text-sm font-medium text-primary mt-1">${job.weekdayRate.toFixed(2)}/hr</p>
              {job.supportTypeTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {job.supportTypeTags.map((t) => (
                    <span key={t} className="text-xs bg-secondary px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              )}
              {job.responseDeadline && (
                <p className="text-xs text-orange-400 mt-1">
                  Respond by {new Date(job.responseDeadline).toLocaleString()}
                </p>
              )}
            </div>
            <div className="shrink-0">
              {expressed.has(job.jobId) ? (
                <span className="text-xs text-green-400 font-medium">Interest expressed</span>
              ) : (
                <Button
                  size="sm"
                  disabled={expressing === job.jobId}
                  onClick={() => handleExpress(job.jobId)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {expressing === job.jobId ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Zap className="h-3 w-3 mr-1" />
                  )}
                  I'm Available
                </Button>
              )}
            </div>
          </div>
          {!expressed.has(job.jobId) && (
            <textarea
              rows={1}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Add a note (optional)…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Card>
      ))}
    </div>
  );
}
