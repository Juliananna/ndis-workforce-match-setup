import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { workerDocumentsBucket } from "./storage";

export interface WorkerResume {
  id: string;
  workerId: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: Date;
}

export interface GetResumeUploadUrlRequest {
  fileName: string;
}

export interface GetResumeUploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
}

export interface ConfirmResumeUploadRequest {
  fileKey: string;
  fileName: string;
}

async function getWorkerIdForUser(userId: string): Promise<string> {
  const worker = await db.queryRow<{ worker_id: string }>`
    SELECT worker_id FROM workers WHERE user_id = ${userId}
  `;
  if (!worker) throw APIError.notFound("worker not found");
  return worker.worker_id;
}

export const getResumeUploadUrl = api<GetResumeUploadUrlRequest, GetResumeUploadUrlResponse>(
  { expose: true, auth: true, method: "POST", path: "/workers/resume/upload-url" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can access this endpoint");

    const ext = (req.fileName.split(".").pop() ?? "").toLowerCase();
    const allowedExts = new Set(["pdf", "doc", "docx"]);
    if (!allowedExts.has(ext)) throw APIError.invalidArgument("resume must be PDF, DOC, or DOCX");

    const workerId = await getWorkerIdForUser(auth.userID);
    const fileKey = `${workerId}/resume-${Date.now()}.${ext}`;
    const { url } = await workerDocumentsBucket.signedUploadUrl(fileKey, { ttl: 3600 });

    return { uploadUrl: url, fileKey };
  }
);

export const confirmResumeUpload = api<ConfirmResumeUploadRequest, WorkerResume>(
  { expose: true, auth: true, method: "POST", path: "/workers/resume/confirm" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can access this endpoint");

    const workerId = await getWorkerIdForUser(auth.userID);

    if (!req.fileKey.startsWith(`${workerId}/`)) throw APIError.permissionDenied("invalid file key");

    const exists = await workerDocumentsBucket.exists(req.fileKey);
    if (!exists) throw APIError.failedPrecondition("file not found in storage; upload it first");

    await db.exec`DELETE FROM worker_resumes WHERE worker_id = ${workerId}`;

    const row = await db.queryRow<{
      id: string;
      worker_id: string;
      file_key: string;
      file_name: string;
      uploaded_at: Date;
    }>`
      INSERT INTO worker_resumes (worker_id, file_key, file_name)
      VALUES (${workerId}, ${req.fileKey}, ${req.fileName})
      RETURNING id, worker_id, file_key, file_name, uploaded_at
    `;

    if (!row) throw APIError.internal("failed to record resume");

    const { url: fileUrl } = await workerDocumentsBucket.signedDownloadUrl(row.file_key, { ttl: 3600 });

    return {
      id: row.id,
      workerId: row.worker_id,
      fileUrl,
      fileName: row.file_name,
      uploadedAt: row.uploaded_at,
    };
  }
);

export const getWorkerResume = api<void, { resume: WorkerResume | null }>(
  { expose: true, auth: true, method: "GET", path: "/workers/resume" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can access this endpoint");

    const workerId = await getWorkerIdForUser(auth.userID);

    const row = await db.queryRow<{
      id: string;
      worker_id: string;
      file_key: string;
      file_name: string;
      uploaded_at: Date;
    }>`
      SELECT id, worker_id, file_key, file_name, uploaded_at
      FROM worker_resumes WHERE worker_id = ${workerId}
      ORDER BY uploaded_at DESC LIMIT 1
    `;

    if (!row) return { resume: null };

    const { url: fileUrl } = await workerDocumentsBucket.signedDownloadUrl(row.file_key, { ttl: 3600 });

    return {
      resume: {
        id: row.id,
        workerId: row.worker_id,
        fileUrl,
        fileName: row.file_name,
        uploadedAt: row.uploaded_at,
      },
    };
  }
);

export const deleteWorkerResume = api<void, void>(
  { expose: true, auth: true, method: "DELETE", path: "/workers/resume" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can access this endpoint");

    const workerId = await getWorkerIdForUser(auth.userID);

    const row = await db.queryRow<{ file_key: string }>`
      SELECT file_key FROM worker_resumes WHERE worker_id = ${workerId} ORDER BY uploaded_at DESC LIMIT 1
    `;

    if (row) {
      try { await workerDocumentsBucket.remove(row.file_key); } catch (e) { console.error(e); }
    }

    await db.exec`DELETE FROM worker_resumes WHERE worker_id = ${workerId}`;
  }
);
