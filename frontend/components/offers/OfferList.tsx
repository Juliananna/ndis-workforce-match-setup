import { OfferStatusBadge } from "./OfferStatusBadge";
import type { Offer, OfferStatus } from "~backend/offers/types";
import { MapPin, Clock, Calendar, DollarSign, ChevronRight, User, Briefcase } from "lucide-react";

function toDateStr(v: unknown): string {
  if (!v) return "—";
  if (v instanceof Date) return v.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  const d = new Date(String(v));
  if (!isNaN(d.getTime())) return  d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  return String(v);
}

function formatTime(t: string | null): string {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function initials(id: string): string {
  return id.slice(0, 2).toUpperCase();
}

function avatarColor(id: string): string {
  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500",
    "bg-orange-500", "bg-pink-500", "bg-cyan-500", "bg-amber-500",
  ];
  const idx = id.charCodeAt(0) % colors.length;
  return colors[idx];
}

const STATUS_FILTERS: Array<{ label: string; value: OfferStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "Pending" },
  { label: "Negotiating", value: "Negotiating" },
  { label: "Accepted", value: "Accepted" },
  { label: "Declined", value: "Declined" },
  { label: "Cancelled", value: "Cancelled" },
];

const STATUS_COUNTS_STYLE: Record<string, string> = {
  Pending: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  Negotiating: "bg-blue-500/10 text-blue-600 border-blue-200",
  Accepted: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  Declined: "bg-red-500/10 text-red-600 border-red-200",
  Cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

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

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => {
          const count = f.value === "all" ? offers.length : (counts[f.value] ?? 0);
          const active = statusFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => onStatusFilter(f.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                active
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Briefcase className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No offers found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {statusFilter === "all" ? "You haven't sent any offers yet." : `No ${statusFilter.toLowerCase()} offers.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((offer) => {
            const rate = offer.negotiatedRate ?? offer.offeredRate;
            const entityId = role === "EMPLOYER" ? offer.workerId : offer.jobId;
            const isNegotiating = offer.status === "Negotiating";
            const needsAction = isNegotiating && offer.latestProposedBy !== (role === "EMPLOYER" ? "EMPLOYER" : "WORKER");

            return (
              <button
                key={offer.offerId}
                onClick={() => onView(offer)}
                className="w-full text-left group"
              >
                <div className={`relative bg-background border rounded-xl p-4 transition-all duration-150 hover:shadow-md hover:border-foreground/20 ${
                  needsAction ? "border-blue-200 bg-blue-50/30" : "border-border"
                }`}>
                  {needsAction && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  )}

                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(entityId)}`}>
                      {role === "EMPLOYER" ? <User className="w-4 h-4" /> : initials(entityId)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              {role === "EMPLOYER" ? `Worker #${entityId.slice(0, 6).toUpperCase()}` : `Job #${entityId.slice(0, 6).toUpperCase()}`}
                            </span>
                            <OfferStatusBadge status={offer.status} />
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{offer.snapshotLocation}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5" />
                      </div>

                      <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                        {offer.snapshotShiftDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{toDateStr(offer.snapshotShiftDate)}</span>
                          </div>
                        )}
                        {offer.snapshotShiftStartTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatTime(offer.snapshotShiftStartTime)}
                              {offer.snapshotShiftDurationHours ? ` · ${offer.snapshotShiftDurationHours}h` : ""}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          <DollarSign className="w-3 h-3 text-emerald-600" />
                          <span className="text-sm font-bold text-emerald-600">{rate.toFixed(2)}/hr</span>
                        </div>
                      </div>

                      {offer.snapshotSupportTypeTags?.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {offer.snapshotSupportTypeTags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                              {tag}
                            </span>
                          ))}
                          {offer.snapshotSupportTypeTags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{offer.snapshotSupportTypeTags.length - 3} more</span>
                          )}
                        </div>
                      )}

                      {needsAction && (
                        <div className="mt-2.5 text-[11px] font-medium text-blue-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                          Counter-offer received — action required
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Sent {new Date(offer.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {offer.negotiatedRate && offer.negotiatedRate !== offer.offeredRate && (
                      <span className="text-[11px] text-muted-foreground">
                        Original: <span className="line-through">${offer.offeredRate.toFixed(2)}/hr</span>
                      </span>
                    )}
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
