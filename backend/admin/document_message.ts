import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdminOrCompliance } from "./guard";
import { sendEmail } from "../emailer/sender";

export interface SendDocumentMessageRequest {
  workerId: string;
  documentId: string;
  message: string;
  templateLabel?: string;
}

export interface SendDocumentMessageResponse {
  notificationId: string;
}

export const adminSendDocumentMessage = api<SendDocumentMessageRequest, SendDocumentMessageResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/workers/:workerId/documents/:documentId/message" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    if (!req.message?.trim()) throw APIError.invalidArgument("message cannot be empty");
    if (req.message.length > 2000) throw APIError.invalidArgument("message cannot exceed 2000 characters");

    const resolvedMessage = (text: string, firstName: string) =>
      text.replace(/\{FirstName\}/gi, firstName);

    const doc = await db.queryRow<{
      id: string;
      document_type: string;
      title: string | null;
      worker_id: string;
    }>`
      SELECT id, document_type, title, worker_id
      FROM worker_documents
      WHERE id = ${req.documentId} AND worker_id = ${req.workerId}
    `;
    if (!doc) throw APIError.notFound("document not found");

    const workerUser = await db.queryRow<{ user_id: string; name: string; email: string }>`
      SELECT u.user_id, w.name, u.email
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      WHERE w.worker_id = ${req.workerId}
    `;
    if (!workerUser) throw APIError.notFound("worker not found");

    const senderName = await db.queryRow<{ name: string }>`
      SELECT COALESCE(w.name, 'Compliance Team') AS name
      FROM users u
      LEFT JOIN workers w ON w.user_id = u.user_id
      WHERE u.user_id = ${auth.userID}
    `;

    const docLabel = doc.title ?? doc.document_type;
    const firstName = workerUser.name.split(" ")[0] ?? workerUser.name;
    const notifTitle = `Message about your document: ${docLabel}`;
    const notifBody = resolvedMessage(req.message.trim(), firstName);

    const row = await db.queryRow<{ id: string }>`
      INSERT INTO notifications (user_id, type, document_id, title, body, sender_name)
      VALUES (${workerUser.user_id}, 'ADMIN_DOCUMENT_MESSAGE', ${req.documentId}, ${notifTitle}, ${notifBody}, ${senderName?.name ?? "Compliance Team"})
      RETURNING id
    `;
    if (!row) throw APIError.internal("failed to create notification");

    await db.exec`
      INSERT INTO compliance_message_log
        (sent_by, worker_id, document_id, document_type, template_label, message)
      VALUES
        (${auth.userID}, ${req.workerId}, ${req.documentId}, ${docLabel}, ${req.templateLabel ?? null}, ${notifBody})
    `;

    await sendEmail({
      to: workerUser.email,
      subject: `Message about your document: ${docLabel}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a;">Document Review Message</h2>
          <p style="color: #555; font-size: 15px;">Hi ${workerUser.name},</p>
          <p style="color: #555; font-size: 15px;">
            You have received a message regarding your document: <strong>${docLabel}</strong>
          </p>
          <div style="background: #f5f5f5; border-left: 4px solid #6366f1; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p style="color: #333; font-size: 15px; margin: 0; white-space: pre-wrap;">${req.message.trim()}</p>
          </div>
          <p style="color: #555; font-size: 15px;">
            Please log in to your account to view this message and update your document if required.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
        </div>
      `,
    }).catch(() => {});

    return { notificationId: row.id };
  }
);

export interface ComplianceMessageLogEntry {
  id: string;
  sentByUserId: string | null;
  sentByName: string | null;
  workerId: string;
  workerName: string | null;
  documentId: string | null;
  documentType: string;
  templateLabel: string | null;
  message: string;
  sentAt: Date;
}

export interface ListComplianceMessageLogRequest {
  workerId?: string;
  documentId?: string;
  limit?: number;
  offset?: number;
}

export interface ListComplianceMessageLogResponse {
  entries: ComplianceMessageLogEntry[];
  total: number;
}

export const adminListComplianceMessageLog = api<ListComplianceMessageLogRequest, ListComplianceMessageLogResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/compliance-message-log" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const limit = Math.min(req.limit ?? 50, 200);
    const offset = req.offset ?? 0;
    const workerFilter = req.workerId ?? null;
    const docFilter = req.documentId ?? null;

    const [rows, countRow] = await Promise.all([
      db.queryAll<{
        id: string;
        sent_by: string | null;
        sent_by_name: string | null;
        worker_id: string;
        worker_name: string | null;
        document_id: string | null;
        document_type: string;
        template_label: string | null;
        message: string;
        sent_at: Date;
      }>`
        SELECT
          l.id,
          l.sent_by,
          COALESCE(sw.name, su.email) AS sent_by_name,
          l.worker_id,
          w.name AS worker_name,
          l.document_id,
          l.document_type,
          l.template_label,
          l.message,
          l.sent_at
        FROM compliance_message_log l
        LEFT JOIN users su ON su.user_id = l.sent_by
        LEFT JOIN workers sw ON sw.user_id = su.user_id
        LEFT JOIN workers w ON w.worker_id = l.worker_id
        WHERE (${workerFilter}::uuid IS NULL OR l.worker_id = ${workerFilter}::uuid)
          AND (${docFilter}::uuid IS NULL OR l.document_id = ${docFilter}::uuid)
        ORDER BY l.sent_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count
        FROM compliance_message_log l
        WHERE (${workerFilter}::uuid IS NULL OR l.worker_id = ${workerFilter}::uuid)
          AND (${docFilter}::uuid IS NULL OR l.document_id = ${docFilter}::uuid)
      `,
    ]);

    return {
      entries: rows.map((r) => ({
        id: r.id,
        sentByUserId: r.sent_by,
        sentByName: r.sent_by_name,
        workerId: r.worker_id,
        workerName: r.worker_name,
        documentId: r.document_id,
        documentType: r.document_type,
        templateLabel: r.template_label,
        message: r.message,
        sentAt: r.sent_at,
      })),
      total: countRow?.count ?? 0,
    };
  }
);
