import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdminOrCompliance } from "./guard";
import { sendEmail } from "../emailer/sender";

export interface SendDocumentMessageRequest {
  workerId: string;
  documentId: string;
  message: string;
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
