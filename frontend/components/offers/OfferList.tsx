import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OfferStatusBadge } from "./OfferStatusBadge";
import type { Offer, OfferStatus } from "~backend/offers/types";

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onStatusFilter(f.value)}
            className={`px-2.5 py-0.5 rounded text-xs border transition-colors ${
              statusFilter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">No offers found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((offer) => (
            <Card
              key={offer.offerId}
              className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => onView(offer)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground truncate">{offer.snapshotLocation}</span>
                  <OfferStatusBadge status={offer.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {toDateStr(offer.snapshotShiftDate)} &bull; {offer.snapshotShiftStartTime} &bull; {offer.snapshotShiftDurationHours}h
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {role === "EMPLOYER" ? `Worker: ${offer.workerId.slice(0, 8)}…` : `Job: ${offer.jobId.slice(0, 8)}…`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-primary">
                  ${(offer.negotiatedRate ?? offer.offeredRate).toFixed(2)}/hr
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(offer.createdAt).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
