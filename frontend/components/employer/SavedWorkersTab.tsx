import { useState, useEffect, useCallback } from "react";
import {
  Heart, MapPin, Star, Car, FileCheck, Loader2, Send,
  CheckCircle2, AlertCircle, BadgeCheck, Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LastOnlineBadge } from "../LastOnlineBadge";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { WorkerProfileDrawer } from "./WorkerProfileDrawer";
import type { WorkerSummary } from "~backend/workers/browse";

const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

function VerificationBadge({ score }: { score: number }) {
  if (score === 100) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
        <CheckCircle2 className="h-3 w-3" />Verified Worker ✅
      </span>
    );
  }
  if (score >= 80) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
        <CheckCircle2 className="h-3 w-3" />Priority Profile
      </span>
    );
  }
  if (score >= 50) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
        <AlertCircle className="h-3 w-3" />In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
      <AlertCircle className="h-3 w-3" />Getting Started
    </span>
  );
}

export function SavedWorkersTab() {
  const api = useAuthedBackend();
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<WorkerSummary | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const savedIds = new Set(workers.map((w) => w.workerId));

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.employers.listSavedWorkers();
      setWorkers(res.workers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnsave = useCallback(async (workerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!api || savingIds.has(workerId)) return;
    setSavingIds((prev) => new Set(prev).add(workerId));
    try {
      await api.employers.unsaveWorker({ workerId });
      setWorkers((prev) => prev.filter((w) => w.workerId !== workerId));
      if (selectedWorker?.workerId === workerId) setSelectedWorker(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingIds((prev) => { const s = new Set(prev); s.delete(workerId); return s; });
    }
  }, [api, savingIds, selectedWorker]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Saved Workers</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your shortlisted workers. Click a card to view their full profile or send an offer.
        </p>
      </div>

      {workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Heart className="h-10 w-10 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium text-foreground">No saved workers yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Browse workers and click the heart icon to shortlist workers you're interested in.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {workers.length} saved worker{workers.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {workers.map((w) => (
              <SavedWorkerCard
                key={w.workerId}
                worker={w}
                saving={savingIds.has(w.workerId)}
                onClick={() => setSelectedWorker(w)}
                onUnsave={(e) => handleUnsave(w.workerId, e)}
              />
            ))}
          </div>
        </div>
      )}

      <WorkerProfileDrawer
        worker={selectedWorker}
        savedIds={savedIds}
        savingIds={savingIds}
        onToggleSave={handleUnsave}
        onClose={() => setSelectedWorker(null)}
      />
    </div>
  );
}

interface SavedWorkerCardProps {
  worker: WorkerSummary;
  saving: boolean;
  onClick: () => void;
  onUnsave: (e: React.MouseEvent) => void;
}

function SavedWorkerCard({ worker, saving, onClick, onUnsave }: SavedWorkerCardProps) {
  const days = Array.isArray(worker.availableDays) ? worker.availableDays : [];

  return (
    <div
      className={`rounded-lg border bg-card p-4 space-y-3 cursor-pointer transition-all ${
        worker.isFullyVerified
          ? "border-green-200 ring-1 ring-green-100 hover:border-green-400 hover:ring-green-200"
          : worker.priorityBoost
          ? "border-primary/50 ring-1 ring-primary/20 hover:border-primary"
          : "border-border hover:border-primary/40"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <VerificationBadge score={worker.verificationScore} />
          {worker.docsVerified && !worker.isFullyVerified && (
            <span className="flex items-center gap-0.5 text-[11px] text-green-600">
              <BadgeCheck className="h-3 w-3" />Docs
            </span>
          )}
          {worker.refsVerified && !worker.isFullyVerified && (
            <span className="flex items-center gap-0.5 text-[11px] text-blue-600">
              <Shield className="h-3 w-3" />Refs
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LastOnlineBadge lastLoginAt={worker.lastLoginAt} />
          <button
            onClick={onUnsave}
            disabled={saving}
            className="p-1 rounded-full text-rose-500 hover:text-rose-600 transition-colors"
            title="Remove from shortlist"
          >
            <Heart className={`h-4 w-4 fill-rose-500 ${saving ? "animate-pulse" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {worker.avatarUrl ? (
            <img
              src={worker.avatarUrl}
              alt={worker.fullName ?? worker.name}
              className="h-10 w-10 rounded-full object-cover shrink-0 border border-border"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
              <span className="text-sm font-semibold text-muted-foreground">
                {(worker.fullName ?? worker.name).charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              {worker.fullName ?? worker.name}
            </p>
            {worker.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />{worker.location}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {worker.averageRating != null && (
            <span className="flex items-center gap-0.5 text-xs text-yellow-400">
              <Star className="h-3 w-3 fill-yellow-400" />
              {worker.averageRating.toFixed(1)}
              <span className="text-muted-foreground">({worker.reviewCount})</span>
            </span>
          )}
          <div className="flex items-center gap-1.5">
            {worker.driversLicense && (
              <span title="Driver's license" className="text-muted-foreground">
                <FileCheck className="h-3.5 w-3.5" />
              </span>
            )}
            {worker.vehicleAccess && (
              <span title="Own vehicle" className="text-muted-foreground">
                <Car className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>
      </div>

      {worker.bio && (
        <p className="text-xs text-muted-foreground line-clamp-2">{worker.bio}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {worker.experienceYears != null && (
          <Badge variant="outline" className="text-xs">{worker.experienceYears}yr exp</Badge>
        )}
        {worker.minimumPayRate != null && (
          <Badge variant="outline" className="text-xs">${worker.minimumPayRate}/hr min</Badge>
        )}
        {days.slice(0, 4).map((d) => (
          <Badge key={d} variant="secondary" className="text-xs">{DAY_LABELS[d.toLowerCase()] ?? d}</Badge>
        ))}
        {days.length > 4 && (
          <span className="text-xs text-muted-foreground">+{days.length - 4}</span>
        )}
      </div>

      {worker.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {worker.skills.slice(0, 3).map((s) => (
            <span key={s} className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{s}</span>
          ))}
          {worker.skills.length > 3 && (
            <span className="text-[11px] text-muted-foreground">+{worker.skills.length - 3} more</span>
          )}
        </div>
      )}

      <div className="pt-1">
        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <Send className="h-3.5 w-3.5" />View Profile &amp; Send Offer
        </Button>
      </div>
    </div>
  );
}
