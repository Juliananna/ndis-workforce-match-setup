import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdminOrCompliance } from "./guard";
import { workerDocumentsBucket } from "../workers/storage";

export interface VerifyDocumentRequest {
  documentId: string;
  action: "verify" | "reject";
  rejectionReason?: string;
}

export interface VerifyDocumentResponse {
  documentId: string;
  verificationStatus: string;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  downloadUrl: string | null;
}

export const adminVerifyDocument = api<VerifyDocumentRequest, VerifyDocumentResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/documents/:documentId/verify" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    if (req.action !== "verify" && req.action !== "reject") {
      throw APIError.invalidArgument("action must be 'verify' or 'reject'");
    }
    if (req.action === "reject" && !req.rejectionReason?.trim()) {
      throw APIError.invalidArgument("rejectionReason is required when rejecting a document");
    }

    const newStatus = req.action === "verify" ? "Verified" : "Pending";

    const row = await db.queryRow<{
      id: string;
      verification_status: string;
      verified_at: Date | null;
      rejection_reason: string | null;
      file_key: string;
    }>`
      UPDATE worker_documents
      SET
        verification_status = ${newStatus},
        verified_by = ${auth.userID},
        verified_at = NOW(),
        rejection_reason = ${req.action === "reject" ? (req.rejectionReason ?? null) : null},
        updated_at = NOW()
      WHERE id = ${req.documentId}
      RETURNING id, verification_status, verified_at, rejection_reason, file_key
    `;

    if (!row) throw APIError.notFound("document not found");

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
