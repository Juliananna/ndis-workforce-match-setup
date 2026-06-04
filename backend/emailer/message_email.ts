import { Subscription } from "encore.dev/pubsub";
import db from "../db";
import { newMessageTopic } from "../messages/topic";
import { sendEmail } from "./sender";

const APP_URL = "https://ndis-workforce-match-setup-d6t4j0c82vjgmsb23vrg.lp.dev";

new Subscription(newMessageTopic, "email-new-message", {
  handler: async (event) => {
    const user = await db.queryRow<{ email: string }>`
      SELECT email FROM users WHERE user_id = ${event.recipientUserId}
    `;
    if (!user) return;

    const senderLabel = event.senderRole === "EMPLOYER" ? "An employer" : "A support worker";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">New message received</h2>
        <p style="color: #333; font-size: 15px;">${senderLabel} has sent you a message regarding the shift at <strong>${event.location}</strong> on <strong>${event.shiftDate}</strong>.</p>
        <div style="background: #f5f5f5; border-left: 4px solid #4a90d9; padding: 12px 16px; margin: 16px 0; border-radius: 2px;">
          <p style="margin: 0; color: #333; font-size: 14px;">${event.bodyPreview}</p>
        </div>
        <p style="color: #555; font-size: 14px;">Log in to your account to read and reply to this message.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${APP_URL}/offers" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Read &amp; Reply</a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Kizazi Hire &mdash; ref: ${event.offerId}</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: `New message — ${event.location} shift on ${event.shiftDate}`,
      html,
    });
  },
});
