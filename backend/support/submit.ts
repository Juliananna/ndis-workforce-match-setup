import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { sendEmail } from "../emailer/sender";

export interface SubmitSupportRequest {
  subject: string;
  message: string;
  category?: "general" | "technical" | "billing" | "compliance" | "account";
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  createdAt: Date;
}

export const submitSupportTicket = api<SubmitSupportRequest, SupportTicket>(
  { expose: true, auth: true, method: "POST", path: "/support/tickets" },
  async (req) => {
    const auth = getAuthData()!;

    if (!req.subject?.trim()) throw APIError.invalidArgument("subject is required");
    if (!req.message?.trim()) throw APIError.invalidArgument("message is required");

    const userRow = await db.queryRow<{
      email: string;
      role: string;
      name: string | null;
      org_name: string | null;
    }>`
      SELECT u.email, u.role,
        w.name,
        e.organisation_name AS org_name
      FROM users u
      LEFT JOIN workers w ON w.user_id = u.user_id
      LEFT JOIN employers e ON e.user_id = u.user_id
      WHERE u.user_id = ${auth.userID}
    `;

    if (!userRow) throw APIError.notFound("user not found");

    const displayName = userRow.name ?? userRow.org_name ?? userRow.email;
    const category = req.category ?? "general";

    const row = await db.queryRow<{
      id: string;
      subject: string;
      message: string;
      category: string;
      status: string;
      created_at: Date;
    }>`
      INSERT INTO support_tickets
        (user_id, user_email, user_name, user_role, subject, message, category)
      VALUES
        (${auth.userID}, ${userRow.email}, ${displayName}, ${userRow.role}, ${req.subject.trim()}, ${req.message.trim()}, ${category})
      RETURNING id, subject, message, category, status, created_at
    `;

    if (!row) throw APIError.internal("failed to create ticket");

    const confirmHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">Support request received</h2>
      <p style="color: #555; font-size: 15px;">Hi ${displayName},</p>
      <p style="color: #555; font-size: 15px;">
        We've received your support request and will get back to you shortly.
      </p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 6px; font-weight: 600; color: #374151; font-size: 14px;">Your request:</p>
        <p style="margin: 0 0 4px; color: #6b7280; font-size: 13px;"><strong>Subject:</strong> ${req.subject.trim()}</p>
        <p style="margin: 0; color: #6b7280; font-size: 13px; white-space: pre-wrap;"><strong>Message:</strong> ${req.message.trim()}</p>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
    </div>`;

    try {
      await sendEmail({ to: userRow.email, subject: `Support request received: ${req.subject.trim()}`, html: confirmHtml });
    } catch {
    }

    const adminNotifyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">New support ticket #${row.id.slice(0, 8)}</h2>
      <p style="color: #555; font-size: 14px;"><strong>From:</strong> ${displayName} (${userRow.email}) &mdash; ${userRow.role}</p>
      <p style="color: #555; font-size: 14px;"><strong>Category:</strong> ${category}</p>
      <p style="color: #555; font-size: 14px;"><strong>Subject:</strong> ${req.subject.trim()}</p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; color: #374151; font-size: 14px; white-space: pre-wrap;">${req.message.trim()}</p>
      </div>
    </div>`;

    try {
      await sendEmail({ to: "support@kizazihire.com.au", subject: `[Support] ${req.subject.trim()} — ${displayName}`, html: adminNotifyHtml });
    } catch {
    }

    return {
      id: row.id,
      subject: row.subject,
      message: row.message,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
    };
  }
);
