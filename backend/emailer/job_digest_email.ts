import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import db from "../db";
import { sendEmailsBulk } from "./sender";

interface DigestJob {
  job_id: string;
  employer_name: string;
  job_title: string | null;
  job_type: string;
  location: string;
  shift_date: string | null;
  shift_start_time: string | null;
  shift_duration_hours: number | null;
  support_type_tags: string[] | null;
  weekday_rate: number;
  is_emergency: boolean;
}

interface DigestWorker {
  user_id: string;
  email: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  travel_radius_km: number | null;
  minimum_pay_rate: number | null;
}

function formatRate(rate: number): string {
  return `$${(rate / 100).toFixed(2)}/hr`;
}

function buildJobCard(job: DigestJob): string {
  const title = job.job_title ?? (job.job_type === "shift" ? "Support Shift" : "Support Role");
  const tags = (job.support_type_tags ?? []).slice(0, 4);
  const tagPills = tags
    .map((t) => `<span style="display:inline-block;background:#e0f2fe;color:#0369a1;border-radius:4px;padding:2px 8px;font-size:12px;margin-right:4px;">${t}</span>`)
    .join("");
  const dateStr = job.shift_date
    ? new Date(job.shift_date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
    : null;
  const timeStr = job.shift_start_time ?? null;
  const duration = job.shift_duration_hours ? `${job.shift_duration_hours}hr` : null;

  const shiftLine = [dateStr, timeStr, duration].filter(Boolean).join(" · ");

  return `
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:14px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div>
          <p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#111827;">${title}</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">${job.employer_name} &mdash; ${job.location}</p>
        </div>
        ${job.is_emergency ? '<span style="background:#fef2f2;color:#dc2626;border-radius:4px;padding:2px 8px;font-size:12px;font-weight:600;">URGENT</span>' : ""}
      </div>
      ${shiftLine ? `<p style="margin:8px 0 6px;font-size:13px;color:#374151;">${shiftLine}</p>` : ""}
      ${tagPills ? `<div style="margin:8px 0 4px;">${tagPills}</div>` : ""}
      <p style="margin:6px 0 0;font-size:13px;color:#059669;font-weight:600;">${formatRate(job.weekday_rate)} weekday rate</p>
    </div>`;
}

function buildDigestEmail(name: string, jobs: DigestJob[], periodLabel: string): string {
  const jobCards = jobs.map(buildJobCard).join("");
  const count = jobs.length;
  const heading = `${count} new NDIS job${count !== 1 ? "s" : ""} available this ${periodLabel}`;

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;">
    <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;">
      <h2 style="color:#1a1a1a;margin:0 0 6px;">${heading}</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">Hi ${name}, here are the latest open jobs matching your profile.</p>
      ${jobCards}
      <div style="text-align:center;margin-top:20px;">
        <a href="https://kizazihire.com.au" style="display:inline-block;background:#2563eb;color:#fff;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:600;text-decoration:none;">
          View All Jobs &amp; Apply
        </a>
      </div>
    </div>
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
      Kizazi Hire &mdash; Connecting disability support workers with employers.<br/>
      You're receiving this because you have an active worker account. Log in to update your preferences.
    </p>
  </div>`;
}

async function isEnabled(key: string): Promise<boolean> {
  const row = await db.queryRow<{ value: string }>`
    SELECT value FROM platform_settings WHERE key = ${key}
  `;
  return row?.value === "true";
}

async function sendDigest(sinceInterval: string, periodLabel: string): Promise<void> {
  const jobs = await db.queryAll<DigestJob>`
    SELECT
      j.job_id,
      e.organisation_name AS employer_name,
      j.job_title,
      j.job_type,
      j.location,
      j.shift_date::text AS shift_date,
      j.shift_start_time,
      j.shift_duration_hours,
      j.support_type_tags,
      j.weekday_rate,
      j.is_emergency
    FROM job_requests j
    JOIN employers e ON e.employer_id = j.employer_id
    JOIN users eu ON eu.user_id = e.user_id
    WHERE
      j.status = 'Open'
      AND j.created_at >= NOW() - ${sinceInterval}::interval
      AND eu.is_demo = FALSE
    ORDER BY j.is_emergency DESC, j.created_at DESC
    LIMIT 20
  `;

  if (jobs.length === 0) return;

  const workers = await db.queryAll<DigestWorker>`
    SELECT
      u.user_id,
      u.email,
      w.name,
      w.latitude,
      w.longitude,
      w.travel_radius_km,
      wa.minimum_pay_rate
    FROM workers w
    JOIN users u ON u.user_id = w.user_id
    LEFT JOIN worker_availability wa ON wa.worker_id = w.worker_id
    WHERE
      u.is_verified = true
      AND u.is_suspended = false
      AND COALESCE(u.is_archived, false) = false
      AND u.is_demo = false
    LIMIT 2000
  `;

  if (workers.length === 0) return;

  const avgRate = jobs.reduce((sum, j) => sum + j.weekday_rate, 0) / jobs.length;

  const payloads = workers.map((w) => {
    const workerJobs = jobs.filter((j) => {
      if (w.minimum_pay_rate !== null && j.weekday_rate < w.minimum_pay_rate) return false;
      return true;
    });
    const displayJobs = workerJobs.length > 0 ? workerJobs : jobs;

    return {
      to: w.email,
      subject: `${jobs.length} new NDIS job${jobs.length !== 1 ? "s" : ""} available — Kizazi Hire`,
      html: buildDigestEmail(w.name, displayJobs.slice(0, 8), periodLabel),
    };
  });

  await sendEmailsBulk(payloads);
}

export const workerJobDigestWeekly = api(
  { expose: false, method: "POST", path: "/emailer/internal/job-digest-weekly" },
  async (): Promise<void> => {
    if (!(await isEnabled("job_digest_weekly_enabled"))) return;
    await sendDigest("7 days", "week");
  }
);

export const workerJobDigestDaily = api(
  { expose: false, method: "POST", path: "/emailer/internal/job-digest-daily" },
  async (): Promise<void> => {
    if (!(await isEnabled("job_digest_daily_enabled"))) return;
    await sendDigest("1 day", "day");
  }
);

export const _jobDigestWeeklyCron = new CronJob("worker-job-digest-weekly", {
  title: "Weekly job digest newsletter to workers",
  schedule: "0 8 * * 1",
  endpoint: workerJobDigestWeekly,
});

export const _jobDigestDailyCron = new CronJob("worker-job-digest-daily", {
  title: "Daily job digest newsletter to workers (weekdays)",
  schedule: "0 7 * * 1-5",
  endpoint: workerJobDigestDaily,
});
