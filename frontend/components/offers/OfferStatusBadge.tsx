import type { OfferStatus } from "~backend/offers/types";

interface Props {
  status: OfferStatus;
  size?: "sm" | "md";
}

const STYLES: Record<OfferStatus, { bg: string; text: string; dot: string; label: string }> = {
  Pending:     { bg: "bg-amber-50 border-amber-200",    text: "text-amber-700",  dot: "bg-amber-400",  label: "Pending" },
  Negotiating: { bg: "bg-blue-50 border-blue-200",      text: "text-blue-700",   dot: "bg-blue-500",   label: "Negotiating" },
  Accepted:    { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", label: "Accepted" },
  Declined:    { bg: "bg-red-50 border-red-200",        text: "text-red-700",    dot: "bg-red-500",    label: "Declined" },
  Cancelled:   { bg: "bg-gray-100 border-gray-200",     text: "text-gray-500",   dot: "bg-gray-400",   label: "Cancelled" },
};

export function OfferStatusBadge({ status, size = "sm" }: Props) {
  const s = STYLES[status] ?? STYLES.Cancelled;
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full font-medium ${s.bg} ${s.text} ${
      size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}
