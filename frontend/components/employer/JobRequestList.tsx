import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, ChevronRight, Zap } from "lucide-react";
import type { JobRequest } from "~backend/jobs/get";

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground border-transparent",
  Open: "bg-green-500/15 text-green-400 border-transparent",
  Closed: "bg-blue-500/15 text-blue-400 border-transparent",
  Cancelled: "bg-red-500/15 text-red-400 border-transparent",
};

interface Props {
  jobs: JobRequest[];
  onNew: () => void;
  onView: (job: JobRequest) => void;
}

export function JobRequestList({ jobs, onNew, onView }: Props) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Job Requests</h2>
          {jobs.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{jobs.length}</span>
          )}
        </div>
        <Button size="sm" onClick={onNew}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />New Job
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Briefcase className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No job requests yet.</p>
          <Button size="sm" variant="outline" onClick={onNew}>Create your first job request</Button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {jobs.map((job) => (
            <button
              key={job.jobId}
              onClick={() => onView(job)}
              className="w-full text-left py-3 flex items-center gap-3 hover:bg-muted/40 -mx-1 px-1 rounded transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground truncate">{job.location}</span>
                  <Badge className={`text-xs ${STATUS_COLORS[job.status]}`}>{job.status}</Badge>
                  {job.isEmergency && (
                    <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-semibold">
                      <Zap className="h-3 w-3" />Emergency
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {job.jobType === "general"
                    ? <span className="italic">General Job</span>
                    : <>{toDateStr(job.shiftDate)} &bull; {job.shiftStartTime} &bull; {job.shiftDurationHours}h</>}
                   &bull; ${job.weekdayRate}/hr
                </p>
                {job.supportTypeTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {job.supportTypeTags.slice(0, 3).map((t) => (
                      <span key={t} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                    {job.supportTypeTags.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{job.supportTypeTags.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
