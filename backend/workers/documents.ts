import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { workerDocumentsBucket } from "./storage";

export const MANDATORY_DOCUMENT_TYPES = [
  "Driver's Licence",
  "Passport / ID",
  "Working With Children Check",
  "Police Clearance",
  "NDIS Worker Screening Check",
  "NDIS Worker Orientation Module",
  "NDIS Code of Conduct acknowledgement",
  "Infection Control Certificate",
  "First Aid Certificate",
  "CPR Certificate",
  "Certificate III / IV Disability",
] as const;

export const OPTIONAL_DOCUMENT_TYPES = [
  "Nursing qualifications",
  "Other relevant training",
] as const;

export const DOCUMENT_TYPES = [
  ...MANDATORY_DOCUMENT_TYPES,
  ...OPTIONAL_DOCUMENT_TYPES,
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type VerificationStatus = "Pending" | "Verified" | "Missing" | "Expiring Soon" | "Expired";

export interface WorkerDocument {
  id: string;
  workerId: string;
  documentType: string;
  title: string | null;
  fileUrl: string;
  uploadDate: Date;
  expiryDate: Date | null;
  verificationStatus: VerificationStatus;
  createdAt: Date;
}

export interface ListDocumentsResponse {
  documents: WorkerDocument[];
}

export interface GetUploadUrlRequest {
  documentType: string;
  fileName: string;
  expiryDate?: string;
}

export interface GetUploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
}

export interface ConfirmDocumentUploadRequest {
  fileKey: string;
  documentType: string;
  title?: string;
  expiryDate?: string;
}

export interface DeleteDocumentRequest {
  documentId: string;
}

export interface UpdateDocumentExpiryRequest {
  documentId: string;
  expiryDate: string | null;
}

function resolveStatus(expiryDate: Date | null, currentStatus: VerificationStatus = "Pending"): VerificationStatus {
  if (!expiryDate) return currentStatus === "Verified" ? "Verified" : "Pending";
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "Expired";
  if (diffDays <= 30) return "Expiring Soon";
  if (diffDays <= 60) return "Expiring Soon";
  return currentStatus === "Verified" ? "Verified" : "Pending";
}

async function getWorkerIdForUser(userId: string): Promise<string> {
  const worker = await db.queryRow<{ worker_id: string }>`
    SELECT worker_id FROM workers WHERE user_id = ${userId}
  `;
  if (!worker) {
    throw APIError.notFound("worker not found");
  }
  return worker.worker_id;
}

// Returns a signed upload URL for a compliance document.
export const getDocumentUploadUrl = api<GetUploadUrlRequest, GetUploadUrlResponse>(
  { expose: true, auth: true, method: "POST", path: "/workers/documents/upload-url" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const validTypes = new Set<string>(DOCUMENT_TYPES);
    if (!validTypes.has(req.documentType)) {
      throw APIError.invalidArgument(`invalid document type: ${req.documentType}`);
    }

    const workerId = await getWorkerIdForUser(auth.userID);
    const ext = (req.fileName.split(".").pop() ?? "").toLowerCase();
    const allowedExts = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);
    if (!allowedExts.has(ext)) {
      throw APIError.invalidArgument("file must be PDF, JPG, PNG, or WebP");
    }
    const fileKey = `${workerId}/${Date.now()}-${req.documentType.replace(/[^a-z0-9]/gi, "_")}.${ext}`;

    const { url } = await workerDocumentsBucket.signedUploadUrl(fileKey, { ttl: 3600 });

    return { uploadUrl: url, fileKey };
  }
);

// Confirms a compliance document upload and records it in the database.
export const confirmDocumentUpload = api<ConfirmDocumentUploadRequest, WorkerDocument>(
  { expose: true, auth: true, method: "POST", path: "/workers/documents/confirm" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const validTypes = new Set<string>(DOCUMENT_TYPES);
    if (!validTypes.has(req.documentType)) {
      throw APIError.invalidArgument(`invalid document type: ${req.documentType}`);
    }

    if (req.documentType === "Other relevant training" && !req.title?.trim()) {
      throw APIError.invalidArgument("a title is required for 'Other relevant training' documents");
    }

    const workerId = await getWorkerIdForUser(auth.userID);

    if (!req.fileKey.startsWith(`${workerId}/`)) {
      throw APIError.permissionDenied("invalid file key");
    }

    const exists = await workerDocumentsBucket.exists(req.fileKey);
    if (!exists) {
      throw APIError.failedPrecondition("file not found in storage; upload it first");
    }

    if (req.expiryDate) {
      const parsed = new Date(req.expiryDate);
      if (isNaN(parsed.getTime())) {
        throw APIError.invalidArgument("invalid expiryDate — must be ISO date string");
      }
    }
    const expiryDate = req.expiryDate ? new Date(req.expiryDate) : null;
    const status: VerificationStatus = expiryDate ? resolveStatus(expiryDate) : "Pending";

    const title = req.title?.trim() ?? null;

    const row = await db.queryRow<{
      id: string;
      worker_id: string;
      document_type: string;
      title: string | null;
      file_key: string;
      upload_date: Date;
      expiry_date: Date | null;
      verification_status: string;
      created_at: Date;
    }>`
      INSERT INTO worker_documents (worker_id, document_type, title, file_key, expiry_date, verification_status)
      VALUES (${workerId}, ${req.documentType}, ${title}, ${req.fileKey}, ${expiryDate}, ${status})
      RETURNING id, worker_id, document_type, title, file_key, upload_date, expiry_date, verification_status, created_at
    `;

    if (!row) {
      throw APIError.internal("failed to record document");
    }

    const { url: fileUrl } = await workerDocumentsBucket.signedDownloadUrl(row.file_key, { ttl: 3600 });

    return {
      id: row.id,
      workerId: row.worker_id,
      documentType: row.document_type,
      title: row.title,
      fileUrl,
      uploadDate: row.upload_date,
      expiryDate: row.expiry_date,
      verificationStatus: row.verification_status as VerificationStatus,
      createdAt: row.created_at,
    };
  }
);

// Lists all compliance documents for the authenticated worker.
export const listWorkerDocuments = api<void, ListDocumentsResponse>(
  { expose: true, auth: true, method: "GET", path: "/workers/documents" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const workerId = await getWorkerIdForUser(auth.userID);

    const rows = await db.queryAll<{
      id: string;
      worker_id: string;
      document_type: string;
      title: string | null;
      file_key: string;
      upload_date: Date;
      expiry_date: Date | null;
      verification_status: string;
      created_at: Date;
      is_demo_url: boolean;
    }>`
      SELECT id, worker_id, document_type, title, file_key, upload_date, expiry_date, verification_status, created_at, is_demo_url
      FROM worker_documents
      WHERE worker_id = ${workerId}
      ORDER BY created_at DESC
    `;

    const now = new Date();
    const documents: WorkerDocument[] = [];

    for (const row of rows) {
      let status = row.verification_status as VerificationStatus;
      if (row.expiry_date && status !== "Verified") {
        const diffDays = (row.expiry_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 0) {
          status = "Expired";
        } else if (diffDays <= 60) {
          status = "Expiring Soon";
        }
        if (status !== row.verification_status) {
          await db.exec`UPDATE worker_documents SET verification_status = ${status} WHERE id = ${row.id}`;
        }
      }

      const fileUrl = row.is_demo_url
        ? row.file_key
        : (await workerDocumentsBucket.signedDownloadUrl(row.file_key, { ttl: 3600 })).url;

      documents.push({
        id: row.id,
        workerId: row.worker_id,
        documentType: row.document_type,
        title: row.title,
        fileUrl,
        uploadDate: row.upload_date,
        expiryDate: row.expiry_date,
        verificationStatus: status,
        createdAt: row.created_at,
      });
    }

    return { documents };
  }
);

// Deletes a compliance document for the authenticated worker.
export const deleteWorkerDocument = api<DeleteDocumentRequest, void>(
  { expose: true, auth: true, method: "DELETE", path: "/workers/documents/:documentId" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const workerId = await getWorkerIdForUser(auth.userID);

    const doc = await db.queryRow<{ file_key: string; worker_id: string }>`
      SELECT file_key, worker_id FROM worker_documents
      WHERE id = ${req.documentId}
    `;

    if (!doc) {
      throw APIError.notFound("document not found");
    }
    if (doc.worker_id !== workerId) {
      throw APIError.permissionDenied("access denied");
    }

    try {
      await workerDocumentsBucket.remove(doc.file_key);
    } catch (e) {
      console.error("Failed to remove document from storage:", e);
    }

    await db.exec`DELETE FROM worker_documents WHERE id = ${req.documentId}`;
  }
);

// Updates the expiry date of an existing compliance document.
export const updateDocumentExpiry = api<UpdateDocumentExpiryRequest, WorkerDocument>(
  { expose: true, auth: true, method: "PATCH", path: "/workers/documents/:documentId" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const workerId = await getWorkerIdForUser(auth.userID);

    const doc = await db.queryRow<{ worker_id: string; file_key: string; verification_status: string; title: string | null }>`
      SELECT worker_id, file_key, verification_status, title FROM worker_documents WHERE id = ${req.documentId}
    `;
    if (!doc) throw APIError.notFound("document not found");
    if (doc.worker_id !== workerId) throw APIError.permissionDenied("access denied");

    if (req.expiryDate !== null) {
      const parsed = new Date(req.expiryDate);
      if (isNaN(parsed.getTime())) {
        throw APIError.invalidArgument("invalid expiryDate");
      }
    }

    const expiryDate = req.expiryDate ? new Date(req.expiryDate) : null;
    const currentStatus = doc.verification_status as VerificationStatus;
    const newStatus = resolveStatus(expiryDate, currentStatus);

    const row = await db.queryRow<{
      id: string;
      worker_id: string;
      document_type: string;
      title: string | null;
      file_key: string;
      upload_date: Date;
      expiry_date: Date | null;
      verification_status: string;
      created_at: Date;
    }>`
      UPDATE worker_documents
      SET expiry_date = ${expiryDate}, verification_status = ${newStatus}, updated_at = NOW()
      WHERE id = ${req.documentId}
      RETURNING id, worker_id, document_type, title, file_key, upload_date, expiry_date, verification_status, created_at
    `;

    if (!row) throw APIError.internal("failed to update document");

    const { url: fileUrl } = await workerDocumentsBucket.signedDownloadUrl(row.file_key, { ttl: 3600 });

    return {
      id: row.id,
      workerId: row.worker_id,
      documentType: row.document_type,
      title: row.title,
      fileUrl,
      uploadDate: row.upload_date,
      expiryDate: row.expiry_date,
      verificationStatus: row.verification_status as VerificationStatus,
      createdAt: row.created_at,
    };
  }
);

// Returns the list of supported document types.
export const listDocumentTypes = api<void, { types: string[] }>(
  { expose: true, method: "GET", path: "/workers/document-types" },
  async () => {
    return { types: [...DOCUMENT_TYPES] };
  }
);
