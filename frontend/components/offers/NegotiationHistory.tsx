import type { NegotiationEvent } from "~backend/offers/types";

const EVENT_LABELS: Record<string, string> = {
  OFFER_SENT: "Offer sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  RATE_PROPOSED: "Rate proposed",
  CANCELLED: "Cancelled",
};

interface Props {
  history: NegotiationEvent[];
}

export function NegotiationHistory({ history }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Negotiation History</p>
      <div className="space-y-1.5">
        {history.map((event) => (
          <div key={event.eventId} className="flex items-start gap-3 text-sm">
            <span className="text-xs text-muted-foreground shrink-0 pt-0.5 tabular-nums w-16">
              {new Date(event.createdAt).toLocaleDateString()}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-muted-foreground">{event.actor}</span>
              <span className="mx-1 text-muted-foreground">&mdash;</span>
              <span className="text-foreground">{EVENT_LABELS[event.eventType] ?? event.eventType}</span>
              {event.rate != null && (
                <span className="ml-1 text-primary font-medium">${event.rate.toFixed(2)}/hr</span>
              )}
              {event.note && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
