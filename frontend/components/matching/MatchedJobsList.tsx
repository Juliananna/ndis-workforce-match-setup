import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2, Navigation, Star, Zap } from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { MatchedJob } from "~backend/matching/match_jobs";

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
}

interface Props {
  onExpressInterest?: (jobId: string) => void;
  onJobClick?: (job: MatchedJob) => void;
}

export function MatchedJobsList({ onExpressInterest, onJobClick }: Props) {
  const api = useAuthedBackend();
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasGeoFilter, setHasGeoFilter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.matching.matchJobsForWorker();
      setJobs(res.jobs);
      setHasGeoFilter(res.hasGeoFilter);
    } catch (e: unknown) {
      console.error("Failed to load matched jobs:", e);
      setError(e instanceof Error ? e.message : "Failed to load matched jobs");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />Finding matched jobs…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {hasGeoFilter ? (
          <><Navigation className="h-3.5 w-3.5" />Sorted by skill match + distance</>
        ) : (
          <><MapPin className="h-3.5 w-3.5" />No location set — add your coordinates in profile to enable geo-sorting</>
        )}
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-4">No matching jobs found yet.</p>
      ) : (
        jobs.map((job) => (
          <Card
            key={job.jobId}
            className="p-4 space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => onJobClick?.(job)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm text-foreground">{job.location}</p>
                  {job.isEmergency && (
                    <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-semibold">
                      <Zap className="h-3 w-3" />Emergency
                    </span>
                  )}
                  {job.distanceKm != null && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />{job.distanceKm}km
                    </span>
                  )}
                  {job.matchScore > 0 && (
                    <span className="text-xs text-yellow-400 flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-yellow-400" />{job.matchScore} skill{job.matchScore !== 1 ? "s" : ""} matched
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {toDateStr(job.shiftDate)} &bull; {job.shiftStartTime} &bull; {job.shiftDurationHours}h
                </p>
                <p className="text-sm font-semibold text-primary mt-1">${job.weekdayRate.toFixed(2)}/hr</p>
                {job.supportTypeTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {job.supportTypeTags.slice(0, 4).map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                    {job.supportTypeTags.length > 4 && (
                      <span className="text-xs text-muted-foreground">+{job.supportTypeTags.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {job.isEmergency && onExpressInterest && (
              <button
                className="text-xs text-orange-400 hover:underline"
                onClick={() => onExpressInterest(job.jobId)}
              >
                Express interest →
              </button>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
