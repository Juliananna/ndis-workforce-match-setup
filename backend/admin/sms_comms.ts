import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdmin } from "./guard";
import { sendSMS } from "../emailer/sms";

export interface SMSTemplate {
  id: string;
  name: string;
  description: string | null;
  body: string;
  category: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListSMSTemplatesResponse {
  templates: SMSTemplate[];
}

export const adminListSMSTemplates = api<void, ListSMSTemplatesResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/sms-templates" },
  async () => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const rows = await db.queryAll<{
      id: string; name: string; description: string | null;
      body: string; category: string; created_by: string | null;
      created_at: Date; updated_at: Date;
    }>`
      SELECT id, name, description, body, category, created_by, created_at, updated_at
      FROM sms_templates ORDER BY updated_at DESC
    `;

    return {
      templates: rows.map((r) => ({
        id: r.id, name: r.name, description: r.description,
        body: r.body, category: r.category, createdBy: r.created_by,
        createdAt: r.created_at, updatedAt: r.updated_at,
      })),
    };
  }
);

export interface CreateSMSTemplateRequest {
  name: string;
  description?: string;
  body: string;
  category: string;
}

export const adminCreateSMSTemplate = api<CreateSMSTemplateRequest, SMSTemplate>(
  { expose: true, auth: true, method: "POST", path: "/admin/sms-templates" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.name?.trim()) throw APIError.invalidArgument("name is required");
    if (!req.body?.trim()) throw APIError.invalidArgument("body is required");

    const row = await db.queryRow<{
      id: string; name: string; description: string | null;
      body: string; category: string; created_by: string | null;
      created_at: Date; updated_at: Date;
    }>`
      INSERT INTO sms_templates (name, description, body, category, created_by)
      VALUES (${req.name.trim()}, ${req.description?.trim() ?? null}, ${req.body.trim()},
              ${req.category ?? "general"}, ${auth.userID})
      RETURNING id, name, description, body, category, created_by, created_at, updated_at
    `;
    if (!row) throw APIError.internal("failed to create template");

    return {
      id: row.id, name: row.name, description: row.description,
      body: row.body, category: row.category, createdBy: row.created_by,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
);

export interface UpdateSMSTemplateRequest {
  id: string;
  name: string;
  description?: string;
  body: string;
  category: string;
}

export const adminUpdateSMSTemplate = api<UpdateSMSTemplateRequest, SMSTemplate>(
  { expose: true, auth: true, method: "PUT", path: "/admin/sms-templates/:id" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.name?.trim()) throw APIError.invalidArgument("name is required");
    if (!req.body?.trim()) throw APIError.invalidArgument("body is required");

    const row = await db.queryRow<{
      id: string; name: string; description: string | null;
      body: string; category: string; created_by: string | null;
      created_at: Date; updated_at: Date;
    }>`
      UPDATE sms_templates
      SET name = ${req.name.trim()},
          description = ${req.description?.trim() ?? null},
          body = ${req.body.trim()},
          category = ${req.category ?? "general"},
          updated_at = NOW()
      WHERE id = ${req.id}
      RETURNING id, name, description, body, category, created_by, created_at, updated_at
    `;
    if (!row) throw APIError.notFound("template not found");

    return {
      id: row.id, name: row.name, description: row.description,
      body: row.body, category: row.category, createdBy: row.created_by,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
);

export interface DeleteSMSTemplateRequest { id: string; }

export const adminDeleteSMSTemplate = api<DeleteSMSTemplateRequest, void>(
  { expose: true, auth: true, method: "DELETE", path: "/admin/sms-templates/:id" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);
    await db.exec`DELETE FROM sms_templates WHERE id = ${req.id}`;
  }
);

function applyPlaceholders(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export interface SendSMSToUserRequest {
  userId: string;
  message: string;
  templateId?: string;
}

export interface SendSMSResponse {
  sent: number;
}

export const adminSendSMSToUser = api<SendSMSToUserRequest, SendSMSResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/sms/send-to-user" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.templateId && !req.message?.trim()) {
      throw APIError.invalidArgument("message is required");
    }

    const user = await db.queryRow<{ phone: string | null; name: string | null }>`
      SELECT COALESCE(w.phone, e.phone) AS phone,
             COALESCE(w.name, e.organisation_name) AS name
      FROM users u
      LEFT JOIN workers w ON w.user_id = u.user_id
      LEFT JOIN employers e ON e.user_id = u.user_id
      WHERE u.user_id = ${req.userId}
    `;
    if (!user) throw APIError.notFound("user not found");
    if (!user.phone?.trim()) throw APIError.invalidArgument("user has no phone number on file");

    const normalised = user.phone.trim().replace(/\s+/g, "");
    let body = req.message?.trim() ?? "";

    if (req.templateId) {
      const tmpl = await db.queryRow<{ body: string }>`
        SELECT body FROM sms_templates WHERE id = ${req.templateId}
      `;
      if (!tmpl) throw APIError.notFound("template not found");
      const firstName = (user.name?.trim() ?? "").split(/\s+/)[0] || "there";
      body = applyPlaceholders(tmpl.body, { FirstName: firstName, FullName: user.name ?? "" });
    }

    await sendSMS(normalised, body);

    await db.exec`
      INSERT INTO sms_sent_log (sent_by, recipient_user_id, phone_number, message, status)
      VALUES (${auth.userID}, ${req.userId}, ${normalised}, ${body}, 'sent')
    `;

    return { sent: 1 };
  }
);

export interface SendBulkSMSRequest {
  message: string;
  targetRole?: "WORKER" | "EMPLOYER" | "all";
  locationContains?: string;
  templateId?: string;
}

export const adminSendBulkSMS = api<SendBulkSMSRequest, SendSMSResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/sms/send-bulk" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.templateId && !req.message?.trim()) {
      throw APIError.invalidArgument("message is required");
    }

    let tmplBody: string | null = null;
    if (req.templateId) {
      const tmpl = await db.queryRow<{ body: string }>`
        SELECT body FROM sms_templates WHERE id = ${req.templateId}
      `;
      if (!tmpl) throw APIError.notFound("template not found");
      tmplBody = tmpl.body;
    }

    const roleFilter = req.targetRole && req.targetRole !== "all" ? req.targetRole : null;
    const locationFilter = req.locationContains?.trim() || null;

    const users = await db.queryAll<{ user_id: string; phone: string | null; name: string | null }>`
      SELECT u.user_id,
        COALESCE(w.phone, e.phone) AS phone,
        COALESCE(w.name, e.organisation_name) AS name
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
        AND COALESCE(w.phone, e.phone) IS NOT NULL
        AND COALESCE(w.phone, e.phone) <> ''
      ORDER BY u.created_at DESC
    `;

    let sent = 0;
    for (const user of users) {
      const phone = user.phone!.trim().replace(/\s+/g, "");
      let status = "sent";
      let errorMsg: string | null = null;
      let body: string;

      if (tmplBody !== null) {
        const firstName = (user.name?.trim() ?? "").split(/\s+/)[0] || "there";
        body = applyPlaceholders(tmplBody, { FirstName: firstName, FullName: user.name ?? "" });
      } else {
        body = req.message.trim();
      }

      try {
        await sendSMS(phone, body);
        sent++;
      } catch (e: unknown) {
        status = "failed";
        errorMsg = e instanceof Error ? e.message : "unknown error";
      }
      await db.exec`
        INSERT INTO sms_sent_log (sent_by, recipient_user_id, phone_number, message, status, error_message, is_bulk)
        VALUES (${auth.userID}, ${user.user_id}, ${phone}, ${body}, ${status}, ${errorMsg}, true)
      `;
    }

    return { sent };
  }
);

export interface SMSLogEntry {
  id: string;
  sentByUserId: string | null;
  recipientUserId: string | null;
  recipientName: string | null;
  phoneNumber: string;
  message: string;
  status: string;
  errorMessage: string | null;
  isBulk: boolean;
  sentAt: Date;
}

export interface ListSMSLogResponse {
  entries: SMSLogEntry[];
  total: number;
}

export interface ListSMSLogRequest {
  limit?: number;
  offset?: number;
}

export const adminListSMSLog = api<ListSMSLogRequest, ListSMSLogResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/sms/log" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const limit = Math.min(req.limit ?? 50, 200);
    const offset = req.offset ?? 0;

    const [rows, countRow] = await Promise.all([
      db.queryAll<{
        id: string; sent_by: string | null; recipient_user_id: string | null;
        recipient_name: string | null; phone_number: string; message: string;
        status: string; error_message: string | null; is_bulk: boolean; sent_at: Date;
      }>`
        SELECT l.id, l.sent_by, l.recipient_user_id,
          COALESCE(w.name, e.organisation_name) AS recipient_name,
          l.phone_number, l.message, l.status, l.error_message, l.is_bulk, l.sent_at
        FROM sms_sent_log l
        LEFT JOIN users ru ON ru.user_id = l.recipient_user_id
        LEFT JOIN workers w ON w.user_id = ru.user_id
        LEFT JOIN employers e ON e.user_id = ru.user_id
        ORDER BY l.sent_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM sms_sent_log`,
    ]);

    return {
      entries: rows.map((r) => ({
        id: r.id, sentByUserId: r.sent_by, recipientUserId: r.recipient_user_id,
        recipientName: r.recipient_name, phoneNumber: r.phone_number,
        message: r.message, status: r.status, errorMessage: r.error_message,
        isBulk: r.is_bulk, sentAt: r.sent_at,
      })),
      total: countRow?.count ?? 0,
    };
  }
);
