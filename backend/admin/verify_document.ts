import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdminOrCompliance } from "./guard";
import { workerDocumentsBucket } from "../workers/storage";
import { sendEmail } from "../emailer/sender";

export type FlagReason = "expired" | "unclear" | "wrong_doc" | "missing_info";

const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  expired: "Document appears to be expired",
  unclear: "Document is unclear or difficult to read",
  wrong_doc: "Incorrect document type uploaded",
  missing_info: "Document is missing required information",
};

export interface VerifyDocumentRequest {
  documentId: string;
  action: "verify" | "reject" | "flag";
  rejectionReason?: string;
  flagReason?: FlagReason;
}

export interface VerifyDocumentResponse {
  documentId: string;
  verificationStatus: string;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  flagReason: FlagReason | null;
  downloadUrl: string | null;
}

export const adminVerifyDocument = api<VerifyDocumentRequest, VerifyDocumentResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/documents/:documentId/verify" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    if (req.action !== "verify" && req.action !== "reject" && req.action !== "flag") {
      throw APIError.invalidArgument("action must be 'verify', 'reject', or 'flag'");
    }
    if (req.action === "reject" && !req.rejectionReason?.trim()) {
      throw APIError.invalidArgument("rejectionReason is required when rejecting a document");
    }
    if (req.action === "flag" && !req.flagReason) {
      throw APIError.invalidArgument("flagReason is required when flagging a document");
    }

    const validFlagReasons = new Set<string>(["expired", "unclear", "wrong_doc", "missing_info"]);
    if (req.flagReason && !validFlagReasons.has(req.flagReason)) {
      throw APIError.invalidArgument("invalid flagReason");
    }

    let newStatus: string;
    if (req.action === "verify") newStatus = "Verified";
    else if (req.action === "flag") newStatus = "Flagged";
    else newStatus = "Pending";

    const flagReason = req.action === "flag" ? (req.flagReason ?? null) : null;

    const row = await db.queryRow<{
      id: string;
      verification_status: string;
      verified_at: Date | null;
      rejection_reason: string | null;
      flag_reason: string | null;
      file_key: string;
      document_type: string;
      title: string | null;
      worker_id: string;
    }>`
      UPDATE worker_documents
      SET
        verification_status = ${newStatus},
        verified_by = ${auth.userID},
        verified_at = NOW(),
        rejection_reason = ${req.action === "reject" ? (req.rejectionReason ?? null) : null},
        flag_reason = ${flagReason},
        updated_at = NOW()
      WHERE id = ${req.documentId}
      RETURNING id, verification_status, verified_at, rejection_reason, flag_reason, file_key, document_type, title, worker_id
    `;

    if (!row) throw APIError.notFound("document not found");

    if (req.action === "flag") {
      const workerUser = await db.queryRow<{ user_id: string; name: string; email: string }>`
        SELECT u.user_id, w.name, u.email
        FROM workers w
        JOIN users u ON u.user_id = w.user_id
        WHERE w.worker_id = ${row.worker_id}
      `;

      if (workerUser) {
        const docLabel = row.title ?? row.document_type;
        const firstName = workerUser.name.split(" ")[0] ?? workerUser.name;
        const reasonLabel = FLAG_REASON_LABELS[req.flagReason!] ?? req.flagReason;

        const notifTitle = `Action required: ${docLabel}`;
        const notifBody = `Hi ${firstName}, your document "${docLabel}" has been flagged and requires your attention. Reason: ${reasonLabel}. Please log in to your profile and upload a corrected document.`;

        await db.exec`
          INSERT INTO notifications (user_id, type, document_id, title, body, sender_name)
          VALUES (${workerUser.user_id}, 'ADMIN_DOCUMENT_MESSAGE', ${req.documentId}, ${notifTitle}, ${notifBody}, 'Compliance Team')
        `;

        const appUrl = "https://ndis-workforce-match-setup-d6t4j0c82vjgmsb23vrg.lp.dev/dashboard";

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1a1a1a;">Action Required: Document Update Needed</h2>
            <p style="color: #555; font-size: 15px;">Hi ${workerUser.name},</p>
            <p style="color: #555; font-size: 15px;">
              Our compliance team has reviewed your document <strong>${docLabel}</strong> and requires you to take action.
            </p>
            <div style="background: #fff3cd; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px;">
              <p style="color: #92400e; font-size: 15px; margin: 0; font-weight: 600;">Reason: ${reasonLabel}</p>
            </div>
            <p style="color: #555; font-size: 15px;">
              Please log in to your profile and upload a corrected version of this document to continue your compliance process.
            </p>
            <a href="${appUrl}" style="display: inline-block; margin-top: 12px; padding: 12px 24px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 600;">
              Go to My Documents
            </a>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">Kizazi Hire &mdash; Connecting disability support workers with employers.</p>
          </div>
        `;

        try {
          await sendEmail({
            to: workerUser.email,
            subject: `Action Required: Please update your ${docLabel}`,
            html: emailHtml,
          });
        } catch (e) {
          console.error("Failed to send document flag email:", e);
        }
      }
    }

    let downloadUrl: string | null = null;
    if (req.action === "verify") {
      const { url } = await workerDocumentsBucket.signedDownloadUrl(row.file_key, { ttl: 3600 });
      downloadUrl = url;
    }

    return {
      documentId: row.id,
      verificationStatus: row.verification_status,
      verifiedAt: row.verified_at,
      rejectionReason: row.rejection_reason,
      flagReason: (row.flag_reason as FlagReason | null),
      downloadUrl,
    };
  }
);

export interface GetDocumentDownloadUrlRequest {
  documentId: string;
}

export interface GetDocumentDownloadUrlResponse {
  downloadUrl: string;
}

export const adminGetDocumentDownloadUrl = api<GetDocumentDownloadUrlRequest, GetDocumentDownloadUrlResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/documents/:documentId/download-url" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const doc = await db.queryRow<{ file_key: string }>`
      SELECT file_key FROM worker_documents WHERE id = ${req.documentId}
    `;
    if (!doc) throw APIError.notFound("document not found");

    const { url } = await workerDocumentsBucket.signedDownloadUrl(doc.file_key, { ttl: 3600 });
    return { downloadUrl: url };
  }
);
