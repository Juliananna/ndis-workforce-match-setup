import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { secret } from "encore.dev/config";
import db from "../db";
import { assertAdmin } from "./guard";
import { sendEmail, sendEmailsBulk } from "../emailer/sender";

const frontendBaseUrl = secret("FrontendBaseUrl");

export interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  htmlBody: string;
  category: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListTemplatesResponse {
  templates: EmailTemplate[];
}

export const adminListEmailTemplates = api<void, ListTemplatesResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/email-templates" },
  async () => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const rows = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      subject: string;
      html_body: string;
      category: string;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT id, name, description, subject, html_body, category, created_by, created_at, updated_at
      FROM email_templates
      ORDER BY updated_at DESC
    `;

    return {
      templates: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        subject: r.subject,
        htmlBody: r.html_body,
        category: r.category,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    };
  }
);

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  subject: string;
  htmlBody: string;
  category: string;
}

export const adminCreateEmailTemplate = api<CreateTemplateRequest, EmailTemplate>(
  { expose: true, auth: true, method: "POST", path: "/admin/email-templates" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.name?.trim()) throw APIError.invalidArgument("name is required");
    if (!req.subject?.trim()) throw APIError.invalidArgument("subject is required");
    if (!req.htmlBody?.trim()) throw APIError.invalidArgument("htmlBody is required");

    const row = await db.queryRow<{
      id: string;
      name: string;
      description: string | null;
      subject: string;
      html_body: string;
      category: string;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
    }>`
      INSERT INTO email_templates (name, description, subject, html_body, category, created_by)
      VALUES (${req.name.trim()}, ${req.description?.trim() ?? null}, ${req.subject.trim()}, ${req.htmlBody.trim()}, ${req.category ?? "general"}, ${auth.userID})
      RETURNING id, name, description, subject, html_body, category, created_by, created_at, updated_at
    `;

    if (!row) throw APIError.internal("failed to create template");

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      subject: row.subject,
      htmlBody: row.html_body,
      category: row.category,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);

export interface UpdateTemplateRequest {
  id: string;
  name: string;
  description?: string;
  subject: string;
  htmlBody: string;
  category: string;
}

export const adminUpdateEmailTemplate = api<UpdateTemplateRequest, EmailTemplate>(
  { expose: true, auth: true, method: "PUT", path: "/admin/email-templates/:id" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.name?.trim()) throw APIError.invalidArgument("name is required");
    if (!req.subject?.trim()) throw APIError.invalidArgument("subject is required");
    if (!req.htmlBody?.trim()) throw APIError.invalidArgument("htmlBody is required");

    const row = await db.queryRow<{
      id: string;
      name: string;
      description: string | null;
      subject: string;
      html_body: string;
      category: string;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
    }>`
      UPDATE email_templates
      SET name = ${req.name.trim()},
          description = ${req.description?.trim() ?? null},
          subject = ${req.subject.trim()},
          html_body = ${req.htmlBody.trim()},
          category = ${req.category ?? "general"},
          updated_at = NOW()
      WHERE id = ${req.id}
      RETURNING id, name, description, subject, html_body, category, created_by, created_at, updated_at
    `;

    if (!row) throw APIError.notFound("template not found");

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      subject: row.subject,
      htmlBody: row.html_body,
      category: row.category,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);

export interface DeleteTemplateRequest {
  id: string;
}

export const adminDeleteEmailTemplate = api<DeleteTemplateRequest, void>(
  { expose: true, auth: true, method: "DELETE", path: "/admin/email-templates/:id" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    await db.exec`DELETE FROM email_templates WHERE id = ${req.id}`;
  }
);

function applyPlaceholders(
  text: string,
  vars: Record<string, string | null | undefined>
): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export interface SendEmailToUserRequest {
  userId: string;
  templateId?: string;
  subject: string;
  htmlBody: string;
  category?: string;
}

export interface SendEmailResponse {
  sent: number;
}

export const adminSendEmailToUser = api<SendEmailToUserRequest, SendEmailResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/email-comms/send-to-user" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.subject?.trim()) throw APIError.invalidArgument("subject is required");
    if (!req.htmlBody?.trim()) throw APIError.invalidArgument("htmlBody is required");

    const user = await db.queryRow<{
      email: string;
      name: string | null;
      organisation_name: string | null;
      role: string;
    }>`
      SELECT u.email, u.role,
        w.name,
        e.organisation_name
      FROM users u
      LEFT JOIN workers w ON w.user_id = u.user_id
      LEFT JOIN employers e ON e.user_id = u.user_id
      WHERE u.user_id = ${req.userId}
    `;
    if (!user) throw APIError.notFound("user not found");

    const firstName = (user.name ?? user.organisation_name ?? "").split(" ")[0];
    const baseUrl = (() => { try { return frontendBaseUrl(); } catch { return ""; } })();
    const vars: Record<string, string> = {
      FirstName: firstName,
      FullName: user.name ?? user.organisation_name ?? "",
      Email: user.email,
      OrgName: user.organisation_name ?? "",
      ProfileLink: baseUrl ? `${baseUrl}/dashboard?tab=profile` : "/dashboard?tab=profile",
    };

    const subject = applyPlaceholders(req.subject.trim(), vars);
    const html = applyPlaceholders(req.htmlBody.trim(), vars);

    let status = "sent";
    let errorMsg: string | null = null;
    try {
      await sendEmail({ to: user.email, subject, html });
    } catch (e: unknown) {
      status = "failed";
      errorMsg = e instanceof Error ? e.message : "unknown error";
    }

    await db.exec`
      INSERT INTO email_sent_log
        (template_id, sent_by, recipient_user_id, recipient_email, subject, category, is_bulk, status, error_message)
      VALUES
        (${req.templateId ?? null}, ${auth.userID}, ${req.userId}, ${user.email}, ${subject}, ${req.category ?? "general"}, false, ${status}, ${errorMsg})
    `;

    if (status === "failed") throw APIError.internal(`Failed to send email: ${errorMsg}`);

    return { sent: 1 };
  }
);

export interface SendBulkEmailRequest {
  templateId?: string;
  subject: string;
  htmlBody: string;
  targetRole?: "WORKER" | "EMPLOYER" | "all";
  category?: string;
  locationContains?: string;
  lastLoginDays?: number;
  registeredWithinDays?: number;
  workerHasDocuments?: boolean;
  workerHasSkills?: boolean;
  workerHasBio?: boolean;
  employerSubscriptionStatus?: "none" | "active" | "cancelled" | "expired" | "any";
}

export const adminSendBulkEmail = api<SendBulkEmailRequest, SendEmailResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/email-comms/send-bulk" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.subject?.trim()) throw APIError.invalidArgument("subject is required");
    if (!req.htmlBody?.trim()) throw APIError.invalidArgument("htmlBody is required");

    const roleFilter = req.targetRole && req.targetRole !== "all" ? req.targetRole : null;
    const locationFilter = req.locationContains?.trim() || null;
    const lastLoginFilter = req.lastLoginDays != null ? req.lastLoginDays : null;
    const registeredFilter = req.registeredWithinDays != null ? req.registeredWithinDays : null;
    const subStatusFilter =
      req.employerSubscriptionStatus && req.employerSubscriptionStatus !== "any"
        ? req.employerSubscriptionStatus
        : null;

    const users = await db.queryAll<{
      user_id: string;
      email: string;
      name: string | null;
      organisation_name: string | null;
    }>`
      SELECT u.user_id, u.email,
        w.name,
        e.organisation_name
      FROM users u
      LEFT JOIN workers w ON w.user_id = u.user_id
      LEFT JOIN employers e ON e.user_id = u.user_id
      WHERE u.is_verified = true
        AND u.is_suspended = false
        AND u.role IN ('WORKER', 'EMPLOYER')
        AND (${roleFilter}::text IS NULL OR u.role = ${roleFilter}::text)
        AND (
          ${locationFilter}::text IS NULL
          OR LOWER(COALESCE(w.location, e.location, '')) LIKE '%' || LOWER(${locationFilter}::text) || '%'
        )
        AND (
          ${lastLoginFilter}::int IS NULL
          OR u.last_login_at >= NOW() - (${lastLoginFilter}::int || ' days')::INTERVAL
        )
        AND (
          ${registeredFilter}::int IS NULL
          OR u.created_at >= NOW() - (${registeredFilter}::int || ' days')::INTERVAL
        )
        AND (
          ${req.workerHasDocuments ?? null}::boolean IS NULL
          OR (u.role = 'WORKER' AND (
            (${req.workerHasDocuments ?? null}::boolean = true AND EXISTS (SELECT 1 FROM worker_documents wd WHERE wd.worker_id = w.worker_id))
            OR (${req.workerHasDocuments ?? null}::boolean = false AND NOT EXISTS (SELECT 1 FROM worker_documents wd WHERE wd.worker_id = w.worker_id))
          ))
        )
        AND (
          ${req.workerHasSkills ?? null}::boolean IS NULL
          OR (u.role = 'WORKER' AND (
            (${req.workerHasSkills ?? null}::boolean = true AND EXISTS (SELECT 1 FROM worker_skills ws WHERE ws.worker_id = w.worker_id))
            OR (${req.workerHasSkills ?? null}::boolean = false AND NOT EXISTS (SELECT 1 FROM worker_skills ws WHERE ws.worker_id = w.worker_id))
          ))
        )
        AND (
          ${req.workerHasBio ?? null}::boolean IS NULL
          OR (u.role = 'WORKER' AND (
            (${req.workerHasBio ?? null}::boolean = true AND w.bio IS NOT NULL AND w.bio <> '')
            OR (${req.workerHasBio ?? null}::boolean = false AND (w.bio IS NULL OR w.bio = ''))
          ))
        )
        AND (
          ${subStatusFilter}::text IS NULL
          OR (u.role = 'EMPLOYER' AND e.subscription_status = ${subStatusFilter}::text)
        )
      ORDER BY u.created_at DESC
    `;

    const baseUrl = (() => { try { return frontendBaseUrl(); } catch { return ""; } })();

    const payloads = users.map((user) => {
      const firstName = (user.name ?? user.organisation_name ?? "").split(" ")[0];
      const vars: Record<string, string> = {
        FirstName: firstName,
        FullName: user.name ?? user.organisation_name ?? "",
        Email: user.email,
        OrgName: user.organisation_name ?? "",
        ProfileLink: baseUrl ? `${baseUrl}/dashboard?tab=profile` : "/dashboard?tab=profile",
      };
      return {
        to: user.email,
        subject: applyPlaceholders(req.subject.trim(), vars),
        html: applyPlaceholders(req.htmlBody.trim(), vars),
        user_id: user.user_id,
      };
    });

    const emailToUserId = new Map(payloads.map((p) => [p.to, p.user_id]));
    const emailToSubject = new Map(payloads.map((p) => [p.to, p.subject]));

    const { sent } = await sendEmailsBulk(
      payloads,
      async (email, success, errorMsg) => {
        const userId = emailToUserId.get(email) ?? null;
        const subject = emailToSubject.get(email) ?? req.subject.trim();
        await db.exec`
          INSERT INTO email_sent_log
            (template_id, sent_by, recipient_user_id, recipient_email, subject, category, is_bulk, bulk_count, target_role, status, error_message)
          VALUES
            (${req.templateId ?? null}, ${auth.userID}, ${userId}, ${email}, ${subject}, ${req.category ?? "general"}, true, ${users.length}, ${req.targetRole ?? "all"}, ${success ? "sent" : "failed"}, ${errorMsg ?? null})
        `;
      }
    );

    return { sent };
  }
);

export interface EmailLogEntry {
  id: string;
  templateId: string | null;
  sentByUserId: string | null;
  sentByEmail: string | null;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  category: string;
  isBulk: boolean;
  bulkCount: number | null;
  targetRole: string | null;
  status: string;
  errorMessage: string | null;
  sentAt: Date;
}

export interface ListEmailLogResponse {
  entries: EmailLogEntry[];
  total: number;
}

export interface ListEmailLogRequest {
  limit?: number;
  offset?: number;
}

export const adminListEmailLog = api<ListEmailLogRequest, ListEmailLogResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/email-comms/log" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const limit = Math.min(req.limit ?? 50, 200);
    const offset = req.offset ?? 0;

    const [rows, countRow] = await Promise.all([
      db.queryAll<{
        id: string;
        template_id: string | null;
        sent_by: string | null;
        sent_by_email: string | null;
        recipient_email: string;
        recipient_name: string | null;
        subject: string;
        category: string;
        is_bulk: boolean;
        bulk_count: number | null;
        target_role: string | null;
        status: string;
        error_message: string | null;
        sent_at: Date;
      }>`
        SELECT
          l.id,
          l.template_id,
          l.sent_by,
          u.email AS sent_by_email,
          l.recipient_email,
          COALESCE(w.name, e.organisation_name) AS recipient_name,
          l.subject,
          l.category,
          l.is_bulk,
          l.bulk_count,
          l.target_role,
          l.status,
          l.error_message,
          l.sent_at
        FROM email_sent_log l
        LEFT JOIN users u ON u.user_id = l.sent_by
        LEFT JOIN users ru ON ru.user_id = l.recipient_user_id
        LEFT JOIN workers w ON w.user_id = ru.user_id
        LEFT JOIN employers e ON e.user_id = ru.user_id
        ORDER BY l.sent_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM email_sent_log`,
    ]);

    return {
      entries: rows.map((r) => ({
        id: r.id,
        templateId: r.template_id,
        sentByUserId: r.sent_by,
        sentByEmail: r.sent_by_email,
        recipientEmail: r.recipient_email,
        recipientName: r.recipient_name,
        subject: r.subject,
        category: r.category,
        isBulk: r.is_bulk,
        bulkCount: r.bulk_count,
        targetRole: r.target_role,
        status: r.status,
        errorMessage: r.error_message,
        sentAt: r.sent_at,
      })),
      total: countRow?.count ?? 0,
    };
  }
);
