import type { NegotiationEvent } from "~backend/offers/types";
import { CheckCircle2, XCircle, Send, TrendingUp, Ban } from "lucide-react";

const EVENT_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
  text: string;
}> = {
  OFFER_SENT:    { label: "Offer sent",      icon: <Send className="h-3.5 w-3.5" />,         bg: "bg-blue-100",    border: "border-blue-200",    text: "text-blue-700" },
  ACCEPTED:      { label: "Accepted",         icon: <CheckCircle2 className="h-3.5 w-3.5" />, bg: "bg-emerald-100", border: "border-emerald-200",  text: "text-emerald-700" },
  DECLINED:      { label: "Declined",         icon: <XCircle className="h-3.5 w-3.5" />,      bg: "bg-red-100",     border: "border-red-200",      text: "text-red-700" },
  RATE_PROPOSED: { label: "Rate proposed",    icon: <TrendingUp className="h-3.5 w-3.5" />,   bg: "bg-amber-100",   border: "border-amber-200",    text: "text-amber-700" },
  CANCELLED:     { label: "Cancelled",        icon: <Ban className="h-3.5 w-3.5" />,          bg: "bg-gray-100",    border: "border-gray-200",      text: "text-gray-500" },
};

interface Props {
  history: NegotiationEvent[];
}

export function NegotiationHistory({ history }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Offer Timeline</p>
      <div className="relative">
        <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-200" />
        <div className="space-y-3">
          {history.map((event, i) => {
            const cfg = EVENT_CONFIG[event.eventType] ?? EVENT_CONFIG.OFFER_SENT;
            const isLast = i === history.length - 1;
            return (
              <div key={event.eventId} className="relative flex items-start gap-3 pl-2">
                <div className={`relative z-10 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg} ${cfg.border} ${cfg.text} ${isLast ? "ring-2 ring-offset-1 ring-current/20" : ""}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
                    <span className="text-xs text-gray-400 capitalize">{event.actor.toLowerCase()}</span>
                    {event.rate != null && (
                      <span className="text-xs font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">
                        ${event.rate.toFixed(2)}/hr
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 ml-auto tabular-nums">
                      {new Date(event.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}{" "}
                      {new Date(event.createdAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {event.note && (
                    <p className="text-xs text-gray-500 mt-0.5 italic">"{event.note}"</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
