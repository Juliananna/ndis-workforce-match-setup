export type OfferStatus = "Pending" | "Accepted" | "Declined" | "Negotiating" | "Cancelled";
export type Actor = "EMPLOYER" | "WORKER";
export type EventType = "OFFER_SENT" | "ACCEPTED" | "DECLINED" | "RATE_PROPOSED" | "CANCELLED";

export interface NegotiationEvent {
  eventId: string;
  offerId: string;
  actor: Actor;
  eventType: EventType;
  rate: number | null;
  note: string | null;
  createdAt: Date;
}

export interface Offer {
  offerId: string;
  jobId: string;
  employerId: string;
  workerId: string;
  snapshotLocation: string;
  snapshotShiftDate: string;
  snapshotShiftStartTime: string;
  snapshotShiftDurationHours: number;
  snapshotSupportTypeTags: string[];
  snapshotClientNotes: string | null;
  snapshotBehaviouralConsiderations: string | null;
  snapshotMedicalRequirements: string | null;
  offeredRate: number;
  negotiatedRate: number | null;
  latestProposedBy: Actor | null;
  status: OfferStatus;
  additionalNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  history?: NegotiationEvent[];
}
