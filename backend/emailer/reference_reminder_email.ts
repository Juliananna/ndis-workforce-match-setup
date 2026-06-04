import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import db from "../db";
import { sendEmail } from "./sender";

const APP_URL = "https://ndis-workforce-match-setup-d6t4j0c82vjgmsb23vrg.lp.dev";

export const sendReferenceCallReminders = api(
  { expose: false, method: "POST", path: "/emailer/internal/reference-call-reminders" },
  async (): Promise<void> => {
    const now = new Date();

    const due24h = await db.queryAll<{
      id: string;
      officer_email: string;
      scheduled_at: Date;
      worker_name: string;
      referee_name: string;
      referee_organisation: string;
      referee_phone: string | null;
    }>`
      SELECT
        rcb.id,
        rcb.officer_email,
        rcb.scheduled_at,
        w.name AS worker_name,
        wr.referee_name,
        wr.referee_organisation,
        wr.referee_phone
      FROM reference_call_bookings rcb
      JOIN worker_references wr ON wr.id = rcb.reference_id
      JOIN workers w ON w.worker_id = wr.worker_id
      WHERE rcb.status = 'Scheduled'
        AND rcb.reminder_24h_sent = FALSE
        AND rcb.scheduled_at BETWEEN ${new Date(now.getTime() + 23 * 3600 * 1000)} AND ${new Date(now.getTime() + 25 * 3600 * 1000)}
    `;

    for (const row of due24h) {
      const scheduledStr = row.scheduled_at.toLocaleString("en-AU", {
        dateStyle: "full", timeStyle: "short", timeZone: "Australia/Sydney",
      });
      await sendEmail({
        to: row.officer_email,
        subject: `Reminder: Reference call tomorrow — ${row.referee_name} for ${row.worker_name}`,
        html: buildReminderEmail({
          workerName: row.worker_name,
          refereeName: row.referee_name,
          refereeOrganisation: row.referee_organisation,
          refereePhone: row.referee_phone,
          scheduledStr,
          timeframe: "tomorrow",
        }),
      });
      await db.exec`
        UPDATE reference_call_bookings SET reminder_24h_sent = TRUE, updated_at = NOW()
        WHERE id = ${row.id}
      `;
    }

    const due1h = await db.queryAll<{
      id: string;
      officer_email: string;
      scheduled_at: Date;
      worker_name: string;
      referee_name: string;
      referee_organisation: string;
      referee_phone: string | null;
    }>`
      SELECT
        rcb.id,
        rcb.officer_email,
        rcb.scheduled_at,
        w.name AS worker_name,
        wr.referee_name,
        wr.referee_organisation,
        wr.referee_phone
      FROM reference_call_bookings rcb
      JOIN worker_references wr ON wr.id = rcb.reference_id
      JOIN workers w ON w.worker_id = wr.worker_id
      WHERE rcb.status = 'Scheduled'
        AND rcb.reminder_1h_sent = FALSE
        AND rcb.scheduled_at BETWEEN ${new Date(now.getTime() + 50 * 60 * 1000)} AND ${new Date(now.getTime() + 70 * 60 * 1000)}
    `;

    for (const row of due1h) {
      const scheduledStr = row.scheduled_at.toLocaleString("en-AU", {
        dateStyle: "full", timeStyle: "short", timeZone: "Australia/Sydney",
      });
      await sendEmail({
        to: row.officer_email,
        subject: `Starting in 1 hour: Reference call with ${row.referee_name} for ${row.worker_name}`,
        html: buildReminderEmail({
          workerName: row.worker_name,
          refereeName: row.referee_name,
          refereeOrganisation: row.referee_organisation,
          refereePhone: row.referee_phone,
          scheduledStr,
          timeframe: "in 1 hour",
        }),
      });
      await db.exec`
        UPDATE reference_call_bookings SET reminder_1h_sent = TRUE, updated_at = NOW()
        WHERE id = ${row.id}
      `;
    }
  }
);

export const _referenceReminderCron = new CronJob("reference-call-reminders", {
  title: "Hourly reference call reminders",
  schedule: "0 * * * *",
  endpoint: sendReferenceCallReminders,
});

function buildReminderEmail(params: {
  workerName: string;
  refereeName: string;
  refereeOrganisation: string;
  refereePhone: string | null;
  scheduledStr: string;
  timeframe: string;
}): string {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h2 style="color: #3730a3; margin: 0 0 6px;">Reference Call Reminder</h2>
      <p style="color: #4338ca; margin: 0; font-size: 14px;">Scheduled ${params.timeframe}</p>
    </div>

    <p style="color: #374151; font-size: 15px;">
      You have a reference call scheduled <strong>${params.timeframe}</strong> for <strong>${params.workerName}</strong>.
    </p>

    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; font-size: 14px; color: #374151; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #6b7280; width: 140px;">Referee:</td><td><strong>${params.refereeName}</strong></td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Organisation:</td><td>${params.refereeOrganisation}</td></tr>
        ${params.refereePhone ? `<tr><td style="padding: 4px 0; color: #6b7280;">Phone:</td><td><strong>${params.refereePhone}</strong></td></tr>` : ""}
        <tr><td style="padding: 4px 0; color: #6b7280;">Scheduled:</td><td>${params.scheduledStr}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b7280;">Worker:</td><td>${params.workerName}</td></tr>
      </table>
    </div>

    <p style="color: #6b7280; font-size: 13px;">
      Log in to the Compliance Portal to record the outcome of the call once completed.
    </p>

    <div style="text-align:center;margin:24px 0;">
      <a href="${APP_URL}/compliance" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Open Compliance Portal</a>
    </div>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="color: #9ca3af; font-size: 12px;">Kizazi Hire &mdash; Compliance Portal</p>
  </div>`;
}
