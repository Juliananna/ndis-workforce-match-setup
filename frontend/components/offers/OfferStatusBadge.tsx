import type { OfferStatus } from "~backend/offers/types";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-yellow-500/15 text-yellow-400",
  Accepted: "bg-green-500/15 text-green-400",
  Declined: "bg-red-500/15 text-red-400",
  Negotiating: "bg-blue-500/15 text-blue-400",
  Cancelled: "bg-muted text-muted-foreground",
};

interface Props {
  status: OfferStatus;
}

export function OfferStatusBadge({ status }: Props) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}
