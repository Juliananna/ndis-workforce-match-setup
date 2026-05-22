import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { randomBytes } from "crypto";
import db from "../db";
import { assertAdminOrCompliance } from "./guard";
import { sendEmail } from "../emailer/sender";

const FRONTEND_BASE_URL = "https://ndis-workforce-match-setup-d6t4j0c82vjgmsb23vrg.lp.dev";

export interface EmailReferenceRequest {
  referenceId: string;
  customMessage?: string;
}

export interface EmailReferenceResponse {
  requestId: string;
  token: string;
  sentTo: string;
}

export const adminSendEmailReferenceRequest = api<EmailReferenceRequest, EmailReferenceResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/references/:referenceId/email-request" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const ref = await db.queryRow<{
      id: string;
      referee_name: string;
      referee_email: string | null;
      referee_title: string;
      referee_organisation: string;
      worker_id: string;
      status: string;
    }>`
      SELECT id, referee_name, referee_email, referee_title, referee_organisation, worker_id, status
      FROM worker_references
      WHERE id = ${req.referenceId}
    `;
    if (!ref) throw APIError.notFound("reference not found");
    if (!ref.referee_email) throw APIError.invalidArgument("referee has no email address");

    const worker = await db.queryRow<{ name: string }>`
      SELECT w.name FROM workers w WHERE w.worker_id = ${ref.worker_id}
    `;

    const officer = await db.queryRow<{ name: string | null; email: string }>`
      SELECT COALESCE(w.name, u.email) AS name, u.email
      FROM users u LEFT JOIN workers w ON w.user_id = u.user_id
      WHERE u.user_id = ${auth.userID}
    `;

    const existing = await db.queryRow<{ id: string }>`
      SELECT id FROM email_reference_requests
      WHERE reference_id = ${req.referenceId} AND status = 'Pending'
      ORDER BY created_at DESC LIMIT 1
    `;
    if (existing) {
      await db.exec`
        UPDATE email_reference_requests
        SET status = 'Cancelled', updated_at = NOW()
        WHERE id = ${existing.id}
      `;
    }

    const token = randomBytes(32).toString("hex");

    const row = await db.queryRow<{ id: string }>`
      INSERT INTO email_reference_requests (reference_id, token, sent_by_user_id, sent_to_email)
      VALUES (${req.referenceId}, ${token}, ${auth.userID}, ${ref.referee_email})
      RETURNING id
    `;
    if (!row) throw APIError.internal("failed to create email reference request");

    await db.exec`
      UPDATE worker_references SET status = 'Contacted', updated_at = NOW()
      WHERE id = ${req.referenceId} AND status = 'Pending'
    `;

    const formUrl = `${FRONTEND_BASE_URL}/reference/${token}`;
    const workerName = worker?.name ?? "the applicant";
    const officerName = officer?.name ?? "The Compliance Team";
    const customMsg = req.customMessage?.trim();

    await sendEmail({
      to: ref.referee_email,
      subject: `Reference Check Request for ${workerName} – Kizazi Hire`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff;">
          <img src="https://ndis-workforce-match-setup-d6t4j0c82vjgmsb23vrg.lp.dev/kizazi-hire-logo.png" alt="Kizazi Hire" style="height: 40px; margin-bottom: 24px;" />
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">Reference Check Request</h2>
          <p style="color: #555; font-size: 15px;">Dear ${ref.referee_name},</p>
          <p style="color: #555; font-size: 15px;">
            My name is <strong>${officerName}</strong> from <strong>Kizazi Hire</strong>. We are in the process of verifying
            <strong>${workerName}</strong>'s employment history and professional background. You have been listed as a
            referee for this applicant.
          </p>
          ${customMsg ? `<p style="color: #555; font-size: 15px;">${customMsg}</p>` : ""}
          <p style="color: #555; font-size: 15px;">
            We kindly ask you to complete a short reference check form at your convenience. It should take approximately
            10 minutes and covers standard questions about the applicant's work performance, reliability and
            professionalism.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${formUrl}"
               style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-block;">
              Complete Reference Check
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">
            This link is unique to you and will expire in 14 days. If you have any questions, please contact our
            compliance team at <a href="mailto:compliance@kizazihire.com.au" style="color: #4f46e5;">compliance@kizazihire.com.au</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #bbb; font-size: 12px;">
            Kizazi Hire &mdash; Connecting disability support workers with employers.<br/>
            This email was sent to ${ref.referee_email} because you were listed as a referee.
          </p>
        </div>
      `,
    }).catch(() => {});

    return { requestId: row.id, token, sentTo: ref.referee_email };
  }
);

export interface EmailReferenceRequestItem {
  id: string;
  referenceId: string;
  sentToEmail: string;
  status: "Pending" | "Completed" | "Expired" | "Cancelled";
  expiresAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export interface ListEmailReferenceRequestsResponse {
  requests: EmailReferenceRequestItem[];
}

export const adminListEmailReferenceRequests = api<{ referenceId: string }, ListEmailReferenceRequestsResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/references/:referenceId/email-requests" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const rows = await db.queryAll<{
      id: string;
      reference_id: string;
      sent_to_email: string;
      status: string;
      expires_at: Date;
      completed_at: Date | null;
      created_at: Date;
    }>`
      SELECT id, reference_id, sent_to_email, status, expires_at, completed_at, created_at
      FROM email_reference_requests
      WHERE reference_id = ${req.referenceId}
      ORDER BY created_at DESC
    `;

    return {
      requests: rows.map((r) => ({
        id: r.id,
        referenceId: r.reference_id,
        sentToEmail: r.sent_to_email,
        status: r.status as EmailReferenceRequestItem["status"],
        expiresAt: r.expires_at,
        completedAt: r.completed_at,
        createdAt: r.created_at,
      })),
    };
  }
);

export const adminCancelEmailReferenceRequest = api<{ requestId: string }, void>(
  { expose: true, auth: true, method: "DELETE", path: "/admin/references/email-requests/:requestId" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const row = await db.queryRow<{ id: string }>`
      UPDATE email_reference_requests
      SET status = 'Cancelled', updated_at = NOW()
      WHERE id = ${req.requestId} AND status = 'Pending'
      RETURNING id
    `;
    if (!row) throw APIError.notFound("request not found or not pending");
  }
);
