import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdmin, assertSysAdmin } from "./guard";
import { writeAuditLog } from "./settings";

export interface PlatformStats {
  totalWorkers: number;
  totalEmployers: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenueAudCents: number;
  pendingDocuments: number;
  activeJobs: number;
  totalJobs: number;
  totalOffers: number;
  acceptedOffers: number;
  totalMessages: number;
  newWorkersThisMonth: number;
  newEmployersThisMonth: number;
  verifiedWorkers: number;
  unverifiedUsers: number;
  workerProfileCompletionAvgPct: number;
  workersFullyComplete: number;
  workersMostlyComplete: number;
  workersIncomplete: number;
  pendingReferenceChecks: number;
}

export const adminGetPlatformStats = api<void, PlatformStats>(
  { expose: true, auth: true, method: "GET", path: "/admin/stats" },
  async () => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const [
      workersRow,
      employersRow,
      usersRow,
      subsRow,
      revenueRow,
      pendingDocsRow,
      jobsRow,
      offersRow,
      messagesRow,
      newWorkersRow,
      newEmployersRow,
      verifiedWorkersRow,
      unverifiedRow,
      pendingRefsRow,
      profileCompletionRow,
    ] = await Promise.all([
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM workers w JOIN users u ON u.user_id = w.user_id WHERE u.is_demo = FALSE`,
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM employers e JOIN users u ON u.user_id = e.user_id WHERE u.is_demo = FALSE`,
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM users WHERE role IN ('WORKER','EMPLOYER') AND is_demo = FALSE`,
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM employer_subscriptions WHERE status = 'active'`,
      db.queryRow<{ total: number }>`SELECT COALESCE(SUM(amount_aud_cents),0)::int AS total FROM employer_subscriptions WHERE status = 'active'`,
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM worker_documents WHERE verification_status = 'Pending'`,
      db.queryRow<{ active: number; total: number }>`
        SELECT COUNT(*) FILTER (WHERE status='Open')::int AS active, COUNT(*)::int AS total FROM job_requests
      `,
      db.queryRow<{ total: number; accepted: number }>`
        SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='Accepted')::int AS accepted FROM offers
      `,
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM messages`,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM workers w JOIN users u ON u.user_id = w.user_id
        WHERE u.created_at >= date_trunc('month', NOW()) AND u.is_demo = FALSE
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM employers e JOIN users u ON u.user_id = e.user_id
        WHERE u.created_at >= date_trunc('month', NOW()) AND u.is_demo = FALSE
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM workers w JOIN users u ON u.user_id = w.user_id WHERE u.is_verified = true AND u.is_demo = FALSE
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM users WHERE is_verified = false AND role IN ('WORKER','EMPLOYER') AND is_demo = FALSE
      `,
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM worker_references WHERE status IN ('Pending', 'Contacted')`,
      db.queryRow<{ avg_pct: number; fully_complete: number; mostly_complete: number; incomplete: number }>`
        WITH completion AS (
          SELECT
            w.worker_id,
            (
              (CASE WHEN w.location IS NOT NULL AND w.location <> '' THEN 1 ELSE 0 END) +
              (CASE WHEN w.bio IS NOT NULL AND w.bio <> '' THEN 1 ELSE 0 END) +
              (CASE WHEN w.experience_years IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN EXISTS (SELECT 1 FROM worker_skills ws WHERE ws.worker_id = w.worker_id) THEN 1 ELSE 0 END) +
              (CASE WHEN EXISTS (SELECT 1 FROM worker_documents wd WHERE wd.worker_id = w.worker_id) THEN 1 ELSE 0 END) +
              (CASE WHEN EXISTS (SELECT 1 FROM worker_availability wa WHERE wa.worker_id = w.worker_id) THEN 1 ELSE 0 END) +
              (CASE WHEN EXISTS (SELECT 1 FROM worker_resumes wr WHERE wr.worker_id = w.worker_id) THEN 1 ELSE 0 END) +
              (CASE WHEN EXISTS (SELECT 1 FROM worker_references wref WHERE wref.worker_id = w.worker_id) THEN 1 ELSE 0 END) +
              (CASE WHEN w.intro_video_url IS NOT NULL AND w.intro_video_url <> '' THEN 1 ELSE 0 END) +
              (CASE WHEN w.avatar_url IS NOT NULL AND w.avatar_url <> '' THEN 1 ELSE 0 END)
            )::float / 10.0 * 100 AS pct
          FROM workers w
          JOIN users u ON u.user_id = w.user_id
          WHERE u.is_demo = FALSE
        )
        SELECT
          COALESCE(ROUND(AVG(pct))::int, 0) AS avg_pct,
          COUNT(*) FILTER (WHERE pct >= 80)::int AS fully_complete,
          COUNT(*) FILTER (WHERE pct >= 50 AND pct < 80)::int AS mostly_complete,
          COUNT(*) FILTER (WHERE pct < 50)::int AS incomplete
        FROM completion
      `,
    ]);

    return {
      totalWorkers: workersRow?.count ?? 0,
      totalEmployers: employersRow?.count ?? 0,
      totalUsers: usersRow?.count ?? 0,
      activeSubscriptions: subsRow?.count ?? 0,
      totalRevenueAudCents: revenueRow?.total ?? 0,
      pendingDocuments: pendingDocsRow?.count ?? 0,
      activeJobs: jobsRow?.active ?? 0,
      totalJobs: jobsRow?.total ?? 0,
      totalOffers: offersRow?.total ?? 0,
      acceptedOffers: offersRow?.accepted ?? 0,
      totalMessages: messagesRow?.count ?? 0,
      newWorkersThisMonth: newWorkersRow?.count ?? 0,
      newEmployersThisMonth: newEmployersRow?.count ?? 0,
      verifiedWorkers: verifiedWorkersRow?.count ?? 0,
      unverifiedUsers: unverifiedRow?.count ?? 0,
      workerProfileCompletionAvgPct: profileCompletionRow?.avg_pct ?? 0,
      workersFullyComplete: profileCompletionRow?.fully_complete ?? 0,
      workersMostlyComplete: profileCompletionRow?.mostly_complete ?? 0,
      workersIncomplete: profileCompletionRow?.incomplete ?? 0,
      pendingReferenceChecks: pendingRefsRow?.count ?? 0,
    };
  }
);

export interface AdminListJobsResponse {
  jobs: AdminJobSummary[];
}

export interface AdminJobSummary {
  jobId: string;
  employerName: string;
  employerEmail: string;
  location: string;
  jobType: string;
  jobTitle: string | null;
  supportTypeTags: string[];
  status: string;
  isEmergency: boolean;
  weekdayRate: number;
  shiftDate: string | null;
  shiftDurationHours: number | null;
  createdAt: Date;
}

export const adminListJobs = api<void, AdminListJobsResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/jobs" },
  async () => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const rows = await db.queryAll<{
      job_id: string;
      organisation_name: string;
      email: string;
      location: string;
      job_type: string;
      job_title: string | null;
      support_type_tags: string[] | null;
      status: string;
      is_emergency: boolean;
      weekday_rate: number;
      shift_date: string | null;
      shift_duration_hours: number | null;
      created_at: Date;
    }>`
      SELECT
        j.job_id,
        e.organisation_name,
        u.email,
        j.location,
        j.job_type,
        j.job_title,
        j.support_type_tags,
        j.status,
        j.is_emergency,
        j.weekday_rate,
        j.shift_date::text,
        j.shift_duration_hours,
        j.created_at
      FROM job_requests j
      JOIN employers e ON e.employer_id = j.employer_id
      JOIN users u ON u.user_id = e.user_id
      ORDER BY j.created_at DESC
      LIMIT 500
    `;

    return {
      jobs: rows.map((r) => ({
        jobId: r.job_id,
        employerName: r.organisation_name,
        employerEmail: r.email,
        location: r.location,
        jobType: r.job_type,
        jobTitle: r.job_title,
        supportTypeTags: r.support_type_tags ?? [],
        status: r.status,
        isEmergency: r.is_emergency,
        weekdayRate: r.weekday_rate,
        shiftDate: r.shift_date,
        shiftDurationHours: r.shift_duration_hours,
        createdAt: r.created_at,
      })),
    };
  }
);

export interface AdminUpdateJobStatusRequest {
  jobId: string;
  status: "Draft" | "Open" | "Closed" | "Cancelled";
}

export const adminUpdateJobStatus = api<AdminUpdateJobStatusRequest, void>(
  { expose: true, auth: true, method: "POST", path: "/admin/jobs/:jobId/status" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const validStatuses = ["Draft", "Open", "Closed", "Cancelled"];
    if (!validStatuses.includes(req.status)) throw APIError.invalidArgument("invalid status");

    const row = await db.queryRow`UPDATE job_requests SET status = ${req.status}, updated_at = NOW() WHERE job_id = ${req.jobId} RETURNING job_id`;
    if (!row) throw APIError.notFound("job not found");
  }
);

export interface AdminListUsersResponse {
  users: AdminUserSummary[];
}

export interface AdminUserSummary {
  userId: string;
  email: string;
  role: string;
  isVerified: boolean;
  isSuspended: boolean;
  isArchived: boolean;
  name: string;
  phone: string | null;
  createdAt: Date;
}

export const adminListUsers = api<void, AdminListUsersResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/users" },
  async () => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const rows = await db.queryAll<{
      user_id: string;
      email: string;
      role: string;
      is_verified: boolean;
      is_suspended: boolean;
      is_archived: boolean;
      name: string;
      phone: string | null;
      created_at: Date;
    }>`
      SELECT
        u.user_id,
        u.email,
        u.role,
        u.is_verified,
        COALESCE(u.is_suspended, false) AS is_suspended,
        COALESCE(u.is_archived, false) AS is_archived,
        COALESCE(w.name, e.organisation_name, u.email) AS name,
        COALESCE(w.phone, e.phone) AS phone,
        u.created_at
      FROM users u
      LEFT JOIN workers w ON w.user_id = u.user_id
      LEFT JOIN employers e ON e.user_id = u.user_id
      WHERE u.role IN ('WORKER', 'EMPLOYER')
      ORDER BY u.created_at DESC
      LIMIT 1000
    `;

    return {
      users: rows.map((r) => ({
        userId: r.user_id,
        email: r.email,
        role: r.role,
        isVerified: r.is_verified,
        isSuspended: r.is_suspended,
        isArchived: r.is_archived,
        name: r.name,
        phone: r.phone,
        createdAt: r.created_at,
      })),
    };
  }
);

export interface AdminSuspendUserRequest {
  userId: string;
  suspend: boolean;
}

export const adminSuspendUser = api<AdminSuspendUserRequest, void>(
  { expose: true, auth: true, method: "POST", path: "/admin/users/:userId/suspend" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const row = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${req.userId}`;
    if (!row) throw APIError.notFound("user not found");

    await db.exec`UPDATE users SET is_suspended = ${req.suspend} WHERE user_id = ${req.userId}`;

    const adminUser = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${auth.userID}`;
    await writeAuditLog(auth.userID, adminUser?.email ?? "unknown",
      req.suspend ? "SUSPEND_USER" : "UNSUSPEND_USER",
      "user", req.userId, { targetEmail: row.email }
    );
  }
);

export interface AdminArchiveUserRequest {
  userId: string;
  archive: boolean;
}

export const adminArchiveUser = api<AdminArchiveUserRequest, void>(
  { expose: true, auth: true, method: "POST", path: "/admin/users/:userId/archive" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const row = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${req.userId}`;
    if (!row) throw APIError.notFound("user not found");

    await db.exec`UPDATE users SET is_archived = ${req.archive} WHERE user_id = ${req.userId}`;

    const adminUser = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${auth.userID}`;
    await writeAuditLog(auth.userID, adminUser?.email ?? "unknown",
      req.archive ? "ARCHIVE_USER" : "UNARCHIVE_USER",
      "user", req.userId, { targetEmail: row.email }
    );
  }
);

export interface AdminDeleteUserRequest {
  userId: string;
}

export const adminDeleteUser = api<AdminDeleteUserRequest, void>(
  { expose: true, auth: true, method: "DELETE", path: "/admin/users/:userId" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSysAdmin(auth.userID);

    const row = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${req.userId}`;
    if (!row) throw APIError.notFound("user not found");

    const adminUser = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${auth.userID}`;
    await writeAuditLog(auth.userID, adminUser?.email ?? "unknown",
      "DELETE_USER", "user", req.userId, { targetEmail: row.email }
    );

    await db.exec`DELETE FROM users WHERE user_id = ${req.userId}`;
  }
);

export interface AdminVerifyUserEmailRequest {
  userId: string;
}

export const adminVerifyUserEmail = api<AdminVerifyUserEmailRequest, void>(
  { expose: true, auth: true, method: "POST", path: "/admin/users/:userId/verify-email" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const row = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${req.userId}`;
    await db.exec`UPDATE users SET is_verified = true WHERE user_id = ${req.userId}`;

    const adminUser = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${auth.userID}`;
    await writeAuditLog(auth.userID, adminUser?.email ?? "unknown",
      "VERIFY_USER_EMAIL", "user", req.userId, { targetEmail: row?.email }
    );
  }
);
