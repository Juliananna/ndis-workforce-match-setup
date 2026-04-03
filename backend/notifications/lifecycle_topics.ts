import { Topic } from "encore.dev/pubsub";

export interface UserVerifiedEvent {
  userId: string;
  email: string;
  role: "WORKER" | "EMPLOYER";
  name: string;
}

export const userVerifiedTopic = new Topic<UserVerifiedEvent>("user-verified", {
  deliveryGuarantee: "at-least-once",
});

export interface EmployerSubscribedEvent {
  userId: string;
  email: string;
  organisationName: string;
  plan: string;
  periodEnd: string;
}

export const employerSubscribedTopic = new Topic<EmployerSubscribedEvent>("employer-subscribed", {
  deliveryGuarantee: "at-least-once",
});

export interface OfferDeclinedEvent {
  offerId: string;
  recipientUserId: string;
  declinedByRole: "WORKER" | "EMPLOYER";
  location: string;
  shiftDate: string;
  notes?: string;
}

export const offerDeclinedTopic = new Topic<OfferDeclinedEvent>("offer-declined", {
  deliveryGuarantee: "at-least-once",
});

export interface PaymentSucceededEvent {
  userId: string;
  email: string;
  name: string;
  amountAudCents: number;
  description: string;
}

export const paymentSucceededTopic = new Topic<PaymentSucceededEvent>("payment-succeeded", {
  deliveryGuarantee: "at-least-once",
});

export interface WorkerSignedUpEvent {
  userId: string;
  email: string;
  firstName: string;
}

export const workerSignedUpTopic = new Topic<WorkerSignedUpEvent>("worker-signed-up", {
  deliveryGuarantee: "at-least-once",
});
