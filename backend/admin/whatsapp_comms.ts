import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdmin } from "./guard";
import { sendWhatsApp, sendWhatsAppTemplate } from "../emailer/whatsapp";

function firstName(fullName: string | null): string {
  if (!fullName?.trim()) return "there";
  return fullName.trim().split(/\s+/)[0];
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  description: string | null;
  contentSid: string;
  bodyPreview: string;
  category: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListWhatsAppTemplatesResponse {
  templates: WhatsAppTemplate[];
}

export const adminListWhatsAppTemplates = api<void, ListWhatsAppTemplatesResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/whatsapp-templates" },
  async () => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const rows = await db.queryAll<{
      id: string; name: string; description: string | null;
      content_sid: string; body_preview: string; category: string;
      created_by: string | null; created_at: Date; updated_at: Date;
    }>`
      SELECT id, name, description, content_sid, body_preview, category, created_by, created_at, updated_at
      FROM whatsapp_templates ORDER BY updated_at DESC
    `;

    return {
      templates: rows.map((r) => ({
        id: r.id, name: r.name, description: r.description,
        contentSid: r.content_sid, bodyPreview: r.body_preview,
        category: r.category, createdBy: r.created_by,
        createdAt: r.created_at, updatedAt: r.updated_at,
      })),
    };
  }
);

export interface CreateWhatsAppTemplateRequest {
  name: string;
  description?: string;
  contentSid: string;
  bodyPreview: string;
  category: string;
}

export const adminCreateWhatsAppTemplate = api<CreateWhatsAppTemplateRequest, WhatsAppTemplate>(
  { expose: true, auth: true, method: "POST", path: "/admin/whatsapp-templates" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.name?.trim()) throw APIError.invalidArgument("name is required");
    if (!req.contentSid?.trim()) throw APIError.invalidArgument("contentSid is required");
    if (!req.bodyPreview?.trim()) throw APIError.invalidArgument("bodyPreview is required");

    const row = await db.queryRow<{
      id: string; name: string; description: string | null;
      content_sid: string; body_preview: string; category: string;
      created_by: string | null; created_at: Date; updated_at: Date;
    }>`
      INSERT INTO whatsapp_templates (name, description, content_sid, body_preview, category, created_by)
      VALUES (${req.name.trim()}, ${req.description?.trim() ?? null}, ${req.contentSid.trim()},
              ${req.bodyPreview.trim()}, ${req.category ?? "general"}, ${auth.userID})
      RETURNING id, name, description, content_sid, body_preview, category, created_by, created_at, updated_at
    `;
    if (!row) throw APIError.internal("failed to create template");

    return {
      id: row.id, name: row.name, description: row.description,
      contentSid: row.content_sid, bodyPreview: row.body_preview,
      category: row.category, createdBy: row.created_by,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
);

export interface UpdateWhatsAppTemplateRequest {
  id: string;
  name: string;
  description?: string;
  contentSid: string;
  bodyPreview: string;
  category: string;
}

export const adminUpdateWhatsAppTemplate = api<UpdateWhatsAppTemplateRequest, WhatsAppTemplate>(
  { expose: true, auth: true, method: "PUT", path: "/admin/whatsapp-templates/:id" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.name?.trim()) throw APIError.invalidArgument("name is required");
    if (!req.contentSid?.trim()) throw APIError.invalidArgument("contentSid is required");
    if (!req.bodyPreview?.trim()) throw APIError.invalidArgument("bodyPreview is required");

    const row = await db.queryRow<{
      id: string; name: string; description: string | null;
      content_sid: string; body_preview: string; category: string;
      created_by: string | null; created_at: Date; updated_at: Date;
    }>`
      UPDATE whatsapp_templates
      SET name = ${req.name.trim()},
          description = ${req.description?.trim() ?? null},
          content_sid = ${req.contentSid.trim()},
          body_preview = ${req.bodyPreview.trim()},
          category = ${req.category ?? "general"},
          updated_at = NOW()
      WHERE id = ${req.id}
      RETURNING id, name, description, content_sid, body_preview, category, created_by, created_at, updated_at
    `;
    if (!row) throw APIError.notFound("template not found");

    return {
      id: row.id, name: row.name, description: row.description,
      contentSid: row.content_sid, bodyPreview: row.body_preview,
      category: row.category, createdBy: row.created_by,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
);

export interface DeleteWhatsAppTemplateRequest { id: string; }

export const adminDeleteWhatsAppTemplate = api<DeleteWhatsAppTemplateRequest, void>(
  { expose: true, auth: true, method: "DELETE", path: "/admin/whatsapp-templates/:id" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);
    await db.exec`DELETE FROM whatsapp_templates WHERE id = ${req.id}`;
  }
);

export interface SendWhatsAppToUserRequest {
  userId: string;
  message: string;
  templateId?: string;
  templateBody?: string;
}

export interface SendWhatsAppResponse {
  sent: number;
}

export const adminSendWhatsAppToUser = api<SendWhatsAppToUserRequest, SendWhatsAppResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/whatsapp/send-to-user" },
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
    let logMsg = req.message?.trim() ?? "";

    if (req.templateId) {
      const tmpl = await db.queryRow<{ content_sid: string; name: string }>`
        SELECT content_sid, name FROM whatsapp_templates WHERE id = ${req.templateId}
      `;
      if (!tmpl) throw APIError.notFound("template not found");

      const variables: Record<string, string> = {
        "1": firstName(user.name),
        "2": req.templateBody?.trim() ?? "",
      };
      await sendWhatsAppTemplate(normalised, tmpl.content_sid, variables);
      logMsg = `[template:${tmpl.name}] ${req.templateBody?.trim() ?? ""}`;
    } else {
      await sendWhatsApp(normalised, req.message.trim());
    }

    await db.exec`
      INSERT INTO whatsapp_sent_log (sent_by, recipient_user_id, phone_number, message, status)
      VALUES (${auth.userID}, ${req.userId}, ${normalised}, ${logMsg}, 'sent')
    `;

    return { sent: 1 };
  }
);

export interface SendBulkWhatsAppRequest {
  message: string;
  targetRole?: "WORKER" | "EMPLOYER" | "all";
  locationContains?: string;
  templateId?: string;
  templateBody?: string;
}

export const adminSendBulkWhatsApp = api<SendBulkWhatsAppRequest, SendWhatsAppResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/whatsapp/send-bulk" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.templateId && !req.message?.trim()) {
      throw APIError.invalidArgument("message is required");
    }

    let tmpl: { content_sid: string; name: string } | null = null;
    if (req.templateId) {
      tmpl = await db.queryRow<{ content_sid: string; name: string }>`
        SELECT content_sid, name FROM whatsapp_templates WHERE id = ${req.templateId}
      ` ?? null;
      if (!tmpl) throw APIError.notFound("template not found");
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

    const baseLogMsg = tmpl
      ? `[template:${tmpl.name}] ${req.templateBody?.trim() ?? ""}`
      : req.message.trim();

    let sent = 0;
    for (const user of users) {
      const phone = user.phone!.trim().replace(/\s+/g, "");
      let status = "sent";
      let errorMsg: string | null = null;
      try {
        if (tmpl) {
          const variables: Record<string, string> = {
            "1": firstName(user.name),
            "2": req.templateBody?.trim() ?? "",
          };
          await sendWhatsAppTemplate(phone, tmpl.content_sid, variables);
        } else {
          await sendWhatsApp(phone, req.message.trim());
        }
        sent++;
      } catch (e: unknown) {
        status = "failed";
        errorMsg = e instanceof Error ? e.message : "unknown error";
      }
      await db.exec`
        INSERT INTO whatsapp_sent_log (sent_by, recipient_user_id, phone_number, message, status, error_message, is_bulk)
        VALUES (${auth.userID}, ${user.user_id}, ${phone}, ${baseLogMsg}, ${status}, ${errorMsg}, true)
      `;
    }

    return { sent };
  }
);

export interface WhatsAppLogEntry {
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

export interface ListWhatsAppLogResponse {
  entries: WhatsAppLogEntry[];
  total: number;
}

export interface ListWhatsAppLogRequest {
  limit?: number;
  offset?: number;
}

export const adminListWhatsAppLog = api<ListWhatsAppLogRequest, ListWhatsAppLogResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/whatsapp/log" },
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
        FROM whatsapp_sent_log l
        LEFT JOIN users ru ON ru.user_id = l.recipient_user_id
        LEFT JOIN workers w ON w.user_id = ru.user_id
        LEFT JOIN employers e ON e.user_id = ru.user_id
        ORDER BY l.sent_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM whatsapp_sent_log`,
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
