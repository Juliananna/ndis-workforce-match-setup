import { useState } from "react";

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
}
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { OfferStatusBadge } from "./OfferStatusBadge";
import { NegotiationHistory } from "./NegotiationHistory";
import { WorkerDocumentsPanel, WorkerDocumentsLockedPlaceholder } from "./WorkerDocumentsPanel";
import { MessageThread } from "./MessageThread";
import { ReviewPanel } from "./ReviewPanel";
import type { Offer } from "~backend/offers/types";
import type { EmployerNegotiateRequest } from "~backend/offers/negotiate";
import type { WorkerRespondRequest } from "~backend/offers/respond";

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

  const currentRate = offer.negotiatedRate ?? offer.offeredRate;

  const doEmployerAction = async (req: Omit<EmployerNegotiateRequest, "offerId">) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await onEmployerAction!(req);
      setOffer(updated);
      setShowCounterForm(false);
      setCounterRate("");
      setNote("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const doWorkerAction = async (req: Omit<WorkerRespondRequest, "offerId">) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await onWorkerAction!(req);
      setOffer(updated);
      setShowProposeForm(false);
      setProposeRate("");
      setNote("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const handleWorkerAccept = () => doWorkerAction({ action: "accept", note: note || undefined });
  const handleWorkerDecline = () => doWorkerAction({ action: "decline", note: note || undefined });
  const handleWorkerPropose = () => {
    const r = parseFloat(proposeRate);
    if (isNaN(r) || r < 0) { setError("Enter a valid rate"); return; }
    doWorkerAction({ action: "propose_rate", proposedRate: r, note: note || undefined });
  };
  const handleEmployerAcceptRate = () => doEmployerAction({ action: "accept_rate", note: note || undefined });
  const handleEmployerCounter = () => {
    const r = parseFloat(counterRate);
    if (isNaN(r) || r < 0) { setError("Enter a valid counter rate"); return; }
    doEmployerAction({ action: "counter_rate", counterRate: r, note: note || undefined });
  };
  const handleEmployerCancel = () => {
    if (!confirm("Cancel this offer?")) return;
    doEmployerAction({ action: "cancel", note: note || undefined });
  };

  const isWorkerActionable = role === "WORKER" && (offer.status === "Pending" || offer.status === "Negotiating");
  const isEmployerNegotiating = role === "EMPLOYER" && offer.status === "Negotiating";
  const isEmployerCancellable = role === "EMPLOYER" && (offer.status === "Pending" || offer.status === "Negotiating" || offer.status === "Accepted");

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />Back to offers
      </button>

      <Card className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-foreground">{offer.snapshotLocation}</h2>
              <OfferStatusBadge status={offer.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {toDateStr(offer.snapshotShiftDate)} &bull; {offer.snapshotShiftStartTime} &bull; {offer.snapshotShiftDurationHours}h
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Current Rate</p>
            <p className="text-lg font-bold text-primary">${currentRate.toFixed(2)}/hr</p>
            {offer.negotiatedRate != null && (
              <p className="text-xs text-muted-foreground">Originally: ${offer.offeredRate.toFixed(2)}/hr</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {offer.snapshotSupportTypeTags.length > 0 && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground mb-1">Support Types</p>
              <div className="flex flex-wrap gap-1">
                {offer.snapshotSupportTypeTags.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 bg-secondary rounded">{t}</span>
                ))}
              </div>
            </div>
          )}
          {offer.snapshotClientNotes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground">Client Notes</p>
              <p className="text-sm text-foreground">{offer.snapshotClientNotes}</p>
            </div>
          )}
          {offer.snapshotBehaviouralConsiderations && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground">Behavioural Considerations</p>
              <p className="text-sm text-foreground">{offer.snapshotBehaviouralConsiderations}</p>
            </div>
          )}
          {offer.snapshotMedicalRequirements && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground">Medical Requirements</p>
              <p className="text-sm text-foreground">{offer.snapshotMedicalRequirements}</p>
            </div>
          )}
          {offer.additionalNotes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground">Additional Notes from Employer</p>
              <p className="text-sm text-foreground">{offer.additionalNotes}</p>
            </div>
          )}
        </div>

        {offer.history && offer.history.length > 0 && (
          <div className="border-t border-border pt-4">
            <NegotiationHistory history={offer.history} />
          </div>
        )}

        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Messages</p>
          <MessageThread offerId={offer.offerId} myRole={role} />
        </div>

        {offer.status === "Accepted" && (
          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Review</p>
            <ReviewPanel offerId={offer.offerId} myRole={role} />
          </div>
        )}

        {role === "EMPLOYER" && (
          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Worker Compliance Documents</p>
            {offer.status === "Accepted" ? (
              <WorkerDocumentsPanel workerId={offer.workerId} />
            ) : (
              <WorkerDocumentsLockedPlaceholder />
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {isWorkerActionable && (
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Response</p>
            {!showProposeForm ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleWorkerAccept} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                  Accept Offer
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowProposeForm(true)} disabled={saving}>
                  Propose New Rate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleWorkerDecline}
                  disabled={saving}
                >
                  Decline
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Proposed Rate ($/hr)</Label>
                    <Input type="number" min={0} step={0.01} value={proposeRate} onChange={(e) => setProposeRate(e.target.value)} className="h-8 text-sm w-36" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Note (optional)</Label>
                    <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-8 text-sm" placeholder="Add a note…" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleWorkerPropose} disabled={saving}>
                    {saving ? "Submitting…" : "Submit Proposal"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowProposeForm(false); setError(null); }} disabled={saving}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {(isEmployerNegotiating || isEmployerCancellable) && (
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employer Actions</p>
            {isEmployerNegotiating && !showCounterForm && (
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  Worker proposed <span className="font-semibold text-primary">${offer.negotiatedRate?.toFixed(2)}/hr</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleEmployerAcceptRate} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                    Accept Proposed Rate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCounterForm(true)} disabled={saving}>
                    Counter Rate
                  </Button>
                </div>
              </div>
            )}
            {isEmployerNegotiating && showCounterForm && (
              <div className="space-y-3">
                <div className="flex gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Counter Rate ($/hr)</Label>
                    <Input type="number" min={0} step={0.01} value={counterRate} onChange={(e) => setCounterRate(e.target.value)} className="h-8 text-sm w-36" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Note (optional)</Label>
                    <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-8 text-sm" placeholder="Add a note…" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEmployerCounter} disabled={saving}>
                    {saving ? "Submitting…" : "Send Counter"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowCounterForm(false); setError(null); }} disabled={saving}>Cancel</Button>
                </div>
              </div>
            )}
            {isEmployerCancellable && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleEmployerCancel}
                disabled={saving}
              >
                Cancel Offer
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
