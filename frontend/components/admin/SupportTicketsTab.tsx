import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, HelpCircle, ChevronLeft, ChevronRight,
  CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { SupportTicketDetail } from "~backend/support/list_tickets";

const STATUS_COLORS: Record<string, string> = {
  open:     "bg-amber-500/15 text-amber-400 border-transparent",
  resolved: "bg-green-500/15 text-green-400 border-transparent",
};

const CATEGORY_LABELS: Record<string, string> = {
  general:    "General",
  technical:  "Technical",
  billing:    "Billing",
  compliance: "Compliance",
  account:    "Account",
};

function TicketRow({
  ticket,
  onUpdate,
}: {
  ticket: SupportTicketDetail;
  onUpdate: (updated: SupportTicketDetail) => void;
}) {
  const api = useAuthedBackend();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(ticket.adminNotes ?? "");
  const [saving, setSaving] = useState(false);

  const handleResolve = async (status: "open" | "resolved") => {
    if (!api) return;
    setSaving(true);
    try {
      const updated = await api.support.adminUpdateSupportTicket({ id: ticket.id, status, adminNotes: notes || undefined });
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
            >
              {ticket.subject}
            </button>
            <Badge className={`text-xs capitalize ${STATUS_COLORS[ticket.status] ?? "bg-muted text-muted-foreground border-transparent"}`}>
              {ticket.status === "open" ? <Clock className="h-3 w-3 mr-1 inline" /> : <CheckCircle className="h-3 w-3 mr-1 inline" />}
              {ticket.status}
            </Badge>
            <Badge className="text-xs bg-muted text-muted-foreground border-transparent">
              {CATEGORY_LABELS[ticket.category] ?? ticket.category}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ticket.userName ?? ticket.userEmail}
            {ticket.userRole && <> · <span className="capitalize">{ticket.userRole.toLowerCase()}</span></>}
            {" · "}{new Date(ticket.createdAt).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div className="bg-muted/30 rounded-lg px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Message</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.message}</p>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Email:</span> {ticket.userEmail}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Admin Notes</label>
            <textarea
              rows={2}
              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Optional internal notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {ticket.status === "open" ? (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => handleResolve("resolved")} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Mark Resolved
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => handleResolve("open")} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                Reopen
              </Button>
            )}
            {notes !== (ticket.adminNotes ?? "") && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleResolve(ticket.status as "open" | "resolved")} disabled={saving}>
                Save Notes
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export function SupportTicketsTab({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [tickets, setTickets] = useState<SupportTicketDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "all">("open");
  const [page, setPage] = useState(0);
  const limit = 50;

  const load = useCallback(async (p: number, status: typeof statusFilter) => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.support.adminListSupportTickets({ status, limit, offset: p * limit });
      setTickets(res.tickets);
      setTotal(res.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(page, statusFilter); }, [load, page, statusFilter]);

  const handleFilterChange = (f: typeof statusFilter) => {
    setStatusFilter(f);
    setPage(0);
  };

  const handleUpdate = (updated: SupportTicketDetail) => {
    setTickets((prev) => prev.map((t) => t.id === updated.id ? updated : t));
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <HelpCircle className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Support Tickets</h2>
          <p className="text-xs text-muted-foreground">User assistance requests</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit">
          {(["open", "resolved", "all"] as const).map((f) => (
            <button key={f} onClick={() => handleFilterChange(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${statusFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">{page + 1} / {Math.max(1, totalPages)} · {total} total</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-8">No {statusFilter !== "all" ? statusFilter : ""} tickets.</p>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <TicketRow key={t.id} ticket={t} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
