import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2, Send, Navigation, Star, BadgeCheck, Shield } from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { MatchedWorker } from "~backend/matching/match_workers";

interface Props {
  jobId: string;
  jobRate: number;
  onSendOffer?: (workerId: string, workerName: string) => void;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : score >= 40
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${color}`}>
      <Star className="h-3 w-3" />
      {score}% match
    </span>
  );
}

export function MatchedWorkersList({ jobId, onSendOffer }: Props) {
  const api = useAuthedBackend();
  const [workers, setWorkers] = useState<MatchedWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasGeoFilter, setHasGeoFilter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.matching.matchWorkersForJob({ jobId });
      setWorkers(res.workers);
      setHasGeoFilter(res.hasGeoFilter);
    } catch (e: unknown) {
      console.error("Failed to load matched workers:", e);
      setError(e instanceof Error ? e.message : "Failed to load matched workers");
    } finally {
      setLoading(false);
    }
  }, [api, jobId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />Finding matched workers…
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
          <><Navigation className="h-3.5 w-3.5" />Ranked by compatibility score — skills, availability, proximity, experience</>
        ) : (
          <><MapPin className="h-3.5 w-3.5" />No job location set — ranked by skills and experience · add lat/lng to enable geo-ranking</>
        )}
      </div>

      {workers.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-4">No matching workers found.</p>
      ) : (
        workers.map((w) => (
          <Card key={w.workerId} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm text-foreground">{w.name}</p>
                  {w.priorityBoost && (
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-primary">
                      <Star className="h-3 w-3 fill-primary" />Priority
                    </span>
                  )}
                  {w.docsVerifiedPurchased && (
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-green-600">
                      <BadgeCheck className="h-3 w-3" />Verified Docs
                    </span>
                  )}
                  {w.refsPurchased && (
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-blue-600">
                      <Shield className="h-3 w-3" />Ref Checked
                    </span>
                  )}
                  <ScoreBadge score={w.compatibilityScore} />
                  {w.distanceKm != null && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />{w.distanceKm}km
                    </span>
                  )}
                </div>
                {w.location && <p className="text-xs text-muted-foreground">{w.location}</p>}

                {w.matchReasons.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {w.matchReasons.map((r) => (
                      <span key={r} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{r}</span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {w.driversLicense && <Badge variant="outline" className="text-xs">Driver's Licence</Badge>}
                  {w.vehicleAccess && <Badge variant="outline" className="text-xs">Vehicle</Badge>}
                  {w.experienceYears != null && (
                    <Badge variant="outline" className="text-xs">{w.experienceYears}yr exp</Badge>
                  )}
                  {w.minimumPayRate != null && (
                    <Badge variant="outline" className="text-xs">Min ${w.minimumPayRate}/hr</Badge>
                  )}
                </div>
                {w.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {w.skills.slice(0, 5).map((s) => (
                      <span key={s} className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                    {w.skills.length > 5 && <span className="text-xs text-muted-foreground">+{w.skills.length - 5}</span>}
                  </div>
                )}
              </div>
              {onSendOffer && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-7 text-xs"
                  onClick={() => onSendOffer(w.workerId, w.name)}
                >
                  <Send className="h-3 w-3 mr-1" />Offer
                </Button>
              )}
            </div>
            {w.bio && <p className="text-xs text-muted-foreground line-clamp-2">{w.bio}</p>}
          </Card>
        ))
      )}
    </div>
  );
}
