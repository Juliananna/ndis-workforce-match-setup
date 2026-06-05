import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, MapPin, Calendar, Clock, DollarSign,
  CheckCircle2, XCircle, MessageSquare, TrendingUp,
  ChevronDown, ChevronUp, Shield
} from "lucide-react";
import { OfferStatusBadge } from "./OfferStatusBadge";
import { NegotiationHistory } from "./NegotiationHistory";
import { WorkerDocumentsPanel, WorkerDocumentsLockedPlaceholder } from "./WorkerDocumentsPanel";
import { MessageThread } from "./MessageThread";
import { ReviewPanel } from "./ReviewPanel";
import type { Offer } from "~backend/offers/types";
import type { EmployerNegotiateRequest } from "~backend/offers/negotiate";
import type { WorkerRespondRequest } from "~backend/offers/respond";

function toDateStr(v: unknown): string {
  if (!v) return "—";
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(t: string | null): string {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

interface Props {
  offer: Offer;
  role: "EMPLOYER" | "WORKER";
  onBack: () => void;
  onEmployerAction?: (req: Omit<EmployerNegotiateRequest, "offerId">) => Promise<Offer>;
  onWorkerAction?: (req: Omit<WorkerRespondRequest, "offerId">) => Promise<Offer>;
}

export function OfferDetail({ offer: initialOffer, role, onBack, onEmployerAction, onWorkerAction }: Props) {
  const [offer, setOffer] = useState<Offer>(initialOffer);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposeRate, setProposeRate] = useState("");
  const [counterRate, setCounterRate] = useState("");
  const [note, setNote] = useState("");
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const currentRate = offer.negotiatedRate ?? offer.offeredRate;
  const hasNegotiated = offer.negotiatedRate != null && offer.negotiatedRate !== offer.offeredRate;

  const doEmployerAction = async (req: Omit<EmployerNegotiateRequest, "offerId">) => {
    setSaving(true); setError(null);
    try {
      const updated = await onEmployerAction!(req);
      setOffer(updated); setShowCounterForm(false); setCounterRate(""); setNote("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally { setSaving(false); }
  };

  const doWorkerAction = async (req: Omit<WorkerRespondRequest, "offerId">) => {
    setSaving(true); setError(null);
    try {
      const updated = await onWorkerAction!(req);
      setOffer(updated); setShowProposeForm(false); setProposeRate(""); setNote("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally { setSaving(false); }
  };

  const isWorkerActionable = role === "WORKER" && (offer.status === "Pending" || offer.status === "Negotiating");
  const isEmployerNegotiating = role === "EMPLOYER" && offer.status === "Negotiating";
  const isEmployerCancellable = role === "EMPLOYER" && ["Pending", "Negotiating", "Accepted"].includes(offer.status);

  const workerNeedsAction = role === "WORKER" && (
    offer.status === "Pending" || (offer.status === "Negotiating" && offer.latestProposedBy === "EMPLOYER")
  );
  const employerNeedsAction = role === "EMPLOYER" && offer.status === "Negotiating" && offer.latestProposedBy === "WORKER";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />Back to offers
      </button>

      {(workerNeedsAction || employerNeedsAction) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">Your response is needed</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {offer.status === "Pending"
                ? "An employer has sent you a shift offer. Review the details below and respond."
                : offer.latestProposedBy === "EMPLOYER"
                ? "The employer has sent a counter-offer. Accept, decline, or propose a new rate."
                : "The worker has proposed a new rate. Accept it or send a counter."}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <OfferStatusBadge status={offer.status} size="md" />
                {role === "EMPLOYER" && offer.workerName && (
                  <span className="text-sm font-semibold text-gray-700">{offer.workerName}</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                {offer.snapshotLocation}
              </h2>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">
                {hasNegotiated ? "Negotiated Rate" : "Offered Rate"}
              </p>
              <p className="text-3xl font-black text-gray-900">${currentRate.toFixed(2)}<span className="text-sm font-normal text-gray-400">/hr</span></p>
              {hasNegotiated && (
                <p className="text-xs text-gray-400 flex items-center justify-end gap-1 mt-0.5">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  was <span className="line-through">${offer.offeredRate.toFixed(2)}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          <div className="px-4 py-3 text-center">
            <Calendar className="w-4 h-4 text-gray-400 mx-auto mb-1" />
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Date</p>
            <p className="text-xs font-semibold text-gray-900 mt-0.5 leading-tight">
              {offer.snapshotShiftDate
                ? new Date(offer.snapshotShiftDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
                : "Ongoing"}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <Clock className="w-4 h-4 text-gray-400 mx-auto mb-1" />
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Start</p>
            <p className="text-xs font-semibold text-gray-900 mt-0.5">{formatTime(offer.snapshotShiftStartTime)}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <DollarSign className="w-4 h-4 text-gray-400 mx-auto mb-1" />
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Duration</p>
            <p className="text-xs font-semibold text-gray-900 mt-0.5">
              {offer.snapshotShiftDurationHours ? `${offer.snapshotShiftDurationHours}h` : "—"}
            </p>
          </div>
        </div>

        {offer.snapshotSupportTypeTags.length > 0 && (
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Support Types</p>
            <div className="flex flex-wrap gap-1.5">
              {offer.snapshotSupportTypeTags.map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 font-medium">{t}</span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setShowDetails((v) => !v)}
          className="w-full px-5 py-3 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50 transition-colors border-b border-gray-100"
        >
          <span className="font-medium">Job Details</span>
          {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showDetails && (
          <div className="px-5 py-4 border-b border-gray-100 space-y-3 bg-gray-50/50">
            {offer.snapshotClientNotes && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Client Notes</p>
                <p className="text-sm text-gray-700">{offer.snapshotClientNotes}</p>
              </div>
            )}
            {offer.snapshotBehaviouralConsiderations && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Behavioural Considerations</p>
                <p className="text-sm text-gray-700">{offer.snapshotBehaviouralConsiderations}</p>
              </div>
            )}
            {offer.snapshotMedicalRequirements && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Medical Requirements</p>
                <p className="text-sm text-gray-700">{offer.snapshotMedicalRequirements}</p>
              </div>
            )}
            {offer.additionalNotes && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Notes from Employer</p>
                <p className="text-sm text-gray-700">{offer.additionalNotes}</p>
              </div>
            )}
            {!offer.snapshotClientNotes && !offer.snapshotBehaviouralConsiderations && !offer.snapshotMedicalRequirements && !offer.additionalNotes && (
              <p className="text-sm text-gray-400 italic">No additional details provided.</p>
            )}
          </div>
        )}

        {offer.history && offer.history.length > 0 && (
          <div className="px-5 py-4 border-b border-gray-100">
            <NegotiationHistory history={offer.history} />
          </div>
        )}

        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-3">Messages</p>
          <MessageThread offerId={offer.offerId} myRole={role} />
        </div>

        {offer.status === "Accepted" && (
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-3">Review</p>
            <ReviewPanel offerId={offer.offerId} myRole={role} />
          </div>
        )}

        {role === "EMPLOYER" && (
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-3.5 w-3.5 text-gray-400" />
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Worker Compliance Documents</p>
            </div>
            {offer.status === "Accepted" ? (
              <WorkerDocumentsPanel workerId={offer.workerId} />
            ) : (
              <WorkerDocumentsLockedPlaceholder />
            )}
          </div>
        )}

        {error && (
          <div className="mx-5 my-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {isWorkerActionable && (
          <div className="px-5 py-4">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-3">Your Response</p>
            {!showProposeForm ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => doWorkerAction({ action: "accept" })}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {saving ? "Accepting…" : "Accept Offer"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowProposeForm(true)}
                    disabled={saving}
                    className="gap-1.5"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Propose New Rate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                    onClick={() => doWorkerAction({ action: "decline" })}
                    disabled={saving}
                  >
                    <XCircle className="h-4 w-4" />
                    Decline
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Optional note to include with your response…"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-900">Propose a New Rate</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Your Rate ($/hr)</Label>
                    <Input
                      type="number" min={0} step={0.01}
                      value={proposeRate}
                      onChange={(e) => setProposeRate(e.target.value)}
                      className="h-8 text-sm"
                      placeholder={`Current: $${currentRate.toFixed(2)}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Note (optional)</Label>
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Reason for rate…"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const r = parseFloat(proposeRate);
                      if (isNaN(r) || r < 0) { setError("Enter a valid rate"); return; }
                      doWorkerAction({ action: "propose_rate", proposedRate: r, note: note || undefined });
                    }}
                    disabled={saving}
                  >
                    {saving ? "Submitting…" : "Submit Proposal"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowProposeForm(false); setError(null); }} disabled={saving}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {(isEmployerNegotiating || isEmployerCancellable) && (
          <div className="px-5 py-4">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-3">Employer Actions</p>
            <div className="space-y-3">
              {isEmployerNegotiating && !showCounterForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-gray-700">
                    Worker proposed <span className="font-bold text-blue-700">${offer.negotiatedRate?.toFixed(2)}/hr</span>
                    <span className="text-gray-400 text-xs ml-2">(you offered ${offer.offeredRate.toFixed(2)}/hr)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => doEmployerAction({ action: "accept_rate" })}
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Accept ${offer.negotiatedRate?.toFixed(2)}/hr
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowCounterForm(true)} disabled={saving}>
                      Counter Rate
                    </Button>
                  </div>
                </div>
              )}
              {isEmployerNegotiating && showCounterForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Send Counter Rate</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Counter Rate ($/hr)</Label>
                      <Input
                        type="number" min={0} step={0.01}
                        value={counterRate}
                        onChange={(e) => setCounterRate(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Note (optional)</Label>
                      <Input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Reason…"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const r = parseFloat(counterRate);
                        if (isNaN(r) || r < 0) { setError("Enter a valid counter rate"); return; }
                        doEmployerAction({ action: "counter_rate", counterRate: r, note: note || undefined });
                      }}
                      disabled={saving}
                    >
                      {saving ? "Sending…" : "Send Counter"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowCounterForm(false); setError(null); }} disabled={saving}>Cancel</Button>
                  </div>
                </div>
              )}
              {isEmployerCancellable && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    if (!confirm("Cancel this offer?")) return;
                    doEmployerAction({ action: "cancel" });
                  }}
                  disabled={saving}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Cancel Offer
                </Button>
              )}
            </div>
          </div>
        )}

        {offer.status === "Accepted" && (
          <div className="px-5 py-4 bg-emerald-50 border-t border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-bold">Offer Accepted</p>
                <p className="text-xs text-emerald-600">
                  {role === "EMPLOYER"
                    ? "The worker has accepted this offer. Their compliance documents are now accessible above."
                    : "You've accepted this offer. The employer can now access your compliance documents."}
                </p>
              </div>
            </div>
          </div>
        )}

        {offer.status === "Declined" && (
          <div className="px-5 py-4 bg-red-50 border-t border-red-100">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-bold">Offer Declined</p>
                <p className="text-xs text-red-600">
                  {role === "EMPLOYER"
                    ? "The worker declined this offer. You can browse other workers and send a new offer."
                    : "You declined this offer."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-center text-gray-400">
        Offer ID: {offer.offerId.slice(0, 8).toUpperCase()} &bull; Created {toDateStr(offer.createdAt)}
      </p>
    </div>
  );
}
