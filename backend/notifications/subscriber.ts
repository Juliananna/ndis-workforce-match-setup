import { Subscription } from "encore.dev/pubsub";
import db from "../db";
import { documentExpiryTopic, type NotificationType } from "./topic";

const TITLES: Record<NotificationType, string> = {
  DOCUMENT_EXPIRING_60: "Document expiring in 60 days",
  DOCUMENT_EXPIRING_30: "Document expiring in 30 days",
  DOCUMENT_EXPIRED: "Document has expired",
  EMERGENCY_SHIFT_AVAILABLE: "Emergency shift available",
  ADMIN_DOCUMENT_MESSAGE: "Message about your document",
};

function makeBody(docType: string, expiryDate: string, type: NotificationType): string {
  if (type === "DOCUMENT_EXPIRED") {
    return `Your ${docType} expired on ${expiryDate}. Please renew it to stay compliant.`;
  }
  const days = type === "DOCUMENT_EXPIRING_30" ? 30 : 60;
  return `Your ${docType} expires on ${expiryDate} (within ${days} days). Please renew it soon.`;
}

new Subscription(documentExpiryTopic, "persist-expiry-notification", {
  handler: async (event) => {
    const title = TITLES[event.notificationType];
    const body = makeBody(event.documentType, event.expiryDate, event.notificationType);

    await db.exec`
      INSERT INTO notifications (user_id, type, document_id, title, body)
      VALUES (
        ${event.userId},
        ${event.notificationType},
        ${event.documentId},
        ${title},
        ${body}
      )
      ON CONFLICT (document_id, type, date_trunc('month', created_at)) DO NOTHING
    `;
  },
});
