import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { workerDocumentsBucket } from "./storage";
import type { VerificationStatus } from "./documents";
import { requireEmployerSubscription } from "../employers/subscription_guard";


// Access rule (MVP):
//   Per employer-worker relationship.
//   Employer E may access worker W's documents once ANY offer between E and W
//   has reached "Accepted" status. This is the simplest secure rule — a single
//   accepted agreement unlocks full document access for that employer-worker pair.

async function assertEmployerWorkerAgreement(
  employerId: string,
  workerId: string
): Promise<void> {
  const agreement = await db.queryRow<{ offer_id: string }>`
    SELECT offer_id FROM offers
    WHERE employer_id = ${employerId}
      AND worker_id = ${workerId}
      AND status = 'Accepted'
    LIMIT 1
  `;
  if (!agreement) {
    throw APIError.permissionDenied(
      "document access requires an accepted offer between this employer and worker"
    );
  }
}

export interface EmployerDocumentView {
  id: string;
  workerId: string;
  documentType: string;
  uploadDate: Date;
  expiryDate: Date | null;
  verificationStatus: VerificationStatus;
}

export interface ListWorkerDocumentsForEmployerRequest {
  workerId: string;
}

export interface ListWorkerDocumentsForEmployerResponse {
  documents: EmployerDocumentView[];
  workerName: string;
}

// Lists a worker's compliance documents for an employer who has an accepted offer.
// No signed URLs are returned here — metadata only. Signed URLs require a separate call.
export const listWorkerDocumentsForEmployer = api<
  ListWorkerDocumentsForEmployerRequest,
  ListWorkerDocumentsForEmployerResponse
>(
  { expose: true, auth: true, method: "GET", path: "/employers/workers/:workerId/documents" },
  async ({ workerId }) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can access this endpoint");
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    await requireEmployerSubscription(auth.userID);

    // Validate the worker exists
    const worker = await db.queryRow<{ worker_id: string; name: string; full_name: string | null }>`
      SELECT worker_id, name, full_name FROM workers WHERE worker_id = ${workerId}
    `;
    if (!worker) throw APIError.notFound("worker not found");

    // GATE: enforce accepted-offer relationship
    await assertEmployerWorkerAgreement(employer.employer_id, workerId);

    const rows = await db.queryAll<{
      id: string;
      worker_id: string;
      document_type: string;
      upload_date: Date;
      expiry_date: Date | null;
      verification_status: string;
    }>`
      SELECT id, worker_id, document_type, upload_date, expiry_date, verification_status
      FROM worker_documents
      WHERE worker_id = ${workerId}
      ORDER BY upload_date DESC
    `;

    const now = new Date();
    const documents: EmployerDocumentView[] = [];

    for (const row of rows) {
      let status = row.verification_status as VerificationStatus;
      if (row.expiry_date && status !== "Verified") {
        const diffDays =
          (row.expiry_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 0) status = "Expired";
        else if (diffDays <= 60) status = "Expiring Soon";
      }

      // Log LIST access
      await db.exec`
        INSERT INTO document_access_log (employer_id, worker_id, document_id, access_type)
        VALUES (${employer.employer_id}, ${workerId}, ${row.id}, 'LIST')
      `;

      documents.push({
        id: row.id,
        workerId: row.worker_id,
        documentType: row.document_type,
        uploadDate: row.upload_date,
        expiryDate: row.expiry_date,
        verificationStatus: status,
      });
    }

    return { documents, workerName: worker.full_name || worker.name };
  }
);

export interface GetDocumentDownloadUrlRequest {
  workerId: string;
  documentId: string;
}

export interface GetDocumentDownloadUrlResponse {
  downloadUrl: string;
  expiresInSeconds: number;
}

// Generates a short-lived signed download URL for a specific worker document.
// Only accessible by an employer with an accepted offer for that worker.
export const getDocumentDownloadUrl = api<
  GetDocumentDownloadUrlRequest,
  GetDocumentDownloadUrlResponse
>(
  {
    expose: true,
    auth: true,
    method: "POST",
    path: "/employers/workers/:workerId/documents/:documentId/download-url",
  },
  async ({ workerId, documentId }) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can access this endpoint");
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    await requireEmployerSubscription(auth.userID);

    // Validate the worker exists
    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE worker_id = ${workerId}
    `;
    if (!worker) throw APIError.notFound("worker not found");

    // GATE: enforce accepted-offer relationship
    await assertEmployerWorkerAgreement(employer.employer_id, workerId);

    // Fetch the document and verify it belongs to this worker
    const doc = await db.queryRow<{
      id: string;
      worker_id: string;
      file_key: string;
      is_demo_url: boolean;
    }>`
      SELECT id, worker_id, file_key, is_demo_url
      FROM worker_documents
      WHERE id = ${documentId}
    `;

    if (!doc) throw APIError.notFound("document not found");

    // Prevent cross-worker enumeration: verify the document belongs to the requested worker
    if (doc.worker_id !== workerId) {
      throw APIError.permissionDenied("document does not belong to this worker");
    }

    const ttl = 900; // 15-minute signed URL
    const url = doc.is_demo_url
      ? doc.file_key
      : (await workerDocumentsBucket.signedDownloadUrl(doc.file_key, { ttl })).url;

    // Log DOWNLOAD access
    await db.exec`
      INSERT INTO document_access_log (employer_id, worker_id, document_id, access_type)
      VALUES (${employer.employer_id}, ${workerId}, ${documentId}, 'DOWNLOAD')
    `;

    return { downloadUrl: url, expiresInSeconds: ttl };
  }
);
