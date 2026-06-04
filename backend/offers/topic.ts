import { Topic } from "encore.dev/pubsub";

export type OfferEventType = "OFFER_SENT" | "OFFER_RECEIVED" | "OFFER_ACCEPTED" | "RATE_PROPOSED";

export interface OfferEmailEvent {
  eventType: OfferEventType;
  offerId: string;
  jobId: string;
  recipientUserId: string;
  recipientRole: "WORKER" | "EMPLOYER";
  location: string;
  shiftDate: string | null;
  shiftStartTime: string | null;
  offeredRate: number;
  proposedRate?: number;
  notes?: string;
}

export const offerEmailTopic = new Topic<OfferEmailEvent>("offer-email", {
  deliveryGuarantee: "at-least-once",
});
