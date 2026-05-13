import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdminOrCompliance } from "./guard";
import { sendEmail } from "../emailer/sender";

export interface SendReferenceMessageRequest {
  workerId: string;
  referenceId: string;
  message: string;
}

export interface SendReferenceMessageResponse {
  notificationId: string;
}

export const adminSendReferenceMessage = api<SendReferenceMessageRequest, SendReferenceMessageResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/workers/:workerId/references/:referenceId/message" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    if (!req.message?.trim()) throw APIError.invalidArgument("message cannot be empty");
    if (req.message.length > 2000) throw APIError.invalidArgument("message cannot exceed 2000 characters");

    const resolvedMessage = (text: string, firstName: string) =>
      text.replace(/\{FirstName\}/gi, firstName);

    const ref = await db.queryRow<{
      id: string;
      referee_name: string;
      referee_organisation: string;
      worker_id: string;
    }>`
      SELECT id, referee_name, referee_organisation, worker_id
      FROM worker_references
      WHERE id = ${req.referenceId} AND worker_id = ${req.workerId}
    `;
    if (!ref) throw APIError.notFound("reference not found");

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

    const refLabel = `${ref.referee_name} (${ref.referee_organisation})`;
    const firstName = workerUser.name.split(" ")[0] ?? workerUser.name;
    const notifTitle = `Message about your reference: ${refLabel}`;
    const notifBody = resolvedMessage(req.message.trim(), firstName);

    const row = await db.queryRow<{ id: string }>`
      INSERT INTO notifications (user_id, type, title, body, sender_name)
      VALUES (${workerUser.user_id}, 'ADMIN_REFERENCE_MESSAGE', ${notifTitle}, ${notifBody}, ${senderName?.name ?? "Compliance Team"})
      RETURNING id
    `;
    if (!row) throw APIError.internal("failed to create notification");

    await sendEmail({
      to: workerUser.email,
      subject: `Message about your reference: ${refLabel}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a;">Reference Check Message</h2>
          <p style="color: #555; font-size: 15px;">Hi ${workerUser.name},</p>
          <p style="color: #555; font-size: 15px;">
            You have received a message regarding your reference: <strong>${refLabel}</strong>
          </p>
          <div style="background: #f5f5f5; border-left: 4px solid #6366f1; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p style="color: #333; font-size: 15px; margin: 0; white-space: pre-wrap;">${req.message.trim()}</p>
          </div>
          <p style="color: #555; font-size: 15px;">
            Please log in to your account to view this message.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
        </div>
      `,
    }).catch(() => {});

    return { notificationId: row.id };
  }
);
