import { Topic } from "encore.dev/pubsub";

export type NotificationType =
  | "DOCUMENT_EXPIRING_60"
  | "DOCUMENT_EXPIRING_30"
  | "DOCUMENT_EXPIRED"
  | "EMERGENCY_SHIFT_AVAILABLE"
  | "ADMIN_DOCUMENT_MESSAGE";

export interface DocumentExpiryEvent {
  userId: string;
  documentId: string;
  documentType: string;
  expiryDate: string;
  notificationType: NotificationType;
}

export const documentExpiryTopic = new Topic<DocumentExpiryEvent>(
  "document-expiry",
  { deliveryGuarantee: "at-least-once" }
);

export interface EmergencyShiftEvent {
  jobId: string;
  employerId: string;
  location: string;
  shiftDate: string;
  shiftStartTime: string;
  shiftDurationHours: number;
  weekdayRate: number;
  supportTypeTags: string[];
  responseDeadline: string | null;
  workerUserIds: string[];
}

export const emergencyShiftTopic = new Topic<EmergencyShiftEvent>(
  "emergency-shift",
  { deliveryGuarantee: "at-least-once" }
);
