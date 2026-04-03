import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import { Subscription } from "encore.dev/pubsub";
import db from "../db";
import { sendEmail, sendEmailsBulk } from "./sender";
import { workerSignedUpTopic } from "../notifications/lifecycle_topics";

const APP_URL = "https://ndis-workforce-match-setup-d6t4j0c82vjgmsb23vrg.lp.dev";

function ctaButton(text: string, url: string): string {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.02em;">${text}</a>
  </div>`;
}

function emailWrapper(content: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
    ${content}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;" />
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
  </div>`;
}

function progressBar(pct: number): string {
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#3b82f6";
  return `<div style="margin:16px 0;">
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span style="font-size:13px;color:#374151;font-weight:600;">Profile completion</span>
      <span style="font-size:13px;font-weight:700;color:${color};">${pct}%</span>
    </div>
    <div style="height:10px;border-radius:999px;background:#e5e7eb;overflow:hidden;">
      <div style="height:100%;width:${pct}%;border-radius:999px;background:${color};"></div>
    </div>
  </div>`;
}

function checklist(items: { label: string; done: boolean }[]): string {
  const rows = items.map((i) => {
    const icon = i.done
      ? `<span style="color:#22c55e;font-size:16px;line-height:1;">&#10003;</span>`
      : `<span style="color:#d1d5db;font-size:16px;line-height:1;">&#9675;</span>`;
    const textColor = i.done ? "#6b7280" : "#111827";
    const textDecor = i.done ? "line-through" : "none";
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;background:${i.done ? "#f9fafb" : "#f0f9ff"};margin-bottom:6px;">
      ${icon}
      <span style="font-size:14px;color:${textColor};text-decoration:${textDecor};">${i.label}</span>
    </div>`;
  }).join("");
  return `<div style="margin:16px 0;">${rows}</div>`;
}

function buildEmail1(firstName: string, pct: number, sections: { label: string; done: boolean }[]): string {
  return emailWrapper(`
    <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);border-radius:12px;padding:32px;text-align:center;margin-bottom:24px;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;">Welcome, ${firstName}!</h1>
      <p style="color:#bfdbfe;margin:8px 0 0;font-size:15px;">Let's get you verified and ready to work</p>
    </div>

    <p style="color:#374151;font-size:15px;">Hi ${firstName},</p>
    <p style="color:#374151;font-size:15px;">You've just joined Kizazi Hire — and the fastest way to start getting shifts is to <strong>get verified</strong>.</p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 10px;font-weight:700;color:#1e40af;font-size:15px;">Why verification matters:</p>
      <ul style="margin:0;padding-left:20px;color:#1d4ed8;font-size:14px;line-height:2;">
        <li>Providers prioritise verified profiles when selecting workers</li>
        <li>Incomplete profiles are often skipped over</li>
        <li>Verified workers get matched faster and earn more shifts</li>
      </ul>
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#166534;font-size:14px;font-weight:700;">&#127381; Early access offer — first 200 workers only</p>
      <p style="margin:6px 0 0;color:#15803d;font-size:14px;">Free document verification + 2 free reference checks included with your account.</p>
    </div>

    ${progressBar(pct)}
    ${checklist(sections)}
    ${ctaButton("Complete Your Profile", `${APP_URL}/dashboard`)}
  `);
}

function buildEmail2(firstName: string, pct: number, sections: { label: string; done: boolean }[]): string {
  const incompleteCount = sections.filter((s) => !s.done).length;
  return emailWrapper(`
    <div style="background:linear-gradient(135deg,#0891b2,#2563eb);border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;">You're close, ${firstName}</h1>
      <p style="color:#bae6fd;margin:8px 0 0;font-size:14px;">Just ${incompleteCount} step${incompleteCount !== 1 ? "s" : ""} left to get verified</p>
    </div>

    <p style="color:#374151;font-size:15px;">Hi ${firstName},</p>
    <p style="color:#374151;font-size:15px;">
      Workers who complete their profile <strong>get matched faster</strong> and are chosen more often by providers.
      Your profile is currently <strong>${pct}% complete</strong> — let's finish it off.
    </p>

    ${progressBar(pct)}
    ${checklist(sections)}

    <p style="color:#6b7280;font-size:14px;">It only takes a few minutes. Once you're verified, providers can start sending you shift offers directly.</p>
    ${ctaButton("Finish Your Profile", `${APP_URL}/dashboard`)}
  `);
}

function buildEmail3(firstName: string, pct: number): string {
  return emailWrapper(`
    <div style="background:linear-gradient(135deg,#d97706,#dc2626);border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;">Your free verification won't last</h1>
      <p style="color:#fde68a;margin:8px 0 0;font-size:14px;">Limited to early users — act now</p>
    </div>

    <p style="color:#374151;font-size:15px;">Hi ${firstName},</p>
    <p style="color:#374151;font-size:15px;">
      Free verification is available to the <strong>first 200 workers</strong> who complete their profile on Kizazi Hire.
      Your profile is currently <strong>${pct}% complete</strong>.
    </p>

    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 10px;font-weight:700;color:#92400e;font-size:15px;">Verified workers get:</p>
      <ul style="margin:0;padding-left:20px;color:#78350f;font-size:14px;line-height:2;">
        <li>Higher visibility in provider searches</li>
        <li>Priority matching for job offers</li>
        <li>A "Verified" badge that builds provider trust</li>
        <li>More shift offers, more income</li>
      </ul>
    </div>

    <p style="color:#374151;font-size:15px;">Don't miss out — complete your profile now while verification is still free.</p>
    ${ctaButton("Get Verified Now", `${APP_URL}/dashboard`)}
  `);
}

function buildEmail4(firstName: string, pct: number): string {
  return emailWrapper(`
    <div style="background:linear-gradient(135deg,#374151,#1f2937);border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;">Final reminder, ${firstName}</h1>
      <p style="color:#9ca3af;margin:8px 0 0;font-size:14px;">Complete your profile to start getting hired</p>
    </div>

    <p style="color:#374151;font-size:15px;">Hi ${firstName},</p>
    <p style="color:#374151;font-size:15px;">
      Providers on Kizazi Hire are actively looking for qualified support workers right now.
      Your profile is <strong>${pct}% complete</strong> — verified profiles are prioritised every time.
    </p>

    <div style="border:2px solid #e5e7eb;border-radius:10px;padding:20px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#374151;">
        &#128269; <strong>Providers skip incomplete profiles.</strong> A complete, verified profile is your best chance of being selected for shifts.
      </p>
    </div>

    <p style="color:#374151;font-size:15px;">
      Take 5 minutes now to finish your profile — upload your documents, add your availability, and let providers find you.
    </p>
    ${ctaButton("Complete My Profile", `${APP_URL}/dashboard`)}
  `);
}

interface WorkerOnboardingRow {
  user_id: string;
  email: string;
  first_name: string;
  completion_pct: number;
  has_full_name: boolean;
  has_location: boolean;
  has_bio: boolean;
  has_experience: boolean;
  has_photo: boolean;
  has_skills: boolean;
  has_availability: boolean;
  has_documents: boolean;
  has_resume: boolean;
  has_references: boolean;
  sent_steps: number[];
}

async function fetchIncompleteWorkers(minHoursAgo: number, maxHoursAgo: number): Promise<WorkerOnboardingRow[]> {
  return db.queryAll<WorkerOnboardingRow>`
    SELECT
      u.user_id,
      u.email,
      split_part(COALESCE(w.full_name, w.name, u.email), ' ', 1) AS first_name,
      COALESCE(
        ROUND((
          (CASE WHEN w.full_name IS NOT NULL AND w.full_name <> '' THEN 10 ELSE 0 END) +
          (CASE WHEN w.phone    IS NOT NULL AND w.phone    <> '' THEN 5  ELSE 0 END) +
          (CASE WHEN w.location IS NOT NULL AND w.location <> '' THEN 10 ELSE 0 END) +
          (CASE WHEN w.bio      IS NOT NULL AND w.bio      <> '' THEN 10 ELSE 0 END) +
          (CASE WHEN w.experience_years IS NOT NULL               THEN 5  ELSE 0 END) +
          (CASE WHEN w.avatar_url IS NOT NULL                      THEN 5  ELSE 0 END) +
          (CASE WHEN (SELECT COUNT(*) FROM worker_skills ws WHERE ws.worker_id = w.worker_id) > 0 THEN 10 ELSE 0 END) +
          (CASE WHEN (SELECT COUNT(*) FROM worker_availability wa WHERE wa.worker_id = w.worker_id) > 0 THEN 10 ELSE 0 END) +
          (CASE WHEN (SELECT COUNT(*) FROM worker_documents wd WHERE wd.worker_id = w.worker_id) >= 3 THEN 25 ELSE 0 END) +
          (CASE WHEN (SELECT COUNT(*) FROM worker_resumes wr WHERE wr.worker_id = w.worker_id) > 0 THEN 5 ELSE 0 END) +
          (CASE WHEN (SELECT COUNT(*) FROM worker_references wrf WHERE wrf.worker_id = w.worker_id) > 0 THEN 5 ELSE 0 END)
        ) * 100.0 / 100.0)::int
      , 0) AS completion_pct,
      (w.full_name IS NOT NULL AND w.full_name <> '')           AS has_full_name,
      (w.location IS NOT NULL AND w.location <> '')             AS has_location,
      (w.bio IS NOT NULL AND w.bio <> '')                       AS has_bio,
      (w.experience_years IS NOT NULL)                          AS has_experience,
      (w.avatar_url IS NOT NULL)                                AS has_photo,
      (SELECT COUNT(*) FROM worker_skills ws WHERE ws.worker_id = w.worker_id) > 0 AS has_skills,
      (SELECT COUNT(*) FROM worker_availability wa WHERE wa.worker_id = w.worker_id) > 0 AS has_availability,
      (SELECT COUNT(*) FROM worker_documents wd WHERE wd.worker_id = w.worker_id) >= 3 AS has_documents,
      (SELECT COUNT(*) FROM worker_resumes wr WHERE wr.worker_id = w.worker_id) > 0 AS has_resume,
      (SELECT COUNT(*) FROM worker_references wrf WHERE wrf.worker_id = w.worker_id) > 0 AS has_references,
      COALESCE(
        ARRAY(SELECT email_step FROM worker_onboarding_emails woe WHERE woe.user_id = u.user_id ORDER BY email_step),
        ARRAY[]::int[]
      ) AS sent_steps
    FROM users u
    JOIN workers w ON w.user_id = u.user_id
    WHERE
      u.is_verified = true
      AND u.is_suspended = false
      AND u.created_at <= NOW() - (${minHoursAgo} || ' hours')::interval
      AND u.created_at >= NOW() - (${maxHoursAgo} || ' hours')::interval
  `;
}

function buildSections(row: WorkerOnboardingRow) {
  return [
    { label: "Full name", done: row.has_full_name },
    { label: "Location", done: row.has_location },
    { label: "Bio", done: row.has_bio },
    { label: "Years of experience", done: row.has_experience },
    { label: "Profile photo", done: row.has_photo },
    { label: "Skills", done: row.has_skills },
    { label: "Availability", done: row.has_availability },
    { label: "Compliance documents (3+)", done: row.has_documents },
    { label: "Resume", done: row.has_resume },
    { label: "References", done: row.has_references },
  ];
}

async function markSent(userId: string, step: number): Promise<void> {
  await db.exec`
    INSERT INTO worker_onboarding_emails (user_id, email_step)
    VALUES (${userId}, ${step})
    ON CONFLICT (user_id, email_step) DO NOTHING
  `;
}

export const sendOnboardingEmail1 = api(
  { expose: false, method: "POST", path: "/emailer/internal/onboarding-1" },
  async (): Promise<void> => {
    const rows = await fetchIncompleteWorkers(0, 4);

    for (const row of rows) {
      if (row.sent_steps.includes(1)) continue;
      if (row.completion_pct >= 100) continue;

      const sections = buildSections(row);
      const html = buildEmail1(row.first_name, row.completion_pct, sections);
      try {
        await sendEmail({ to: row.email, subject: `Welcome, ${row.first_name} — let's get you verified`, html });
        await markSent(row.user_id, 1);
      } catch { }
    }
  }
);

export const _onboardingEmail1Cron = new CronJob("onboarding-email-1", {
  title: "Onboarding email 1 — immediate welcome (runs hourly to catch new signups)",
  schedule: "0 * * * *",
  endpoint: sendOnboardingEmail1,
});

export const sendOnboardingEmail2 = api(
  { expose: false, method: "POST", path: "/emailer/internal/onboarding-2" },
  async (): Promise<void> => {
    const rows = await fetchIncompleteWorkers(20, 32);

    for (const row of rows) {
      if (row.sent_steps.includes(2)) continue;
      if (row.completion_pct >= 100) continue;

      const sections = buildSections(row);
      const html = buildEmail2(row.first_name, row.completion_pct, sections);
      try {
        await sendEmail({ to: row.email, subject: `You're close, ${row.first_name} — don't miss this`, html });
        await markSent(row.user_id, 2);
      } catch { }
    }
  }
);

export const _onboardingEmail2Cron = new CronJob("onboarding-email-2", {
  title: "Onboarding email 2 — 24h reminder",
  schedule: "30 9 * * *",
  endpoint: sendOnboardingEmail2,
});

export const sendOnboardingEmail3 = api(
  { expose: false, method: "POST", path: "/emailer/internal/onboarding-3" },
  async (): Promise<void> => {
    const rows = await fetchIncompleteWorkers(44, 80);

    for (const row of rows) {
      if (row.sent_steps.includes(3)) continue;
      if (row.completion_pct >= 100) continue;

      const html = buildEmail3(row.first_name, row.completion_pct);
      try {
        await sendEmail({ to: row.email, subject: `Your free verification won't last, ${row.first_name}`, html });
        await markSent(row.user_id, 3);
      } catch { }
    }
  }
);

export const _onboardingEmail3Cron = new CronJob("onboarding-email-3", {
  title: "Onboarding email 3 — 48-72h urgency",
  schedule: "0 10 * * *",
  endpoint: sendOnboardingEmail3,
});

export const sendOnboardingEmail4 = api(
  { expose: false, method: "POST", path: "/emailer/internal/onboarding-4" },
  async (): Promise<void> => {
    const rows = await fetchIncompleteWorkers(116, 180);

    for (const row of rows) {
      if (row.sent_steps.includes(4)) continue;
      if (row.completion_pct >= 100) continue;

      const html = buildEmail4(row.first_name, row.completion_pct);
      try {
        await sendEmail({ to: row.email, subject: `Final reminder — complete your profile, ${row.first_name}`, html });
        await markSent(row.user_id, 4);
      } catch { }
    }
  }
);

export const _onboardingEmail4Cron = new CronJob("onboarding-email-4", {
  title: "Onboarding email 4 — 5-7 day final nudge",
  schedule: "0 11 * * *",
  endpoint: sendOnboardingEmail4,
});

new Subscription(workerSignedUpTopic, "onboarding-welcome-email", {
  handler: async (event) => {
    const alreadySent = await db.queryRow`
      SELECT 1 FROM worker_onboarding_emails WHERE user_id = ${event.userId} AND email_step = 1
    `;
    if (alreadySent) return;

    const sections = [
      { label: "Full name", done: false },
      { label: "Location", done: false },
      { label: "Bio", done: false },
      { label: "Years of experience", done: false },
      { label: "Profile photo", done: false },
      { label: "Skills", done: false },
      { label: "Availability", done: false },
      { label: "Compliance documents (3+)", done: false },
      { label: "Resume", done: false },
      { label: "References", done: false },
    ];

    const html = buildEmail1(event.firstName, 0, sections);
    try {
      await sendEmail({ to: event.email, subject: `Welcome, ${event.firstName} — let's get you verified`, html });
      await markSent(event.userId, 1);
    } catch { }
  },
});
