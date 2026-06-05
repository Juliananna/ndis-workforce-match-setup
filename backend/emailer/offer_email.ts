import { Subscription } from "encore.dev/pubsub";
import db from "../db";
import { offerEmailTopic, type OfferEventType } from "../offers/topic";
import { sendEmail } from "./sender";

const APP_URL = "https://kizazihire.com.au";

const SUBJECTS: Record<OfferEventType, string> = {
  OFFER_SENT: "Your shift offer has been sent",
  OFFER_RECEIVED: "You have received a new shift offer",
  OFFER_ACCEPTED: "Your offer has been accepted",
  RATE_PROPOSED: "A new rate has been proposed for your offer",
};

function buildOfferHtml(
  eventType: OfferEventType,
  location: string,
  shiftDate: string | null,
  shiftStartTime: string | null,
  offeredRate: number,
  proposedRate?: number,
  notes?: string
): string {
  const rateRow =
    eventType === "RATE_PROPOSED" && proposedRate != null
      ? `<tr><td style="padding:6px 0; color:#555; width:40%;">Proposed rate</td><td style="padding:6px 0; font-weight:bold;">$${proposedRate}/hr</td></tr>`
      : `<tr><td style="padding:6px 0; color:#555; width:40%;">Offered rate</td><td style="padding:6px 0; font-weight:bold;">$${offeredRate}/hr</td></tr>`;

  const shiftDateRow = shiftDate
    ? `<tr><td style="padding:6px 0; color:#555;">Shift date</td><td style="padding:6px 0; font-weight:bold;">${shiftDate}</td></tr>`
    : `<tr><td style="padding:6px 0; color:#555;">Shift date</td><td style="padding:6px 0; font-weight:bold;">Ongoing / TBD</td></tr>`;

  const shiftTimeRow = shiftStartTime
    ? `<tr><td style="padding:6px 0; color:#555;">Start time</td><td style="padding:6px 0; font-weight:bold;">${shiftStartTime}</td></tr>`
    : "";

  const notesSection = notes
    ? `<p style="color:#555; font-size:14px;"><strong>Note:</strong> ${notes}</p>`
    : "";

  const callToAction: Record<OfferEventType, string> = {
    OFFER_SENT: "Your offer has been sent to the worker. We will notify you when they respond.",
    OFFER_RECEIVED: "Log in to review the offer details, accept, decline, or propose a different rate.",
    OFFER_ACCEPTED: "Great news! Log in to view the confirmed shift details.",
    RATE_PROPOSED: "Log in to review the proposed rate and respond.",
  };

  const ctaPath: Record<OfferEventType, string> = {
    OFFER_SENT: "/employer",
    OFFER_RECEIVED: "/offers",
    OFFER_ACCEPTED: "/offers",
    RATE_PROPOSED: "/offers",
  };

  const ctaLabel: Record<OfferEventType, string> = {
    OFFER_SENT: "View Employer Dashboard",
    OFFER_RECEIVED: "Review Offer",
    OFFER_ACCEPTED: "View Offer Details",
    RATE_PROPOSED: "Review Proposed Rate",
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">${SUBJECTS[eventType]}</h2>
      <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
        <tr><td style="padding:6px 0; color:#555; width:40%;">Location</td><td style="padding:6px 0; font-weight:bold;">${location}</td></tr>
        ${shiftDateRow}
        ${shiftTimeRow}
        ${rateRow}
      </table>
      ${notesSection}
      <p style="color: #555; font-size: 14px;">${callToAction[eventType]}</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${APP_URL}${ctaPath[eventType]}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">${ctaLabel[eventType]}</a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
    </div>
  `;
}

new Subscription(offerEmailTopic, "email-offer-events", {
  handler: async (event) => {
    const user = await db.queryRow<{ email: string }>`
      SELECT email FROM users WHERE user_id = ${event.recipientUserId}
    `;
    if (!user) return;

    await sendEmail({
      to: user.email,
      subject: SUBJECTS[event.eventType],
      html: buildOfferHtml(
        event.eventType,
        event.location,
        event.shiftDate ?? null,
        event.shiftStartTime ?? null,
        event.offeredRate,
        event.proposedRate,
        event.notes
      ),
    });
  },
});
