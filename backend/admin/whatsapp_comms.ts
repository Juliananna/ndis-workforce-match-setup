import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdmin } from "./guard";
import { sendWhatsApp, sendWhatsAppTemplate, WhatsAppTemplateOptions } from "../emailer/whatsapp";

export interface SendWhatsAppToUserRequest {
  userId: string;
  message: string;
  templateSid?: string;
  templateVariables?: string[];
}

export interface SendWhatsAppResponse {
  sent: number;
}

export const adminSendWhatsAppToUser = api<SendWhatsAppToUserRequest, SendWhatsAppResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/whatsapp/send-to-user" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.message?.trim()) throw APIError.invalidArgument("message is required");

    const user = await db.queryRow<{
      phone: string | null;
    }>`
      SELECT COALESCE(w.phone, e.phone) AS phone
      FROM users u
      LEFT JOIN workers w ON w.user_id = u.user_id
      LEFT JOIN employers e ON e.user_id = u.user_id
      WHERE u.user_id = ${req.userId}
    `;

    if (!user) throw APIError.notFound("user not found");

    const phone = user.phone;
    if (!phone?.trim()) throw APIError.invalidArgument("user has no phone number on file");

    const normalised = phone.trim().replace(/\s+/g, "");
    if (req.templateSid) {
      const template: WhatsAppTemplateOptions = {
        name: req.templateSid,
        language: "en",
        components: req.templateVariables?.length
          ? [{ type: "body", parameters: req.templateVariables.map((t) => ({ type: "text", text: t })) }]
          : undefined,
      };
      await sendWhatsAppTemplate(normalised, template);
    } else {
      await sendWhatsApp(normalised, req.message.trim());
    }

    await db.exec`
      INSERT INTO whatsapp_sent_log (sent_by, recipient_user_id, phone_number, message, status)
      VALUES (${auth.userID}, ${req.userId}, ${normalised}, ${req.message.trim()}, 'sent')
    `;

    return { sent: 1 };
  }
);

export interface SendBulkWhatsAppRequest {
  message: string;
  targetRole?: "WORKER" | "EMPLOYER" | "all";
  locationContains?: string;
  templateSid?: string;
  templateVariables?: string[];
}

export const adminSendBulkWhatsApp = api<SendBulkWhatsAppRequest, SendWhatsAppResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/whatsapp/send-bulk" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.message?.trim()) throw APIError.invalidArgument("message is required");

    const roleFilter = req.targetRole && req.targetRole !== "all" ? req.targetRole : null;
    const locationFilter = req.locationContains?.trim() || null;

    const users = await db.queryAll<{
      user_id: string;
      phone: string | null;
    }>`
      SELECT u.user_id,
        COALESCE(w.phone, e.phone) AS phone
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
      try {
        if (req.templateSid) {
          const template: WhatsAppTemplateOptions = {
            name: req.templateSid,
            language: "en",
            components: req.templateVariables?.length
              ? [{ type: "body", parameters: req.templateVariables.map((t) => ({ type: "text", text: t })) }]
              : undefined,
          };
          await sendWhatsAppTemplate(phone, template);
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
        VALUES (${auth.userID}, ${user.user_id}, ${phone}, ${req.message.trim()}, ${status}, ${errorMsg}, true)
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
        id: string;
        sent_by: string | null;
        recipient_user_id: string | null;
        recipient_name: string | null;
        phone_number: string;
        message: string;
        status: string;
        error_message: string | null;
        is_bulk: boolean;
        sent_at: Date;
      }>`
        SELECT
          l.id,
          l.sent_by,
          l.recipient_user_id,
          COALESCE(w.name, e.organisation_name) AS recipient_name,
          l.phone_number,
          l.message,
          l.status,
          l.error_message,
          l.is_bulk,
          l.sent_at
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
        id: r.id,
        sentByUserId: r.sent_by,
        recipientUserId: r.recipient_user_id,
        recipientName: r.recipient_name,
        phoneNumber: r.phone_number,
        message: r.message,
        status: r.status,
        errorMessage: r.error_message,
        isBulk: r.is_bulk,
        sentAt: r.sent_at,
      })),
      total: countRow?.count ?? 0,
    };
  }
);
