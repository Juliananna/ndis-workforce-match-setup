import { Subscription } from "encore.dev/pubsub";
import db from "../db";
import { emergencyShiftTopic } from "../notifications/topic";
import { sendEmail } from "./sender";

function buildEmergencyShiftHtml(event: {
  location: string;
  shiftDate: string;
  shiftStartTime: string;
  shiftDurationHours: number;
  weekdayRate: number;
  supportTypeTags: string[];
  responseDeadline: string | null;
  jobId: string;
}): string {
  const deadline = event.responseDeadline
    ? `<p style="color:#c0392b; font-weight:bold;">Respond by: ${new Date(event.responseDeadline).toLocaleString("en-AU")}</p>`
    : "";

  const tags = event.supportTypeTags.length
    ? `<p><strong>Support types:</strong> ${event.supportTypeTags.join(", ")}</p>`
    : "";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #c0392b;">Emergency Shift Available</h2>
      <p style="font-size: 15px; color: #333;">An urgent shift has been posted that matches your profile.</p>
      <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
        <tr><td style="padding:6px 0; color:#555; width:40%;">Location</td><td style="padding:6px 0; font-weight:bold;">${event.location}</td></tr>
        <tr><td style="padding:6px 0; color:#555;">Date</td><td style="padding:6px 0; font-weight:bold;">${event.shiftDate}</td></tr>
        <tr><td style="padding:6px 0; color:#555;">Start time</td><td style="padding:6px 0; font-weight:bold;">${event.shiftStartTime}</td></tr>
        <tr><td style="padding:6px 0; color:#555;">Duration</td><td style="padding:6px 0; font-weight:bold;">${event.shiftDurationHours} hours</td></tr>
        <tr><td style="padding:6px 0; color:#555;">Rate</td><td style="padding:6px 0; font-weight:bold;">$${event.weekdayRate}/hr</td></tr>
      </table>
      ${tags}
      ${deadline}
      <p style="color: #555; font-size: 14px;">Log in to your account to express interest before the deadline.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">Kizazi Hire &mdash; ref: ${event.jobId}</p>
    </div>
  `;
}

new Subscription(emergencyShiftTopic, "email-emergency-shift", {
  handler: async (event) => {
    if (!event.workerUserIds.length) return;

    const users = db.query<{ email: string }>`
      SELECT email FROM users WHERE user_id = ANY(${event.workerUserIds}::uuid[])
    `;

    const html = buildEmergencyShiftHtml(event);
    const subject = `Emergency shift available — ${event.location} on ${event.shiftDate}`;

    for await (const user of users) {
      await sendEmail({ to: user.email, subject, html });
    }
  },
});
