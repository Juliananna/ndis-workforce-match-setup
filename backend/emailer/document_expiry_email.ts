import { Subscription } from "encore.dev/pubsub";
import db from "../db";
import { documentExpiryTopic, type NotificationType } from "../notifications/topic";
import { sendEmail } from "./sender";

const SUBJECTS: Record<NotificationType, string> = {
  DOCUMENT_EXPIRING_60: "Action Required: Your document expires in 60 days",
  DOCUMENT_EXPIRING_30: "Urgent: Your document expires in 30 days",
  DOCUMENT_EXPIRED: "Your document has expired",
  EMERGENCY_SHIFT_AVAILABLE: "Emergency shift available",
  ADMIN_DOCUMENT_MESSAGE: "Message about your document",
};

function buildDocumentEmailHtml(
  docType: string,
  expiryDate: string,
  type: NotificationType
): string {
  const isExpired = type === "DOCUMENT_EXPIRED";
  const days = type === "DOCUMENT_EXPIRING_30" ? 30 : 60;

  const message = isExpired
    ? `Your <strong>${docType}</strong> expired on <strong>${expiryDate}</strong>. Please renew it immediately to stay compliant and continue working.`
    : `Your <strong>${docType}</strong> expires on <strong>${expiryDate}</strong> (within ${days} days). Please renew it soon to avoid any disruption to your work.`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">${SUBJECTS[type]}</h2>
      <p style="color: #333; font-size: 15px;">${message}</p>
      <p style="color: #555; font-size: 14px;">Log in to your Kizazi Hire account to upload your renewed document.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">NDIS Workforce Match &mdash; Keeping compliance simple.</p>
    </div>
  `;
}

new Subscription(documentExpiryTopic, "email-document-expiry", {
  handler: async (event) => {
    const user = await db.queryRow<{ email: string }>`
      SELECT email FROM users WHERE user_id = ${event.userId}
    `;
    if (!user) return;

    await sendEmail({
      to: user.email,
      subject: SUBJECTS[event.notificationType],
      html: buildDocumentEmailHtml(event.documentType, event.expiryDate, event.notificationType),
    });
  },
});
