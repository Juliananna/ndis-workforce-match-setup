import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2, MapPin, Clock, Search, CheckCircle, Zap,
  SlidersHorizontal, Navigation, CalendarDays, Plus
} from "lucide-react";
import { useAuthedBackend } from "../hooks/useAuthedBackend";
import { OfferDetail } from "../components/offers/OfferDetail";
import { JobDetailModal } from "../components/matching/JobDetailModal";
import type { MatchedJob } from "~backend/matching/match_jobs";
import type { Offer, OfferStatus } from "~backend/offers/types";
import type { WorkerRespondRequest } from "~backend/offers/respond";

type View = "list" | "offer-detail";

const RATE_OPTIONS = [45, 55, 65] as const;

const CARE_CATEGORIES = [
  "Physical Support",
  "Community Access",
  "Daily Living",
  "High Intensity",
  "Meal Preparation",
] as const;

function toDateStr(v: unknown): string {
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "");
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function categoryFromTags(tags: string[]): string {
  if (!tags || tags.length === 0) return "";
  const cat = tags[0];
  if (cat.toLowerCase().includes("meal")) return "Meal Support";
  if (cat.toLowerCase().includes("community")) return "Community Access";
  if (cat.toLowerCase().includes("high")) return "High Intensity";
  return cat;
}

function JobCard({ job, onViewDetails }: { job: MatchedJob; onViewDetails: (job: MatchedJob) => void }) {
  const isNew = (Date.now() - new Date(job.createdAt).getTime()) < 48 * 3600 * 1000;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 hover:border-blue-300 hover:shadow-sm transition-all">
      <div className={`h-14 w-14 rounded-xl flex items-center justify-center shrink-0 ${
        job.isEmergency
          ? "bg-gradient-to-br from-orange-500 to-red-600"
          : "bg-gradient-to-br from-teal-600 to-emerald-700"
      }`}>
        {job.isEmergency
          ? <Zap className="h-7 w-7 text-white" />
          : <CheckCircle className="h-7 w-7 text-white/80" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="text-xs font-semibold text-blue-600">
            {job.isEmergency ? "Emergency Shift" : "Matched Employer"}
          </p>
          {isNew && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">NEW</span>
          )}
          {job.isEmergency && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">URGENT</span>
          )}
        </div>
        <p className="font-bold text-gray-900 text-base leading-snug truncate">{job.location}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {job.distanceKm != null ? `${job.distanceKm}km away` : job.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {job.shiftDurationHours}hrs
            {job.shiftStartTime ? ` · ${job.shiftStartTime}` : ""}
          </span>
          {job.supportTypeTags.length > 0 && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {categoryFromTags(job.supportTypeTags)}
            </span>
          )}
          {job.responseDeadline && (
            <span className="text-orange-500 font-semibold">
              Immediate Start
            </span>
          )}
        </div>
        {job.supportTypeTags.length > 1 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {job.supportTypeTags.slice(0, 3).map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{t}</span>
            ))}
            {job.supportTypeTags.length > 3 && (
              <span className="text-xs text-gray-400">+{job.supportTypeTags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 text-right flex flex-col items-end gap-2">
        <div>
          <span className="text-2xl font-extrabold text-gray-900">${job.weekdayRate.toFixed(2)}</span>
          <span className="text-sm text-gray-400">/hr</span>
        </div>
        <button
          onClick={() => onViewDetails(job)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

export default function WorkerOffersPage() {
  const api = useAuthedBackend();
  const [matchedJobs, setMatchedJobs] = useState<MatchedJob[]>([]);
  const [hasGeoFilter, setHasGeoFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [view, setView] = useState<View>("list");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedJob, setSelectedJob] = useState<MatchedJob | null>(null);

  const [minRate, setMinRate] = useState<number | null>(null);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(50);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const [jobsRes, offersRes] = await Promise.allSettled([
        api.matching.matchJobsForWorker(),
        api.offers.listOffers({}),
      ]);
      if (jobsRes.status === "fulfilled") {
        setMatchedJobs(jobsRes.value.jobs);
        setHasGeoFilter(jobsRes.value.hasGeoFilter);
      }
      if (offersRes.status === "fulfilled") {
        setOffers(offersRes.value.offers);
      }
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const filteredJobs = useMemo(() => {
    return matchedJobs.filter((job) => {
      if (minRate !== null && job.weekdayRate < minRate) return false;
      if (hasGeoFilter && job.distanceKm != null && job.distanceKm > maxDistanceKm) return false;
      if (selectedCategories.size > 0) {
        const hasCategory = job.supportTypeTags.some((t) => selectedCategories.has(t) || selectedCategories.has(categoryFromTags([t])));
        const categoryNames = job.supportTypeTags.map((t) => categoryFromTags([t]));
        const hasCategoryName = categoryNames.some((c) => selectedCategories.has(c));
        if (!hasCategory && !hasCategoryName) return false;
      }
      return true;
    });
  }, [matchedJobs, minRate, maxDistanceKm, selectedCategories, hasGeoFilter]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const resetFilters = () => {
    setMinRate(null);
    setMaxDistanceKm(50);
    setSelectedCategories(new Set());
  };

  const handleViewJobDetails = (job: MatchedJob) => {
    setSelectedJob(job);
  };

  const handleWorkerAction = async (req: Omit<WorkerRespondRequest, "offerId">): Promise<Offer> => {
    const updated = await api!.offers.workerRespond({ ...req, offerId: selectedOffer!.offerId });
    setOffers((prev) => prev.map((o) => o.offerId === updated.offerId ? updated : o));
    setSelectedOffer(updated);
    return updated;
  };

  if (view === "offer-detail" && selectedOffer) {
    return (
      <OfferDetail
        offer={selectedOffer}
        role="WORKER"
        onBack={() => { setView("list"); setSelectedOffer(null); }}
        onWorkerAction={handleWorkerAction}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  const pendingOffers = offers.filter((o) => o.status === "Pending" || o.status === "Negotiating");

  return (
    <div className="flex gap-6 min-h-screen">
      <aside className="w-60 shrink-0 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="font-bold text-gray-900 mb-4">Filter Offers</p>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Distance</p>
              <span className="text-xs font-bold text-blue-600">&lt; {maxDistanceKm}km</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Current Location</span>
              <span>50km+</span>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Minimum Hourly Rate</p>
            <div className="flex flex-wrap gap-2">
              {RATE_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRate(minRate === r ? null : r)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    minRate === r
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 text-gray-600 hover:border-blue-400"
                  }`}
                >
                  ${r}/hr
                </button>
              ))}
              <button
                onClick={() => setMinRate(null)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                  minRate === null
                    ? "bg-gray-100 text-gray-800 border-gray-300"
                    : "border-gray-300 text-gray-500 hover:border-gray-400"
                }`}
              >
                Any
              </button>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Care Category</p>
            <div className="space-y-2">
              {CARE_CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    onClick={() => toggleCategory(cat)}
                    className={`h-4 w-4 rounded flex items-center justify-center border transition-colors cursor-pointer ${
                      selectedCategories.has(cat)
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-300 group-hover:border-blue-400"
                    }`}
                  >
                    {selectedCategories.has(cat) && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span
                    onClick={() => toggleCategory(cat)}
                    className="text-sm text-gray-700 select-none"
                  >
                    {cat}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={resetFilters}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-colors"
          >
            Reset All
          </button>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
          <p className="font-bold text-sm mb-1">Boost Your Visibility</p>
          <p className="text-xs text-indigo-200 mb-4">Verified profiles receive 3x more direct job offers.</p>
          <button className="w-full py-2 bg-white text-indigo-700 font-bold text-sm rounded-xl hover:bg-indigo-50 transition-colors">
            Upgrade Now
          </button>
        </div>

        {pendingOffers.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-sm font-bold text-gray-900 mb-3">Received Offers</p>
            <div className="space-y-2">
              {pendingOffers.slice(0, 3).map((offer) => (
                <button
                  key={offer.offerId}
                  onClick={async () => {
                    const full = await api!.offers.getOffer({ offerId: offer.offerId });
                    setSelectedOffer(full);
                    setView("offer-detail");
                  }}
                  className="w-full text-left p-2.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                >
                  <p className="text-xs font-semibold text-gray-800 truncate">{offer.snapshotLocation}</p>
                  <p className="text-xs text-blue-600 font-bold mt-0.5">${(offer.negotiatedRate ?? offer.offeredRate).toFixed(2)}/hr</p>
                </button>
              ))}
              {pendingOffers.length > 3 && (
                <p className="text-xs text-gray-400 text-center">+{pendingOffers.length - 3} more</p>
              )}
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 min-w-0 space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-7 flex items-center justify-between gap-6 relative overflow-hidden">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-500 text-white text-xs font-bold rounded-full mb-3">
              <Zap className="h-3 w-3" />
              NEW OFFERS
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
              {filteredJobs.length > 0
                ? `You have ${filteredJobs.length} new match${filteredJobs.length !== 1 ? "es" : ""} today!`
                : "No matches with current filters"}
            </h2>
            <p className="text-sm text-gray-500 max-w-sm">
              {hasGeoFilter
                ? "Based on your location and skills, these providers are looking for your expertise."
                : "Add your location in Profile to see distance-sorted matches near you."}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm text-xs font-semibold text-gray-600">
              {hasGeoFilter
                ? <><Navigation className="h-3.5 w-3.5 text-blue-600" />Matching…</>
                : <><Search className="h-3.5 w-3.5 text-gray-400" />Location needed</>}
            </div>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center">
              <Search className="h-7 w-7 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700">Looking for something specific?</p>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              Adjust your filters or{" "}
              <button onClick={resetFilters} className="text-blue-600 font-semibold hover:underline">
                update your preferences
              </button>{" "}
              to find more matches.
            </p>
            <button
              onClick={resetFilters}
              className="mt-2 px-5 py-2 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" /> Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <JobCard key={job.jobId} job={job} onViewDetails={handleViewJobDetails} />
            ))}
          </div>
        )}

        {filteredJobs.length > 0 && (
          <div className="py-10 flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-600 text-sm">Looking for something specific?</p>
            <p className="text-xs text-gray-400">
              Adjust your filters or{" "}
              <button onClick={resetFilters} className="text-blue-600 underline font-medium">
                update your preferences
              </button>{" "}
              to find more matches.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={() => {}}
        className="fixed bottom-8 right-8 flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-xl transition-colors"
      >
        <Plus className="h-4 w-4" /> Set Availability
      </button>

      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
