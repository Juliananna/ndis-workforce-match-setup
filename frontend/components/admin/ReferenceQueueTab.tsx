import { useState, useEffect, useCallback } from "react";
import {
  Calendar, Clock, Phone, User, Building2, CheckCircle2,
  CalendarClock, AlertCircle, ChevronRight, RefreshCw, X, Search, MessageSquare, Loader2, Mail,
  StickyNote, Check, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { BookingModal } from "./BookingModal";
import { ReferenceCheckWizard } from "./ReferenceCheckWizard";
import { EmailReferenceModal } from "./EmailReferenceModal";
import type { PendingReferenceItem, ListUpcomingBookingsResponse } from "~backend/admin/reference_bookings";
import type { AdminReferenceView } from "~backend/admin/workers";
import type { ReferenceCheckResult, SubmitReferenceCheckRequest } from "~backend/admin/reference_check";
import { useToast } from "@/components/ui/use-toast";

type Tab = "queue" | "calendar";

interface MessageModalState {
  workerId: string;
  referenceId: string;
  workerName: string;
  refereeName: string;
  refereeOrganisation: string;
}

export function ReferenceQueueTab() {
  const api = useAuthedBackend();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("queue");
  const [items, setItems] = useState<PendingReferenceItem[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<ListUpcomingBookingsResponse["bookings"]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bookingItem, setBookingItem] = useState<PendingReferenceItem | null>(null);
  const [wizardRef, setWizardRef] = useState<{ item: PendingReferenceItem; existing: ReferenceCheckResult | null } | null>(null);
  const [messageModal, setMessageModal] = useState<MessageModalState | null>(null);
  const [emailRefItem, setEmailRefItem] = useState<PendingReferenceItem | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const [pendingRes, bookingsRes] = await Promise.all([
        api.admin.adminListPendingReferences(),
        api.admin.adminListUpcomingBookings(),
      ]);
      setItems(pendingRes.items);
      setUpcomingBookings(bookingsRes.bookings);
    } catch (e) {
      console.error("Failed to load reference queue:", e);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleBook = async (referenceId: string, scheduledAt: string, notes: string) => {
    if (!api) throw new Error("Not authenticated");
    await api.admin.adminCreateBooking({ referenceId, scheduledAt, notes });
    toast({ title: "Call scheduled", description: "Email reminders have been queued." });
    await load();
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!api) return;
    try {
      await api.admin.adminCancelBooking({ bookingId });
      toast({ title: "Booking cancelled" });
      await load();
    } catch (e) {
      console.error("Cancel failed:", e);
      toast({ title: "Failed to cancel booking", variant: "destructive" });
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!api || !messageModal) throw new Error("Not authenticated");
    await api.admin.adminSendReferenceMessage({
      workerId: messageModal.workerId,
      referenceId: messageModal.referenceId,
      message,
    });
    toast({ title: "Message sent", description: "The worker has been notified by email." });
    setMessageModal(null);
  };

  const handleSaveNotes = async (referenceId: string, notes: string) => {
    if (!api) throw new Error("Not authenticated");
    await api.admin.adminUpdateReferenceNotes({ referenceId, notes });
    await load();
  };

  const handleWizardSubmit = async (req: SubmitReferenceCheckRequest): Promise<ReferenceCheckResult> => {
    if (!api) throw new Error("Not authenticated");
    const result = await api.admin.adminSubmitReferenceCheck(req);
    await load();
    return result;
  };

  const filtered = items.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.workerName.toLowerCase().includes(q) ||
      i.refereeName.toLowerCase().includes(q) ||
      i.refereeOrganisation.toLowerCase().includes(q)
    );
  });

  const unscheduled = filtered.filter((i) => !i.booking);
  const scheduled = filtered.filter((i) => i.booking);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Reference Check Queue</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} pending reference{items.length !== 1 ? "s" : ""} · {scheduled.length} scheduled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <TabBtn label="Queue" active={tab === "queue"} onClick={() => setTab("queue")} />
            <TabBtn label="Calendar" active={tab === "calendar"} onClick={() => setTab("calendar")} />
          </div>
        </div>
      </div>

      {tab === "queue" && (
        <div className="space-y-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search worker, referee, or organisation..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {unscheduled.length > 0 && (
                <Section
                  title="Not Yet Scheduled"
                  icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
                  bg="bg-amber-50"
                  border="border-amber-200"
                  count={unscheduled.length}
                >
                  {unscheduled.map((item) => (
                    <ReferenceCard
                      key={item.referenceId}
                      item={item}
                      onSchedule={() => setBookingItem(item)}
                      onConduct={() => setWizardRef({ item, existing: null })}
                      onMessage={() => setMessageModal({ workerId: item.workerId, referenceId: item.referenceId, workerName: item.workerName, refereeName: item.refereeName, refereeOrganisation: item.refereeOrganisation })}
                      onEmailReference={() => setEmailRefItem(item)}
                      onSaveNotes={handleSaveNotes}
                    />
                  ))}
                </Section>
              )}

              {scheduled.length > 0 && (
                <Section
                  title="Scheduled"
                  icon={<CalendarClock className="h-4 w-4 text-indigo-600" />}
                  bg="bg-indigo-50"
                  border="border-indigo-200"
                  count={scheduled.length}
                >
                  {scheduled.map((item) => (
                    <ReferenceCard
                      key={item.referenceId}
                      item={item}
                      onSchedule={() => setBookingItem(item)}
                      onCancelBooking={() => item.booking && handleCancelBooking(item.booking.id)}
                      onConduct={() => setWizardRef({ item, existing: null })}
                      onMessage={() => setMessageModal({ workerId: item.workerId, referenceId: item.referenceId, workerName: item.workerName, refereeName: item.refereeName, refereeOrganisation: item.refereeOrganisation })}
                      onEmailReference={() => setEmailRefItem(item)}
                      onSaveNotes={handleSaveNotes}
                    />
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      )}

      {tab === "calendar" && (
        <CalendarView bookings={upcomingBookings} onCancelBooking={handleCancelBooking} onRefresh={load} />
      )}

      {bookingItem && (
        <BookingModal
          item={bookingItem}
          onConfirm={handleBook}
          onClose={() => setBookingItem(null)}
        />
      )}

      {wizardRef && (
        <ReferenceCheckWizard
          reference={toAdminReferenceView(wizardRef.item)}
          workerName={wizardRef.item.workerName}
          existingCheck={wizardRef.existing}
          onSubmit={handleWizardSubmit}
          onClose={() => setWizardRef(null)}
        />
      )}

      {messageModal && (
        <ReferenceMessageModal
          modal={messageModal}
          onSend={handleSendMessage}
          onClose={() => setMessageModal(null)}
        />
      )}

      {emailRefItem && (
        <EmailReferenceModal
          item={emailRefItem}
          onClose={() => setEmailRefItem(null)}
          onSent={load}
        />
      )}
    </div>
  );
}

function toAdminReferenceView(item: PendingReferenceItem): AdminReferenceView {
  return {
    id: item.referenceId,
    workerId: item.workerId,
    refereeName: item.refereeName,
    refereeTitle: item.refereeTitle,
    refereeOrganisation: item.refereeOrganisation,
    refereeEmail: item.refereeEmail,
    refereePhone: item.refereePhone,
    relationship: item.relationship,
    status: item.referenceStatus as AdminReferenceView["status"],
    notes: null,
    createdAt: item.referenceCreatedAt,
  };
}

function Section({
  title, icon, bg, border, count, children,
}: {
  title: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 px-3 py-2 ${bg} border ${border} rounded-xl`}>
        {icon}
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <span className="ml-auto text-xs font-bold text-gray-600 bg-white/70 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

const MESSAGE_TEMPLATES: { label: string; category: string; body: string }[] = [
  {
    category: "Missing Details",
    label: "Missing contact details",
    body: `Hi {FirstName},

We're in the process of completing your reference check with {RefereeName} from {RefereeOrganisation}, however we noticed their contact details are incomplete.

Could you please log in to your profile and update your referee's phone number and/or email address so we can proceed?

Thank you for your prompt attention to this.`,
  },
  {
    category: "Missing Details",
    label: "Missing referee phone number",
    body: `Hi {FirstName},

We attempted to contact your referee {RefereeName} at {RefereeOrganisation} but no phone number has been provided.

Please update your reference details with a valid phone number at your earliest convenience so we can complete your verification.`,
  },
  {
    category: "Wrong Contact",
    label: "Phone number not working",
    body: `Hi {FirstName},

We've been unable to reach your referee {RefereeName} at {RefereeOrganisation} on the number provided. The call was not connecting or went to an unrecognised service.

Please check the number and update it in your profile, or provide an alternative contact method for your referee.`,
  },
  {
    category: "Wrong Contact",
    label: "Wrong person answered",
    body: `Hi {FirstName},

When we called the number listed for your referee {RefereeName} at {RefereeOrganisation}, we reached someone who was unable to assist with a reference check.

Could you please confirm their direct contact number or email address so we can reach the right person?`,
  },
  {
    category: "Refusal",
    label: "Referee declined to provide a reference",
    body: `Hi {FirstName},

We contacted {RefereeName} at {RefereeOrganisation} to complete your reference check, however they have advised they are unable to provide a reference at this time.

To keep your verification on track, please consider adding an alternative referee who can speak to your work history and performance. You can update your references from your profile.`,
  },
  {
    category: "Refusal",
    label: "Referee no longer at the organisation",
    body: `Hi {FirstName},

We attempted to reach {RefereeName} at {RefereeOrganisation} but were informed they are no longer working there and we were unable to obtain a forwarding contact.

Please update your referee details with a current contact for this person, or provide an alternative referee if needed.`,
  },
  {
    category: "Refusal",
    label: "Organisation policy – no references given",
    body: `Hi {FirstName},

We contacted {RefereeOrganisation} to complete your reference check with {RefereeName}, however their organisation has a policy of not providing employment references.

Please provide an alternative referee — ideally a direct supervisor or manager from another role — so we can continue with your verification.`,
  },
];

const TEMPLATE_CATEGORIES = Array.from(new Set(MESSAGE_TEMPLATES.map((t) => t.category)));

function ReferenceMessageModal({
  modal,
  onSend,
  onClose,
}: {
  modal: MessageModalState;
  onSend: (message: string) => Promise<void>;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(TEMPLATE_CATEGORIES[0]);

  const applyTemplate = (body: string) => {
    const resolved = body
      .replace(/\{RefereeName\}/g, modal.refereeName)
      .replace(/\{RefereeOrganisation\}/g, modal.refereeOrganisation);
    setMessage(resolved);
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onSend(message);
    } catch (e: unknown) {
      console.error("Failed to send reference message:", e);
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const categoryTemplates = MESSAGE_TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-4 w-4 text-indigo-600" />
            <div>
              <p className="font-semibold text-sm text-gray-900">Message Worker</p>
              <p className="text-xs text-gray-500">Re: {modal.refereeName} · {modal.refereeOrganisation}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 divide-x divide-gray-100">
          <div className="w-56 shrink-0 flex flex-col overflow-hidden">
            <p className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Templates</p>
            <div className="flex gap-1 px-3 pb-2 flex-wrap">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
              {categoryTemplates.map((t) => (
                <button
                  key={t.label}
                  onClick={() => applyTemplate(t.body)}
                  className="w-full text-left rounded-lg border border-gray-200 px-3 py-2.5 text-xs text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors leading-snug"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden">
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2.5 text-xs text-indigo-700">
              Sending to <span className="font-semibold">{modal.workerName}</span>.
              Use <code className="bg-indigo-100 px-1 rounded">{'{FirstName}'}</code> to personalise.
              Templates auto-fill referee details.
            </div>
            <div className="flex-1 flex flex-col space-y-1.5 min-h-0">
              <label className="text-sm font-medium text-gray-700 shrink-0">Message</label>
              <textarea
                className="flex-1 min-h-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Select a template or write your own message..."
              />
              <p className="text-xs text-gray-400 text-right shrink-0">{message.length}/2000</p>
            </div>
            {error && <p className="text-xs text-red-600 shrink-0">{error}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !message.trim() || message.length > 2000}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
            Send Message
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReferenceCard({
  item,
  onSchedule,
  onCancelBooking,
  onConduct,
  onMessage,
  onEmailReference,
  onSaveNotes,
}: {
  item: PendingReferenceItem;
  onSchedule: () => void;
  onCancelBooking?: () => void;
  onConduct: () => void;
  onMessage: () => void;
  onEmailReference: () => void;
  onSaveNotes: (referenceId: string, notes: string) => Promise<void>;
}) {
  const daysWaiting = Math.floor(
    (Date.now() - new Date(item.referenceCreatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesValue, setNotesValue] = useState(item.referenceNotes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await onSaveNotes(item.referenceId, notesValue);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{item.workerName}</p>
              <p className="text-xs text-gray-500 mt-0.5">Referee: <span className="font-medium text-gray-700">{item.refereeName}</span> · {item.refereeTitle}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={item.referenceStatus} />
              {daysWaiting > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${daysWaiting > 7 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                  {daysWaiting}d waiting
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />{item.refereeOrganisation}
            </span>
            {item.refereePhone && (
              <span className="flex items-center gap-1 font-medium text-gray-700">
                <Phone className="h-3.5 w-3.5 text-indigo-400" />{item.refereePhone}
              </span>
            )}
          </div>

          {item.booking && (
            <div className="mt-3 flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
              <CalendarClock className="h-4 w-4 text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-indigo-700">
                  {new Date(item.booking.scheduledAt).toLocaleString("en-AU", {
                    dateStyle: "medium", timeStyle: "short",
                  })}
                </p>
                {item.booking.notes && (
                  <p className="text-xs text-indigo-500 truncate">{item.booking.notes}</p>
                )}
              </div>
              {onCancelBooking && (
                <button
                  onClick={onCancelBooking}
                  className="text-indigo-400 hover:text-red-500 transition-colors ml-auto"
                  title="Cancel booking"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {notesOpen && (
        <div className="mt-3 space-y-2">
          <textarea
            rows={3}
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            placeholder="Add notes about this reference check (e.g. call attempts, observations, follow-up actions)…"
            className="w-full rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{notesValue.length}/2000</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setNotesOpen(false)} className="h-7 text-xs">Cancel</Button>
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
              >
                {savingNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : notesSaved ? <Check className="h-3 w-3" /> : null}
                {notesSaved ? "Saved" : "Save Notes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setNotesOpen((v) => !v)}
          className={`h-7 text-xs gap-1 ${item.referenceNotes ? "text-amber-700 border-amber-300 bg-amber-50" : ""}`}
          title={item.referenceNotes ? item.referenceNotes : "Add notes"}
        >
          {item.referenceNotes ? <Pencil className="h-3 w-3" /> : <StickyNote className="h-3 w-3" />}
          Notes{item.referenceNotes ? " ●" : ""}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onMessage}
          className="h-7 text-xs gap-1"
        >
          <MessageSquare className="h-3 w-3" />
          Message Worker
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onEmailReference}
          className="h-7 text-xs gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
        >
          <Mail className="h-3 w-3" />
          Email Reference
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onSchedule}
          className="h-7 text-xs gap-1"
        >
          <Calendar className="h-3 w-3" />
          {item.booking ? "Reschedule" : "Schedule Call"}
        </Button>
        <Button
          size="sm"
          onClick={onConduct}
          className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <ChevronRight className="h-3 w-3" />
          Conduct Check
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    Pending: { color: "bg-amber-100 text-amber-700", label: "Pending" },
    Contacted: { color: "bg-blue-100 text-blue-700", label: "Contacted" },
  };
  const c = config[status] ?? { color: "bg-gray-100 text-gray-700", label: status };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.color}`}>{c.label}</span>;
}

function CalendarView({
  bookings,
  onCancelBooking,
  onRefresh,
}: {
  bookings: ListUpcomingBookingsResponse["bookings"];
  onCancelBooking: (id: string) => void;
  onRefresh: () => void;
}) {
  const grouped = bookings.reduce<Record<string, typeof bookings>>((acc, b) => {
    const dateKey = new Date(b.scheduledAt).toLocaleDateString("en-AU", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(b);
    return acc;
  }, {});

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Calendar className="h-7 w-7 text-gray-400" />
        </div>
        <p className="font-semibold text-gray-700">No upcoming calls scheduled</p>
        <p className="text-sm text-gray-500">Schedule reference calls from the Queue tab.</p>
        <Button size="sm" variant="outline" onClick={onRefresh} className="mt-1 text-xs h-8">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([dateLabel, dayBookings]) => (
        <div key={dateLabel} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-indigo-500" />
            <h3 className="text-sm font-bold text-gray-800">{dateLabel}</h3>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500">{dayBookings.length} call{dayBookings.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-2 pl-5">
            {dayBookings.map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 shadow-sm">
                <div className="bg-indigo-50 rounded-lg px-3 py-2 text-center min-w-[56px] shrink-0">
                  <p className="text-xs text-indigo-500 font-medium">
                    {new Date(b.scheduledAt).toLocaleString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{b.refereeName}</p>
                      <p className="text-xs text-gray-500">{b.refereeOrganisation}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 text-xs border-0">Scheduled</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />Worker: <span className="font-medium text-gray-700">{b.workerName}</span>
                    </span>
                    {b.refereePhone && (
                      <span className="flex items-center gap-1 font-medium text-indigo-600">
                        <Phone className="h-3.5 w-3.5" />{b.refereePhone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />Officer: {b.officerEmail}
                    </span>
                  </div>
                  {b.notes && (
                    <p className="text-xs text-gray-400 mt-1 italic">{b.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => onCancelBooking(b.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                  title="Cancel booking"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
          <div className="flex gap-4">
            <div className="h-10 w-10 bg-gray-100 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="h-14 w-14 rounded-2xl bg-green-50 flex items-center justify-center">
        <CheckCircle2 className="h-7 w-7 text-green-500" />
      </div>
      <p className="font-semibold text-gray-700">All references checked!</p>
      <p className="text-sm text-gray-500">No pending reference checks at this time.</p>
    </div>
  );
}
