import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import db from "../db";
import { sendEmailsBulk } from "./sender";

export const profileCompletionReminder = api(
  { expose: false, method: "POST", path: "/emailer/internal/profile-reminder" },
  async (): Promise<void> => {
    const rows = await db.queryAll<{ user_id: string; email: string; name: string; doc_count: number }>`
      SELECT
        u.user_id,
        u.email,
        w.name,
        COUNT(wd.id)::int AS doc_count
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      LEFT JOIN worker_documents wd ON wd.worker_id = w.worker_id
      WHERE
        u.is_verified = true
        AND u.is_suspended = false
        AND u.created_at <= NOW() - INTERVAL '3 days'
        AND u.created_at >= NOW() - INTERVAL '60 days'
      GROUP BY u.user_id, u.email, w.name
      HAVING COUNT(wd.id) = 0
    `;

    const payloads = rows.map((row) => ({
      to: row.email,
      subject: "Action needed: Upload your compliance documents to get matched",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Your profile is missing compliance documents</h2>
        <p style="color: #555; font-size: 15px;">Hi ${row.name},</p>
        <p style="color: #555; font-size: 15px;">
          Employers can see your profile, but <strong>without compliance documents you won't appear in job matches</strong>.
          Upload your NDIS Screening, police check, WWCC, and certifications to get noticed.
        </p>

        <div style="background: #fef9c3; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">Documents to upload:</p>
          <ul style="margin: 8px 0 0; padding-left: 18px; color: #78350f; font-size: 14px; line-height: 1.8;">
            <li>NDIS Worker Screening Check</li>
            <li>Police Check (within 3 years)</li>
            <li>Working with Children Check</li>
            <li>First Aid Certificate</li>
            <li>Any relevant qualifications</li>
          </ul>
        </div>

        <p style="color: #555; font-size: 14px;">Log in to your dashboard to upload your documents — it only takes a few minutes.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
      </div>`,
    }));

    await sendEmailsBulk(payloads);
  }
);

export const _profileReminderCron = new CronJob("profile-completion-reminder", {
  title: "Weekly profile completion reminder",
  schedule: "0 9 * * 1",
  endpoint: profileCompletionReminder,
});

export const subscriptionExpiryReminder = api(
  { expose: false, method: "POST", path: "/emailer/internal/sub-expiry-reminder" },
  async (): Promise<void> => {
    const rows = await db.queryAll<{
      user_id: string;
      email: string;
      organisation_name: string;
      subscription_plan: string;
      subscription_period_end: Date;
    }>`
      SELECT
        u.user_id,
        u.email,
        e.organisation_name,
        e.subscription_plan,
        e.subscription_period_end
      FROM employers e
      JOIN users u ON u.user_id = e.user_id
      WHERE
        e.subscription_status = 'active'
        AND e.subscription_period_end IS NOT NULL
        AND e.subscription_period_end::date = (NOW() + INTERVAL '7 days')::date
        AND u.is_suspended = false
    `;

    const payloads = rows.map((row) => {
      const expiryDate = row.subscription_period_end.toLocaleDateString("en-AU", {
        day: "numeric", month: "long", year: "numeric",
      });
      return {
        to: row.email,
        subject: `Your Kizazi Hire subscription expires on ${expiryDate} — renew now`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <h2 style="color: #9a3412; margin: 0 0 6px;">Your subscription expires in 7 days</h2>
          <p style="color: #c2410c; margin: 0; font-size: 14px;">${row.organisation_name} &mdash; ${row.subscription_plan ?? "subscription"} plan</p>
        </div>

        <p style="color: #374151; font-size: 15px;">
          Your Kizazi Hire subscription expires on <strong>${expiryDate}</strong>.
          After that date you will lose access to worker profiles and job posting.
        </p>

        <p style="color: #374151; font-size: 14px;">To keep your access uninterrupted, renew your subscription before it expires.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
      </div>`,
      };
    });

    await sendEmailsBulk(payloads);
  }
);

export const _subExpiryCron = new CronJob("subscription-expiry-reminder", {
  title: "Daily subscription expiry reminder (7 days out)",
  schedule: "0 8 * * *",
  endpoint: subscriptionExpiryReminder,
});

export const inactiveWorkerReengagement = api(
  { expose: false, method: "POST", path: "/emailer/internal/reengagement" },
  async (): Promise<void> => {
    const rows = await db.queryAll<{ user_id: string; email: string; name: string; last_login_at: Date | null }>`
      SELECT
        u.user_id,
        u.email,
        w.name,
        u.last_login_at
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      WHERE
        u.is_verified = true
        AND u.is_suspended = false
        AND (
          u.last_login_at IS NULL AND u.created_at <= NOW() - INTERVAL '30 days'
          OR u.last_login_at <= NOW() - INTERVAL '30 days'
        )
        AND u.created_at <= NOW() - INTERVAL '7 days'
      LIMIT 500
    `;

    const payloads = rows.map((row) => ({
      to: row.email,
      subject: "New NDIS shifts are waiting for you — come back to Kizazi Hire",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">We miss you, ${row.name}!</h2>
        <p style="color: #555; font-size: 15px;">
          It's been a while since you've logged in to Kizazi Hire.
          New NDIS job opportunities are posted every day — come back and see what's waiting for you.
        </p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #166534; font-size: 14px; font-weight: 600;">What's new on the platform:</p>
          <ul style="margin: 8px 0 0; padding-left: 18px; color: #15803d; font-size: 14px; line-height: 1.8;">
            <li>New job requests from verified NDIS providers</li>
            <li>Emergency shift alerts with fast response</li>
            <li>Better profile matching based on your skills</li>
          </ul>
        </div>

        <p style="color: #555; font-size: 14px;">Log in now to update your availability and start receiving shift offers.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
      </div>`,
    }));

    await sendEmailsBulk(payloads);
  }
);

export const _reengagementCron = new CronJob("inactive-worker-reengagement", {
  title: "Monthly re-engagement for inactive workers",
  schedule: "0 9 1 * *",
  endpoint: inactiveWorkerReengagement,
});
