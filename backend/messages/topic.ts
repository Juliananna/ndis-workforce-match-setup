import { Topic } from "encore.dev/pubsub";

export interface NewMessageEvent {
  messageId: string;
  offerId: string;
  senderRole: "EMPLOYER" | "WORKER";
  senderUserId: string;
  recipientUserId: string;
  recipientRole: "EMPLOYER" | "WORKER";
  bodyPreview: string;
  location: string;
  shiftDate: string;
}

export const newMessageTopic = new Topic<NewMessageEvent>("new-message", {
  deliveryGuarantee: "at-least-once",
});
