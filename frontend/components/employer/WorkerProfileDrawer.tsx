import { useState, useEffect, useCallback } from "react";
import {
  X, Star, MapPin, Car, FileCheck, Briefcase, Loader2,
  ChevronRight, Send, Users, CheckCircle, Lock,
} from "lucide-react";
import { LastOnlineBadge } from "../LastOnlineBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { WorkerSummary } from "~backend/workers/browse";
import type { JobRequest } from "~backend/jobs/get";
import type { ReferencesSummary } from "~backend/workers/references";

interface Props {
  worker: WorkerSummary | null;
  onClose: () => void;
}

type DrawerView = "profile" | "send-offer";

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
}

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

export function WorkerProfileDrawer({ worker, onClose }: Props) {
  const api = useAuthedBackend();
  const [view, setView] = useState<DrawerView>("profile");
  const [refSummary, setRefSummary] = useState<ReferencesSummary | null>(null);

  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [offeredRate, setOfferedRate] = useState("");
  const [offerNotes, setOfferNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSent, setOfferSent] = useState(false);

  const loadJobs = useCallback(async () => {
    if (!api) return;
    setJobsLoading(true);
    try {
      const res = await api.jobs.listJobRequests();
      setJobs(res.jobs.filter((j) => j.status === "Open" || j.status === "Draft"));
    } catch (e) {
      console.error(e);
    } finally {
      setJobsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (worker) {
      setView("profile");
      setOfferSent(false);
      setOfferError(null);
      setSelectedJobId("");
      setOfferedRate("");
      setOfferNotes("");
      setRefSummary(null);
      if (api) {
        api.workers.getReferencesForEmployer({ workerId: worker.workerId })
          .then((res) => setRefSummary(res.summary))
          .catch(() => {});
      }
    }
  }, [worker, api]);

  useEffect(() => {
    if (view === "send-offer") loadJobs();
  }, [view, loadJobs]);

  useEffect(() => {
    if (selectedJobId) {
      const job = jobs.find((j) => j.jobId === selectedJobId);
      if (job) setOfferedRate(job.weekdayRate.toFixed(2));
    }
  }, [selectedJobId, jobs]);

  const handleSendOffer = async () => {
    if (!api || !worker) return;
    if (!selectedJobId) { setOfferError("Select a job"); return; }
    const rate = parseFloat(offeredRate);
    if (isNaN(rate) || rate < 0) { setOfferError("Enter a valid rate"); return; }

    setSending(true);
    setOfferError(null);
    try {
      await api.offers.createOffer({
        jobId: selectedJobId,
        workerId: worker.workerId,
        offeredRate: rate,
        additionalNotes: offerNotes.trim() || undefined,
      });
      setOfferSent(true);
    } catch (e: unknown) {
      console.error(e);
      setOfferError(e instanceof Error ? e.message : "Failed to send offer");
    } finally {
      setSending(false);
    }
  };

  if (!worker) return null;

  const sortedDays = [...(Array.isArray(worker.availableDays) ? worker.availableDays : [])].sort(
    (a, b) => DAY_ORDER.indexOf(a.toLowerCase()) - DAY_ORDER.indexOf(b.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      <div
        className="relative h-full w-full max-w-md bg-card border-l border-border shadow-2xl overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4 flex items-center justify-between gap-3">
          {view === "send-offer" ? (
            <button
              onClick={() => setView("profile")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back
            </button>
          ) : (
            <h2 className="text-base font-semibold text-foreground truncate">
              {worker.fullName ?? worker.name}
            </h2>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {view === "profile" && (
          <div className="flex-1 p-5 space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-foreground">{worker.fullName ?? worker.name}</h3>
                    <LastOnlineBadge lastLoginAt={worker.lastLoginAt} />
                  </div>
                  {worker.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />{worker.location}
                      {worker.distanceKm != null && ` · ${worker.distanceKm}km away`}
                    </p>
                  )}
                </div>
                {worker.averageRating != null && (
                  <div className="flex items-center gap-1 text-yellow-400 shrink-0">
                    <Star className="h-4 w-4 fill-yellow-400" />
                    <span className="font-semibold">{worker.averageRating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({worker.reviewCount})</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {worker.driversLicense && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
                    <FileCheck className="h-3 w-3" />Driver's license
                  </span>
                )}
                {worker.vehicleAccess && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
                    <Car className="h-3 w-3" />Own vehicle
                  </span>
                )}
                {worker.travelRadiusKm != null && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
                    <MapPin className="h-3 w-3" />Travels up to {worker.travelRadiusKm}km
                  </span>
                )}
              </div>
            </div>

            {worker.bio && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">About</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{worker.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {worker.experienceYears != null && (
                <div className="rounded-lg bg-muted/30 border border-border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />Experience
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {worker.experienceYears} year{worker.experienceYears !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
              {worker.minimumPayRate != null && (
                <div className="rounded-lg bg-muted/30 border border-border p-3">
                  <p className="text-xs text-muted-foreground">Min. Pay Rate</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    ${worker.minimumPayRate}/hr
                  </p>
                </div>
              )}
            </div>

            {worker.qualifications && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Qualifications</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{worker.qualifications}</p>
              </div>
            )}

            {worker.skills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {worker.skills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {sortedDays.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Availability</p>
                <div className="flex gap-1.5 flex-wrap">
                  {DAY_ORDER.map((day) => (
                    <span
                      key={day}
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        sortedDays.map((d) => d.toLowerCase()).includes(day)
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/20 text-muted-foreground/40"
                      }`}
                    >
                      {DAY_LABELS[day]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />Reference Checks
              </p>
              {refSummary == null ? (
                <p className="text-xs text-muted-foreground/50">Loading…</p>
              ) : refSummary.total === 0 ? (
                <p className="text-xs text-muted-foreground/60">No references added</p>
              ) : (
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-sm font-semibold text-foreground">{refSummary.total} reference{refSummary.total !== 1 ? 's' : ''}</span>
                  {refSummary.verified > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle className="h-3.5 w-3.5" />{refSummary.verified} verified
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/50 ml-auto">
                    <Lock className="h-3 w-3" />Details visible after offer accepted
                  </span>
                </div>
              )}
            </div>

            {worker.introVideoUrl && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Intro Video</p>
                <video
                  src={worker.introVideoUrl}
                  controls
                  className="w-full rounded-lg border border-border"
                />
              </div>
            )}

            <div className="pt-2">
              <Button className="w-full" onClick={() => setView("send-offer")}>
                <Send className="h-4 w-4 mr-2" />Send Offer
              </Button>
            </div>
          </div>
        )}

        {view === "send-offer" && (
          <div className="flex-1 p-5 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Send Offer</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Sending to <span className="font-medium text-foreground">{worker.fullName ?? worker.name}</span>
              </p>
            </div>

            {offerSent ? (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-4 text-sm text-green-400 space-y-1">
                <p className="font-semibold">Offer sent!</p>
                <p className="text-green-400/80">The worker will be notified and can accept, decline or negotiate.</p>
                <button
                  onClick={() => { setOfferSent(false); setView("profile"); }}
                  className="mt-2 text-xs underline text-green-400 hover:text-green-300"
                >
                  Back to profile
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Select Job *</Label>
                  {jobsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading jobs…
                    </div>
                  ) : jobs.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No open jobs. Create a job request first.
                    </p>
                  ) : (
                    <select
                      className="w-full rounded-md border border-border bg-background text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                    >
                      <option value="">Choose a job…</option>
                      {jobs.map((j) => (
                        <option key={j.jobId} value={j.jobId}>
                          {j.location} · {toDateStr(j.shiftDate)} · {j.shiftStartTime}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Offered Rate ($/hr) *</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={offeredRate}
                    onChange={(e) => setOfferedRate(e.target.value)}
                    placeholder="e.g. 45.00"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Additional Notes</Label>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    value={offerNotes}
                    onChange={(e) => setOfferNotes(e.target.value)}
                    placeholder="Any extra details for the worker…"
                  />
                </div>

                {offerError && <p className="text-xs text-destructive">{offerError}</p>}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setView("profile")} disabled={sending}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendOffer}
                    disabled={sending || !selectedJobId || jobs.length === 0}
                    className="flex-1"
                  >
                    {sending ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Sending…</>
                    ) : (
                      <><Send className="h-3.5 w-3.5 mr-1.5" />Send Offer</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
