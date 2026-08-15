import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import db from "../db";
import { sendEmailsBulk, type EmailPayload } from "./sender";

const APP_URL = "https://kizazihire.com.au";

function ctaButton(label: string, path: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${APP_URL}${path}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:600;">${label}</a>
  </div>`;
}

function footer(): string {
  return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="color:#9ca3af;font-size:12px;text-align:center;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>`;
}

function wrapper(body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">${body}</div>`;
}

async function markNudgeSent(userId: string, nudgeType: string): Promise<void> {
  await db.exec`
    INSERT INTO worker_profile_nudge_log (user_id, nudge_type)
    VALUES (${userId}, ${nudgeType})
    ON CONFLICT (user_id, nudge_type) DO NOTHING
  `;
}

const BASE_WORKER_FILTER = `
  u.is_verified = true
  AND u.is_suspended = false
  AND u.is_demo = false
  AND u.created_at <= NOW() - INTERVAL '2 days'
  AND u.created_at >= NOW() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM worker_profile_nudge_log nlog
    WHERE nlog.user_id = u.user_id AND nlog.nudge_type = $1
  )
`;

export const nudgeNoSuburb = api(
  { expose: false, method: "POST", path: "/emailer/internal/nudge-no-suburb" },
  async (): Promise<void> => {
    const nudgeType = "no_suburb";

    const rows = await db.queryAll<{ user_id: string; email: string; name: string }>`
      SELECT u.user_id, u.email, COALESCE(w.full_name, w.name, u.email) AS name
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      WHERE
        u.is_verified = true
        AND u.is_suspended = false
        AND u.is_demo = false
        AND u.created_at <= NOW() - INTERVAL '2 days'
        AND u.created_at >= NOW() - INTERVAL '90 days'
        AND (w.suburb IS NULL OR w.suburb = '')
        AND NOT EXISTS (
          SELECT 1 FROM worker_profile_nudge_log nlog
          WHERE nlog.user_id = u.user_id AND nlog.nudge_type = ${nudgeType}
        )
    `;

    if (rows.length === 0) return;

    const payloads: EmailPayload[] = rows.map((row) => ({
      to: row.email,
      subject: "Add your suburb to start getting matched with local NDIS providers",
      html: wrapper(`
        <h2 style="color:#111827;margin:0 0 8px;">You're almost there, ${row.name}!</h2>
        <p style="color:#555;font-size:15px;">
          One small thing is stopping providers from finding you: <strong>your suburb is missing from your profile.</strong>
        </p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#1e40af;font-size:14px;font-weight:600;">Why your suburb matters</p>
          <ul style="margin:8px 0 0;padding-left:18px;color:#1e3a8a;font-size:14px;line-height:1.8;">
            <li>Employers search for workers near their clients</li>
            <li>We sort your job matches by distance</li>
            <li>Workers with a suburb get <strong>3× more profile views</strong></li>
          </ul>
        </div>
        <p style="color:#555;font-size:14px;">It takes less than 30 seconds — just open your profile and add your suburb.</p>
        ${ctaButton("Add My Suburb Now", "/dashboard")}
        ${footer()}
      `),
      recipientUserId: row.user_id,
      category: "profile_nudge",
    }));

    await sendEmailsBulk(payloads, undefined, { category: "profile_nudge", targetRole: "WORKER" });

    for (const row of rows) {
      await markNudgeSent(row.user_id, nudgeType);
    }
  }
);

export const nudgeNoAvailability = api(
  { expose: false, method: "POST", path: "/emailer/internal/nudge-no-availability" },
  async (): Promise<void> => {
    const nudgeType = "no_availability";

    const rows = await db.queryAll<{ user_id: string; email: string; name: string }>`
      SELECT u.user_id, u.email, COALESCE(w.full_name, w.name, u.email) AS name
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      LEFT JOIN worker_availability wa ON wa.worker_id = w.worker_id
      WHERE
        u.is_verified = true
        AND u.is_suspended = false
        AND u.is_demo = false
        AND u.created_at <= NOW() - INTERVAL '2 days'
        AND u.created_at >= NOW() - INTERVAL '90 days'
        AND (wa.worker_id IS NULL OR wa.available_days = '{}' OR wa.available_days IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM worker_profile_nudge_log nlog
          WHERE nlog.user_id = u.user_id AND nlog.nudge_type = ${nudgeType}
        )
    `;

    if (rows.length === 0) return;

    const payloads: EmailPayload[] = rows.map((row) => ({
      to: row.email,
      subject: "Tell us when you're free — set your availability to get shift offers",
      html: wrapper(`
        <h2 style="color:#111827;margin:0 0 8px;">Hey ${row.name}, when are you available?</h2>
        <p style="color:#555;font-size:15px;">
          Employers can see your profile, but <strong>you haven't set your availability yet</strong>.
          Without it, we can't match you to shifts that fit your schedule.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#166534;font-size:14px;font-weight:600;">Setting your availability lets you:</p>
          <ul style="margin:8px 0 0;padding-left:18px;color:#15803d;font-size:14px;line-height:1.8;">
            <li>Appear in searches filtered by shift day and time</li>
            <li>Get matched to shifts that suit your lifestyle</li>
            <li>Receive alerts only for shifts you can actually do</li>
          </ul>
        </div>
        <p style="color:#555;font-size:14px;">Open your profile and tick the days and times you're free — it only takes a minute.</p>
        ${ctaButton("Set My Availability", "/dashboard")}
        ${footer()}
      `),
      recipientUserId: row.user_id,
      category: "profile_nudge",
    }));

    await sendEmailsBulk(payloads, undefined, { category: "profile_nudge", targetRole: "WORKER" });

    for (const row of rows) {
      await markNudgeSent(row.user_id, nudgeType);
    }
  }
);

export const nudgeNoBio = api(
  { expose: false, method: "POST", path: "/emailer/internal/nudge-no-bio" },
  async (): Promise<void> => {
    const nudgeType = "no_bio";

    const rows = await db.queryAll<{ user_id: string; email: string; name: string }>`
      SELECT u.user_id, u.email, COALESCE(w.full_name, w.name, u.email) AS name
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      WHERE
        u.is_verified = true
        AND u.is_suspended = false
        AND u.is_demo = false
        AND u.created_at <= NOW() - INTERVAL '3 days'
        AND u.created_at >= NOW() - INTERVAL '90 days'
        AND (w.bio IS NULL OR length(trim(w.bio)) < 30)
        AND NOT EXISTS (
          SELECT 1 FROM worker_profile_nudge_log nlog
          WHERE nlog.user_id = u.user_id AND nlog.nudge_type = ${nudgeType}
        )
    `;

    if (rows.length === 0) return;

    const payloads: EmailPayload[] = rows.map((row) => ({
      to: row.email,
      subject: "A short intro could land you your next shift — add your bio",
      html: wrapper(`
        <h2 style="color:#111827;margin:0 0 8px;">Stand out with a short intro, ${row.name}</h2>
        <p style="color:#555;font-size:15px;">
          Employers read your bio before deciding to reach out.
          Right now, <strong>your profile has no introduction</strong> — that's a missed opportunity.
        </p>
        <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#6b21a8;font-size:14px;font-weight:600;">What to include in your bio:</p>
          <ul style="margin:8px 0 0;padding-left:18px;color:#7e22ce;font-size:14px;line-height:1.8;">
            <li>How long you've worked in disability support</li>
            <li>Types of clients or care you specialise in</li>
            <li>What makes you a great support worker</li>
            <li>Your values or approach to care</li>
          </ul>
        </div>
        <p style="color:#555;font-size:14px;">Even 3–4 sentences makes a big difference. Write it now in under 2 minutes.</p>
        ${ctaButton("Write My Bio", "/dashboard")}
        ${footer()}
      `),
      recipientUserId: row.user_id,
      category: "profile_nudge",
    }));

    await sendEmailsBulk(payloads, undefined, { category: "profile_nudge", targetRole: "WORKER" });

    for (const row of rows) {
      await markNudgeSent(row.user_id, nudgeType);
    }
  }
);

export const nudgeNoSkills = api(
  { expose: false, method: "POST", path: "/emailer/internal/nudge-no-skills" },
  async (): Promise<void> => {
    const nudgeType = "no_skills";

    const rows = await db.queryAll<{ user_id: string; email: string; name: string }>`
      SELECT u.user_id, u.email, COALESCE(w.full_name, w.name, u.email) AS name
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      LEFT JOIN worker_skills ws ON ws.worker_id = w.worker_id
      WHERE
        u.is_verified = true
        AND u.is_suspended = false
        AND u.is_demo = false
        AND u.created_at <= NOW() - INTERVAL '3 days'
        AND u.created_at >= NOW() - INTERVAL '90 days'
        AND NOT EXISTS (
          SELECT 1 FROM worker_profile_nudge_log nlog
          WHERE nlog.user_id = u.user_id AND nlog.nudge_type = ${nudgeType}
        )
      GROUP BY u.user_id, u.email, w.full_name, w.name
      HAVING COUNT(ws.id) = 0
    `;

    if (rows.length === 0) return;

    const payloads: EmailPayload[] = rows.map((row) => ({
      to: row.email,
      subject: "Add your support skills to appear in more job matches",
      html: wrapper(`
        <h2 style="color:#111827;margin:0 0 8px;">Employers are looking for your skills, ${row.name}</h2>
        <p style="color:#555;font-size:15px;">
          You haven't added any skills to your profile yet.
          <strong>Employers filter by support type when searching</strong> — without skills listed, you won't appear in those results.
        </p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#9a3412;font-size:14px;font-weight:600;">Popular skills to add:</p>
          <div style="margin:10px 0 0;display:flex;flex-wrap:wrap;gap:6px;">
            ${["Community Access", "Daily Living", "High Intensity Support", "Behaviour Support",
               "Meal Preparation", "Manual Handling", "Medication Administration", "PEG Feeding"]
              .map((s) => `<span style="display:inline-block;background:#ffedd5;color:#c2410c;border:1px solid #fed7aa;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;">${s}</span>`)
              .join(" ")}
          </div>
        </div>
        <p style="color:#555;font-size:14px;">Select the types of support you can provide — takes less than a minute.</p>
        ${ctaButton("Add My Skills", "/dashboard")}
        ${footer()}
      `),
      recipientUserId: row.user_id,
      category: "profile_nudge",
    }));

    await sendEmailsBulk(payloads, undefined, { category: "profile_nudge", targetRole: "WORKER" });

    for (const row of rows) {
      await markNudgeSent(row.user_id, nudgeType);
    }
  }
);

export const nudgeNoPhoto = api(
  { expose: false, method: "POST", path: "/emailer/internal/nudge-no-photo" },
  async (): Promise<void> => {
    const nudgeType = "no_photo";

    const rows = await db.queryAll<{ user_id: string; email: string; name: string }>`
      SELECT u.user_id, u.email, COALESCE(w.full_name, w.name, u.email) AS name
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      WHERE
        u.is_verified = true
        AND u.is_suspended = false
        AND u.is_demo = false
        AND u.created_at <= NOW() - INTERVAL '5 days'
        AND u.created_at >= NOW() - INTERVAL '90 days'
        AND (w.avatar_url IS NULL OR w.avatar_url = '')
        AND NOT EXISTS (
          SELECT 1 FROM worker_profile_nudge_log nlog
          WHERE nlog.user_id = u.user_id AND nlog.nudge_type = ${nudgeType}
        )
    `;

    if (rows.length === 0) return;

    const payloads: EmailPayload[] = rows.map((row) => ({
      to: row.email,
      subject: "A profile photo makes employers trust you more — add yours today",
      html: wrapper(`
        <h2 style="color:#111827;margin:0 0 8px;">Put a face to your name, ${row.name}</h2>
        <p style="color:#555;font-size:15px;">
          Your profile doesn't have a photo yet.
          <strong>Profiles with photos receive significantly more interest from employers</strong> — it builds instant trust.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#166534;font-size:14px;font-weight:600;">Tips for a great profile photo:</p>
          <ul style="margin:8px 0 0;padding-left:18px;color:#15803d;font-size:14px;line-height:1.8;">
            <li>Use a clear, recent headshot with good lighting</li>
            <li>Smile — it shows warmth and approachability</li>
            <li>Plain background works best</li>
            <li>Professional but friendly — not a formal ID photo</li>
          </ul>
        </div>
        <p style="color:#555;font-size:14px;">Upload your photo now and instantly make your profile stand out.</p>
        ${ctaButton("Add My Photo", "/dashboard")}
        ${footer()}
      `),
      recipientUserId: row.user_id,
      category: "profile_nudge",
    }));

    await sendEmailsBulk(payloads, undefined, { category: "profile_nudge", targetRole: "WORKER" });

    for (const row of rows) {
      await markNudgeSent(row.user_id, nudgeType);
    }
  }
);

export const nudgeNoExperience = api(
  { expose: false, method: "POST", path: "/emailer/internal/nudge-no-experience" },
  async (): Promise<void> => {
    const nudgeType = "no_experience";

    const rows = await db.queryAll<{ user_id: string; email: string; name: string }>`
      SELECT u.user_id, u.email, COALESCE(w.full_name, w.name, u.email) AS name
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      WHERE
        u.is_verified = true
        AND u.is_suspended = false
        AND u.is_demo = false
        AND u.created_at <= NOW() - INTERVAL '4 days'
        AND u.created_at >= NOW() - INTERVAL '90 days'
        AND (
          w.experience_years IS NULL
          AND (w.work_history IS NULL OR w.work_history = '[]'::jsonb OR jsonb_array_length(w.work_history) = 0)
        )
        AND NOT EXISTS (
          SELECT 1 FROM worker_profile_nudge_log nlog
          WHERE nlog.user_id = u.user_id AND nlog.nudge_type = ${nudgeType}
        )
    `;

    if (rows.length === 0) return;

    const payloads: EmailPayload[] = rows.map((row) => ({
      to: row.email,
      subject: "Share your experience — it helps employers choose you",
      html: wrapper(`
        <h2 style="color:#111827;margin:0 0 8px;">Employers want to know your story, ${row.name}</h2>
        <p style="color:#555;font-size:15px;">
          Your profile doesn't show any work history or experience yet.
          <strong>Employers weigh experience heavily when selecting workers</strong> for their clients.
        </p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#1e40af;font-size:14px;font-weight:600;">What to add to your profile:</p>
          <ul style="margin:8px 0 0;padding-left:18px;color:#1e3a8a;font-size:14px;line-height:1.8;">
            <li>Previous support worker or care roles</li>
            <li>Volunteer experience with people with disability</li>
            <li>Years of experience in the sector</li>
            <li>Types of clients or settings you've worked in</li>
          </ul>
        </div>
        <p style="color:#555;font-size:14px;">Even entry-level experience counts — employers appreciate honesty. Add it now.</p>
        ${ctaButton("Add My Experience", "/dashboard")}
        ${footer()}
      `),
      recipientUserId: row.user_id,
      category: "profile_nudge",
    }));

    await sendEmailsBulk(payloads, undefined, { category: "profile_nudge", targetRole: "WORKER" });

    for (const row of rows) {
      await markNudgeSent(row.user_id, nudgeType);
    }
  }
);

export const nudgeNoDocuments = api(
  { expose: false, method: "POST", path: "/emailer/internal/nudge-no-documents" },
  async (): Promise<void> => {
    const nudgeType = "no_documents_v2";

    const rows = await db.queryAll<{ user_id: string; email: string; name: string; doc_count: number }>`
      SELECT
        u.user_id,
        u.email,
        COALESCE(w.full_name, w.name, u.email) AS name,
        COUNT(wd.id)::int AS doc_count
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      LEFT JOIN worker_documents wd ON wd.worker_id = w.worker_id
      WHERE
        u.is_verified = true
        AND u.is_suspended = false
        AND u.is_demo = false
        AND u.created_at <= NOW() - INTERVAL '5 days'
        AND u.created_at >= NOW() - INTERVAL '90 days'
        AND NOT EXISTS (
          SELECT 1 FROM worker_profile_nudge_log nlog
          WHERE nlog.user_id = u.user_id AND nlog.nudge_type = ${nudgeType}
        )
      GROUP BY u.user_id, u.email, w.full_name, w.name
      HAVING COUNT(wd.id) = 0
    `;

    if (rows.length === 0) return;

    const payloads: EmailPayload[] = rows.map((row) => ({
      to: row.email,
      subject: "Your compliance documents are missing — employers can't hire you yet",
      html: wrapper(`
        <h2 style="color:#111827;margin:0 0 8px;">Missing documents are holding you back, ${row.name}</h2>
        <p style="color:#555;font-size:15px;">
          You have a profile, but <strong>you haven't uploaded any compliance documents</strong>.
          Under NDIS requirements, employers must verify your compliance before they can engage you.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#991b1b;font-size:14px;font-weight:600;">Required documents to get hired:</p>
          <ul style="margin:8px 0 0;padding-left:18px;color:#b91c1c;font-size:14px;line-height:1.8;">
            <li>NDIS Worker Screening Check</li>
            <li>Police Check (within 3 years)</li>
            <li>Working with Children Check (WWCC)</li>
            <li>First Aid &amp; CPR Certificate</li>
            <li>Infection Control Certificate</li>
          </ul>
        </div>
        <p style="color:#555;font-size:14px;">Upload your documents now and become eligible for shift offers this week.</p>
        ${ctaButton("Upload My Documents", "/dashboard")}
        ${footer()}
      `),
      recipientUserId: row.user_id,
      category: "profile_nudge",
    }));

    await sendEmailsBulk(payloads, undefined, { category: "profile_nudge", targetRole: "WORKER" });

    for (const row of rows) {
      await markNudgeSent(row.user_id, nudgeType);
    }
  }
);

export const nudgeLowVerificationScore = api(
  { expose: false, method: "POST", path: "/emailer/internal/nudge-low-score" },
  async (): Promise<void> => {
    const nudgeType = "low_verification_score";

    const rows = await db.queryAll<{
      user_id: string;
      email: string;
      name: string;
      has_suburb: boolean;
      has_bio: boolean;
      has_availability: boolean;
      has_skills: boolean;
      has_docs: boolean;
    }>`
      SELECT
        u.user_id,
        u.email,
        COALESCE(w.full_name, w.name, u.email) AS name,
        (w.suburb IS NOT NULL AND w.suburb <> '') AS has_suburb,
        (w.bio IS NOT NULL AND length(trim(w.bio)) >= 30) AS has_bio,
        EXISTS (
          SELECT 1 FROM worker_availability wa
          WHERE wa.worker_id = w.worker_id
            AND wa.available_days <> '{}'
            AND wa.available_days IS NOT NULL
        ) AS has_availability,
        EXISTS (SELECT 1 FROM worker_skills ws WHERE ws.worker_id = w.worker_id) AS has_skills,
        EXISTS (SELECT 1 FROM worker_documents wd WHERE wd.worker_id = w.worker_id) AS has_docs
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      WHERE
        u.is_verified = true
        AND u.is_suspended = false
        AND u.is_demo = false
        AND u.created_at <= NOW() - INTERVAL '7 days'
        AND u.created_at >= NOW() - INTERVAL '90 days'
        AND NOT EXISTS (
          SELECT 1 FROM worker_profile_nudge_log nlog
          WHERE nlog.user_id = u.user_id AND nlog.nudge_type = ${nudgeType}
        )
    `;

    const eligible = rows.filter((r) => {
      const score = [r.has_suburb, r.has_bio, r.has_availability, r.has_skills, r.has_docs]
        .filter(Boolean).length;
      return score <= 2;
    });

    if (eligible.length === 0) return;

    const payloads: EmailPayload[] = eligible.map((row) => {
      const missing: string[] = [];
      if (!row.has_suburb) missing.push("📍 Suburb");
      if (!row.has_bio) missing.push("✍️ About me / Bio");
      if (!row.has_availability) missing.push("📅 Availability");
      if (!row.has_skills) missing.push("🛠️ Support skills");
      if (!row.has_docs) missing.push("📄 Compliance documents");

      return {
        to: row.email,
        subject: `Your profile score is low — here's what to fix to get noticed`,
        html: wrapper(`
          <h2 style="color:#111827;margin:0 0 8px;">Your profile needs attention, ${row.name}</h2>
          <p style="color:#555;font-size:15px;">
            Employers rank workers by profile completeness and verification score.
            <strong>Your profile is currently low on the ranking</strong>, which means fewer providers are seeing you.
          </p>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0;color:#9a3412;font-size:14px;font-weight:600;">Missing from your profile:</p>
            <ul style="margin:8px 0 0;padding-left:18px;color:#c2410c;font-size:14px;line-height:1.9;">
              ${missing.map((m) => `<li>${m}</li>`).join("")}
            </ul>
          </div>
          <p style="color:#555;font-size:14px;">
            Complete each of these sections to boost your visibility. Workers who finish their profile
            receive <strong>up to 5× more job offers</strong> than incomplete profiles.
          </p>
          ${ctaButton("Complete My Profile", "/dashboard")}
          ${footer()}
        `),
        recipientUserId: row.user_id,
        category: "profile_nudge",
      };
    });

    await sendEmailsBulk(payloads, undefined, { category: "profile_nudge", targetRole: "WORKER" });

    for (const row of eligible) {
      await markNudgeSent(row.user_id, nudgeType);
    }
  }
);

export const _nudgeNoSuburbCron = new CronJob("nudge-no-suburb", {
  title: "Profile nudge — missing suburb",
  schedule: "0 10 * * 2",
  endpoint: nudgeNoSuburb,
});

export const _nudgeNoAvailabilityCron = new CronJob("nudge-no-availability", {
  title: "Profile nudge — missing availability",
  schedule: "0 10 * * 3",
  endpoint: nudgeNoAvailability,
});

export const _nudgeNoBioCron = new CronJob("nudge-no-bio", {
  title: "Profile nudge — missing bio",
  schedule: "0 10 * * 4",
  endpoint: nudgeNoBio,
});

export const _nudgeNoSkillsCron = new CronJob("nudge-no-skills", {
  title: "Profile nudge — missing skills",
  schedule: "0 10 * * 5",
  endpoint: nudgeNoSkills,
});

export const _nudgeNoPhotoCron = new CronJob("nudge-no-photo", {
  title: "Profile nudge — missing profile photo",
  schedule: "0 11 * * 1",
  endpoint: nudgeNoPhoto,
});

export const _nudgeNoExperienceCron = new CronJob("nudge-no-experience", {
  title: "Profile nudge — missing experience / work history",
  schedule: "0 11 * * 3",
  endpoint: nudgeNoExperience,
});

export const _nudgeNoDocumentsCron = new CronJob("nudge-no-documents-v2", {
  title: "Profile nudge — no compliance documents uploaded",
  schedule: "0 9 * * 2,5",
  endpoint: nudgeNoDocuments,
});

export const _nudgeLowScoreCron = new CronJob("nudge-low-verification-score", {
  title: "Profile nudge — low verification score (≤2 pillars)",
  schedule: "0 9 * * 1",
  endpoint: nudgeLowVerificationScore,
});
