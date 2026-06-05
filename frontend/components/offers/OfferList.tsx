import { OfferStatusBadge } from "./OfferStatusBadge";
import type { Offer, OfferStatus } from "~backend/offers/types";
import { MapPin, Clock, Calendar, DollarSign, ChevronRight, Briefcase, AlertCircle, TrendingUp } from "lucide-react";

function toDateStr(v: unknown): string {
  if (!v) return "";
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function initials(name: string | null, fallback: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return fallback.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
];

function avatarGradient(id: string): string {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

const STATUS_FILTERS: Array<{ label: string; value: OfferStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "Pending" },
  { label: "Negotiating", value: "Negotiating" },
  { label: "Accepted", value: "Accepted" },
  { label: "Declined", value: "Declined" },
  { label: "Cancelled", value: "Cancelled" },
];

interface Props {
  offers: Offer[];
  statusFilter: OfferStatus | "all";
  onStatusFilter: (s: OfferStatus | "all") => void;
  onView: (offer: Offer) => void;
  role: "EMPLOYER" | "WORKER";
}

export function OfferList({ offers, statusFilter, onStatusFilter, onView, role }: Props) {
  const filtered = statusFilter === "all" ? offers : offers.filter((o) => o.status === statusFilter);
  const counts = offers.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const needsAction = (o: Offer) => {
    if (o.status === "Pending" && role === "WORKER") return true;
    if (o.status === "Negotiating") {
      return role === "EMPLOYER"
        ? o.latestProposedBy === "WORKER"
        : o.latestProposedBy === "EMPLOYER";
    }
    return false;
  };

  const actionCount = offers.filter(needsAction).length;

  return (
    <div className="space-y-5">
      {actionCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            {actionCount} offer{actionCount !== 1 ? "s" : ""} waiting for your response
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => {
          const count = f.value === "all" ? offers.length : (counts[f.value] ?? 0);
          const active = statusFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => onStatusFilter(f.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                active
                  ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900"
              }`}
            >
              {f.label}
              <span className={`text-[10px] min-w-[18px] text-center px-1 py-0.5 rounded-full font-bold ${
                active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Briefcase className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-900">No offers found</p>
          <p className="text-xs text-gray-500 mt-1">
            {statusFilter === "all"
              ? role === "EMPLOYER" ? "You haven't sent any offers yet." : "You haven't received any offers yet."
              : `No ${statusFilter.toLowerCase()} offers.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((offer) => {
            const rate = offer.negotiatedRate ?? offer.offeredRate;
            const hasNegotiated = offer.negotiatedRate != null && offer.negotiatedRate !== offer.offeredRate;
            const action = needsAction(offer);
            const entityId = role === "EMPLOYER" ? offer.workerId : offer.jobId;
            const displayName = role === "EMPLOYER"
              ? (offer.workerName || `Worker ${offer.workerId.slice(0, 6).toUpperCase()}`)
              : `Job ${offer.jobId.slice(0, 6).toUpperCase()}`;

            return (
              <button
                key={offer.offerId}
                onClick={() => onView(offer)}
                className="w-full text-left group"
              >
                <div className={`relative bg-white border rounded-xl transition-all duration-150 hover:shadow-md overflow-hidden ${
                  action ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-200 hover:border-gray-300"
                }`}>
                  {action && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400" />
                  )}

                  <div className="p-4">
                    <div className="flex items-start gap-3.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 bg-gradient-to-br ${avatarGradient(entityId)}`}>
                        {initials(role === "EMPLOYER" ? offer.workerName : null, entityId)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-gray-900 truncate">{displayName}</span>
                              <OfferStatusBadge status={offer.status} />
                              {action && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  ACTION NEEDED
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="text-xs text-gray-500 truncate">{offer.snapshotLocation}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5" />
                        </div>

                        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                          {offer.snapshotShiftDate && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />{toDateStr(offer.snapshotShiftDate)}
                            </span>
                          )}
                          {offer.snapshotShiftStartTime && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {formatTime(offer.snapshotShiftStartTime)}
                              {offer.snapshotShiftDurationHours ? ` · ${offer.snapshotShiftDurationHours}h` : ""}
                            </span>
                          )}
                        </div>

                        {offer.snapshotSupportTypeTags?.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {offer.snapshotSupportTypeTags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium border border-gray-200">
                                {tag}
                              </span>
                            ))}
                            {offer.snapshotSupportTypeTags.length > 3 && (
                              <span className="text-[10px] text-gray-400">+{offer.snapshotSupportTypeTags.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-base font-extrabold text-gray-900">${rate.toFixed(2)}</span>
                        <span className="text-xs text-gray-400">/hr</span>
                        {hasNegotiated && (
                          <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-medium ml-1">
                            <TrendingUp className="w-3 h-3" />
                            <span className="line-through text-gray-400 font-normal">${offer.offeredRate.toFixed(2)}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {new Date(offer.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
