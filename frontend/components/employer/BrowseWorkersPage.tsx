import { useState, useCallback, useEffect } from "react";
import { Search, MapPin, Star, Car, FileCheck, Loader2, ChevronDown, ChevronUp, X, BadgeCheck, Shield } from "lucide-react";
import { LastOnlineBadge } from "../LastOnlineBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { WorkerProfileDrawer } from "./WorkerProfileDrawer";
import { VALID_SKILLS } from "~backend/workers/skill_tags";
import type { WorkerSummary } from "~backend/workers/browse";
import { LocationAutocomplete } from "../LocationAutocomplete";

const ALL_SKILLS = [...VALID_SKILLS];

const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const DEFAULT_RADIUS_KM = 50;

export function BrowseWorkersPage() {
  const api = useAuthedBackend();

  const [query, setQuery] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [driversLicense, setDriversLicense] = useState(false);
  const [vehicleAccess, setVehicleAccess] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [geoLocation, setGeoLocation] = useState<{ address: string; latitude: number; longitude: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [orgLocationLoaded, setOrgLocationLoaded] = useState(false);

  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedWorker, setSelectedWorker] = useState<WorkerSummary | null>(null);

  useEffect(() => {
    if (!api || orgLocationLoaded) return;
    setOrgLocationLoaded(true);
    api.employers.getEmployerProfile().then((profile) => {
      if (profile.latitude != null && profile.longitude != null && profile.location) {
        setGeoLocation({
          address: profile.location,
          latitude: profile.latitude,
          longitude: profile.longitude,
        });
      }
    }).catch(() => {});
  }, [api, orgLocationLoaded]);

  const search = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await api.workers.browseWorkers({
        query: query.trim() || undefined,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
        driversLicense: driversLicense || undefined,
        vehicleAccess: vehicleAccess || undefined,
        latitude: geoLocation?.latitude,
        longitude: geoLocation?.longitude,
        maxDistanceKm: geoLocation ? radiusKm : undefined,
        limit: 50,
      });
      setWorkers(res.workers);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [api, query, selectedSkills, driversLicense, vehicleAccess, geoLocation, radiusKm]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const clearFilters = () => {
    setSelectedSkills([]);
    setDriversLicense(false);
    setVehicleAccess(false);
  };

  const activeFilterCount = selectedSkills.length + (driversLicense ? 1 : 0) + (vehicleAccess ? 1 : 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Browse Workers</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Search and filter NDIS support workers to find the right match for your clients.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Search by name, location, qualifications…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
          </div>
          <Button onClick={search} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Location radius
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <LocationAutocomplete
                value={geoLocation?.address ?? ""}
                onChange={(r) => setGeoLocation(r)}
                placeholder="Search suburb or address…"
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number"
                min={1}
                max={500}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Math.max(1, Number(e.target.value)))}
                className="w-20 h-9 text-sm"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">km</span>
            </div>
          </div>
          {geoLocation && (
            <p className="text-xs text-muted-foreground">
              Showing workers within {radiusKm}km of {geoLocation.address}
            </p>
          )}
          {!geoLocation && (
            <p className="text-xs text-muted-foreground italic">
              No location set — set your organisation location in your profile to enable radius filtering by default.
            </p>
          )}
        </div>

        <div>
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            {filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            More filters
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filtersOpen && (
            <div className="mt-3 rounded-lg border border-border bg-card p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SKILLS.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        selectedSkills.includes(skill)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={driversLicense}
                    onChange={(e) => setDriversLicense(e.target.checked)}
                  />
                  <Car className="h-3.5 w-3.5 text-muted-foreground" />
                  Driver's license
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={vehicleAccess}
                    onChange={(e) => setVehicleAccess(e.target.checked)}
                  />
                  <Car className="h-3.5 w-3.5 text-muted-foreground" />
                  Own vehicle
                </label>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />Searching…
        </div>
      )}

      {!loading && searched && workers.length === 0 && (
        <p className="text-sm text-muted-foreground italic text-center py-8">
          No workers found. Try adjusting your search or filters.
        </p>
      )}

      {!loading && !searched && (
        <p className="text-sm text-muted-foreground italic text-center py-8">
          Enter a search term or apply filters, then click Search.
        </p>
      )}

      {!loading && workers.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{workers.length} worker{workers.length !== 1 ? "s" : ""} found</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {workers.map((w) => (
              <WorkerCard key={w.workerId} worker={w} onClick={() => setSelectedWorker(w)} />
            ))}
          </div>
        </div>
      )}

      <WorkerProfileDrawer
        worker={selectedWorker}
        onClose={() => setSelectedWorker(null)}
      />
    </div>
  );
}

function WorkerCard({ worker, onClick }: { worker: WorkerSummary; onClick: () => void }) {
  const days = Array.isArray(worker.availableDays) ? worker.availableDays : [];
  return (
    <div
      className={`rounded-lg border bg-card p-4 space-y-3 cursor-pointer transition-colors ${
        worker.priorityBoost
          ? "border-primary/50 ring-1 ring-primary/20 hover:border-primary"
          : "border-border hover:border-primary/40"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        {worker.priorityBoost ? (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
            <Star className="h-3 w-3 fill-primary" />
            Priority Worker
            {worker.docsVerified && (
              <span className="flex items-center gap-0.5 text-green-600">
                <BadgeCheck className="h-3 w-3" /> Verified Docs
              </span>
            )}
            {worker.refsVerified && (
              <span className="flex items-center gap-0.5 text-blue-600">
                <Shield className="h-3 w-3" /> Ref Checked
              </span>
            )}
          </div>
        ) : (
          <span />
        )}
        <LastOnlineBadge lastLoginAt={worker.lastLoginAt} />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {worker.fullName ?? worker.name}
          </p>
          {worker.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              {worker.location}
              {worker.distanceKm != null && ` · ${worker.distanceKm}km`}
            </p>
          )}
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
    </div>
  );
}
