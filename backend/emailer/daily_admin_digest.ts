import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import db from "../db";
import { sendEmail, sleep } from "./sender";

export const dailyAdminDigest = api(
  { expose: false, method: "POST", path: "/emailer/internal/admin-digest" },
  async (): Promise<void> => {
    const admins = await db.queryAll<{ email: string }>`
      SELECT u.email
      FROM admin_users au
      JOIN users u ON u.user_id = au.user_id
      WHERE COALESCE(u.is_suspended, false) = false
        AND COALESCE(u.is_archived, false) = false
    `;

    if (admins.length === 0) return;

    const [
      workersRow,
      employersRow,
      subsRow,
      revenueRow,
      pendingDocsRow,
      jobsRow,
      offersRow,
      newWorkersRow,
      newEmployersRow,
      unverifiedRow,
      newOffersRow,
      newMessagesRow,
    ] = await Promise.all([
      db.queryRow<{ count: number; new_today: number }>`
        SELECT
          COUNT(*)::int AS count,
          COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '1 day')::int AS new_today
        FROM workers w JOIN users u ON u.user_id = w.user_id WHERE u.is_demo = FALSE
      `,
      db.queryRow<{ count: number; new_today: number }>`
        SELECT
          COUNT(*)::int AS count,
          COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '1 day')::int AS new_today
        FROM employers e JOIN users u ON u.user_id = e.user_id WHERE u.is_demo = FALSE
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM employer_subscriptions WHERE status = 'active'
      `,
      db.queryRow<{ total: number }>`
        SELECT COALESCE(SUM(amount_aud_cents),0)::int AS total FROM employer_subscriptions WHERE status = 'active'
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM worker_documents WHERE verification_status = 'Pending'
      `,
      db.queryRow<{ active: number; total: number; new_today: number }>`
        SELECT
          COUNT(*) FILTER (WHERE status='Open')::int AS active,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')::int AS new_today
        FROM job_requests
      `,
      db.queryRow<{ total: number; accepted: number }>`
        SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='Accepted')::int AS accepted FROM offers
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM workers w JOIN users u ON u.user_id = w.user_id
        WHERE u.created_at >= date_trunc('month', NOW()) AND u.is_demo = FALSE
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM employers e JOIN users u ON u.user_id = e.user_id
        WHERE u.created_at >= date_trunc('month', NOW()) AND u.is_demo = FALSE
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM users WHERE is_verified = false AND role IN ('WORKER','EMPLOYER') AND is_demo = FALSE
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM offers WHERE created_at >= NOW() - INTERVAL '1 day'
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM messages WHERE created_at >= NOW() - INTERVAL '1 day'
      `,
    ]);

    const totalRevenue = ((revenueRow?.total ?? 0) / 100).toFixed(2);
    const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const statRow = (label: string, value: string | number, highlight = false) => `
      <tr>
        <td style="padding: 10px 16px; color: #374151; font-size: 14px; border-bottom: 1px solid #f3f4f6;">${label}</td>
        <td style="padding: 10px 16px; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #f3f4f6; color: ${highlight ? "#dc2626" : "#111827"};">${value}</td>
      </tr>`;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #f9fafb;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: #1d4ed8; padding: 24px 28px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Daily Platform Digest</h1>
          <p style="color: #bfdbfe; margin: 6px 0 0; font-size: 14px;">${today}</p>
        </div>

        <div style="padding: 24px 28px;">
          <h2 style="font-size: 15px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px;">24-Hour Activity</h2>
          <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden;">
            ${statRow("New workers registered", workersRow?.new_today ?? 0)}
            ${statRow("New employers registered", employersRow?.new_today ?? 0)}
            ${statRow("New job requests posted", jobsRow?.new_today ?? 0)}
            ${statRow("New offers created", newOffersRow?.count ?? 0)}
            ${statRow("Messages sent", newMessagesRow?.count ?? 0)}
          </table>

          <h2 style="font-size: 15px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 28px 0 12px;">Platform Totals</h2>
          <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden;">
            ${statRow("Total workers", workersRow?.count ?? 0)}
            ${statRow("Total employers", employersRow?.count ?? 0)}
            ${statRow("Active subscriptions", subsRow?.count ?? 0)}
            ${statRow("Active revenue (AUD/mo)", `$${totalRevenue}`)}
            ${statRow("Active job requests", jobsRow?.active ?? 0)}
            ${statRow("Total offers", offersRow?.total ?? 0)}
            ${statRow("Accepted offers", offersRow?.accepted ?? 0)}
          </table>

          <h2 style="font-size: 15px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 28px 0 12px;">This Month</h2>
          <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden;">
            ${statRow("New workers this month", newWorkersRow?.count ?? 0)}
            ${statRow("New employers this month", newEmployersRow?.count ?? 0)}
          </table>

          <h2 style="font-size: 15px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 28px 0 12px;">Action Required</h2>
          <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden;">
            ${statRow("Pending document verifications", pendingDocsRow?.count ?? 0, (pendingDocsRow?.count ?? 0) > 0)}
            ${statRow("Unverified user accounts", unverifiedRow?.count ?? 0, (unverifiedRow?.count ?? 0) > 5)}
          </table>
        </div>

        <div style="padding: 16px 28px; border-top: 1px solid #f3f4f6;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">Kizazi Hire &mdash; Admin Daily Digest &mdash; Sent automatically at 7:00 AM AEST</p>
        </div>
      </div>
    </div>`;

    for (const admin of admins) {
      try {
        await sendEmail({
          to: admin.email,
          subject: `Daily Platform Digest — ${today}`,
          html,
        });
      } catch {
      }
      await sleep(250);
    }
  }
);

export const _dailyAdminDigestCron = new CronJob("daily-admin-digest", {
  title: "Daily admin dashboard digest email",
  schedule: "0 21 * * *",
  endpoint: dailyAdminDigest,
});
