import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { workerDocumentsBucket, workerVideosBucket, profilePhotosBucket } from "../workers/storage";
import { DOCUMENT_TYPES } from "../workers/documents";

async function readBody(req: import("node:http").IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", resolve);
    req.on("error", reject);
  });
  return Buffer.concat(chunks);
}

async function getWorkerIdForUser(userId: string): Promise<string> {
  const worker = await db.queryRow<{ worker_id: string }>`
    SELECT worker_id FROM workers WHERE user_id = ${userId}
  `;
  if (!worker) throw APIError.notFound("worker not found");
  return worker.worker_id;
}

export const uploadWorkerDocument = api.raw(
  { expose: true, auth: true, method: "POST", path: "/uploads/worker-document" },
  async (req, resp) => {
    const auth = getAuthData();
    if (!auth || auth.role !== "WORKER") {
      resp.writeHead(403, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "only workers can upload documents" }));
      return;
    }

    const url = new URL(req.url!, `http://localhost`);
    const documentType = url.searchParams.get("documentType") ?? "";
    const fileName = url.searchParams.get("fileName") ?? "upload";
    const expiryDate = url.searchParams.get("expiryDate") ?? undefined;
    const title = url.searchParams.get("title") ?? undefined;

    const validTypes = new Set<string>(DOCUMENT_TYPES);
    if (!validTypes.has(documentType)) {
      resp.writeHead(400, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: `invalid document type: ${documentType}` }));
      return;
    }

    const ext = (fileName.split(".").pop() ?? "").toLowerCase();
    const allowedExts = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);
    if (!allowedExts.has(ext)) {
      resp.writeHead(400, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "file must be PDF, JPG, PNG, or WebP" }));
      return;
    }

    const workerId = await getWorkerIdForUser(auth.userID);
    const fileKey = `${workerId}/${Date.now()}-${documentType.replace(/[^a-z0-9]/gi, "_")}.${ext}`;
    const contentType = req.headers["content-type"] ?? "application/octet-stream";
    const body = await readBody(req);

    await workerDocumentsBucket.upload(fileKey, body, { contentType });

    const parsedExpiry = expiryDate ? new Date(expiryDate) : null;
    if (expiryDate && parsedExpiry && isNaN(parsedExpiry.getTime())) {
      resp.writeHead(400, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "invalid expiryDate" }));
      return;
    }

    if (documentType === "Other relevant training" && !title?.trim()) {
      resp.writeHead(400, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "a title is required for 'Other relevant training' documents" }));
      return;
    }

    const now = new Date();
    let status = "Pending";
    if (parsedExpiry) {
      const diffDays = (parsedExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 0) status = "Expired";
      else if (diffDays <= 60) status = "Expiring Soon";
    }

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
      VALUES (${workerId}, ${documentType}, ${title?.trim() ?? null}, ${fileKey}, ${parsedExpiry}, ${status})
      RETURNING id, worker_id, document_type, title, file_key, upload_date, expiry_date, verification_status, created_at
    `;

    if (!row) {
      resp.writeHead(500, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "failed to record document" }));
      return;
    }

    const { url: fileUrl } = await workerDocumentsBucket.signedDownloadUrl(row.file_key, { ttl: 3600 });

    resp.writeHead(200, { "Content-Type": "application/json" });
    resp.end(JSON.stringify({
      id: row.id,
      workerId: row.worker_id,
      documentType: row.document_type,
      title: row.title,
      fileUrl,
      uploadDate: row.upload_date,
      expiryDate: row.expiry_date,
      verificationStatus: row.verification_status,
      createdAt: row.created_at,
    }));
  }
);

export const uploadWorkerAvatar = api.raw(
  { expose: true, auth: true, method: "POST", path: "/uploads/worker-avatar" },
  async (req, resp) => {
    const auth = getAuthData();
    if (!auth || auth.role !== "WORKER") {
      resp.writeHead(403, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "only workers can upload avatars" }));
      return;
    }

    const url = new URL(req.url!, `http://localhost`);
    const fileName = url.searchParams.get("fileName") ?? "avatar.jpg";
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "jpg";

    const workerId = await getWorkerIdForUser(auth.userID);
    const fileKey = `avatars/worker-${workerId}.${ext}`;
    const contentType = req.headers["content-type"] ?? "image/jpeg";
    const body = await readBody(req);

    await profilePhotosBucket.upload(fileKey, body, { contentType });

    const avatarUrl = profilePhotosBucket.publicUrl(fileKey);

    await db.exec`
      UPDATE workers SET avatar_url = ${avatarUrl}, updated_at = NOW()
      WHERE worker_id = ${workerId}
    `;

    resp.writeHead(200, { "Content-Type": "application/json" });
    resp.end(JSON.stringify({ avatarUrl }));
  }
);

export const uploadWorkerVideo = api.raw(
  { expose: true, auth: true, method: "POST", path: "/uploads/worker-video" },
  async (req, resp) => {
    const auth = getAuthData();
    if (!auth || auth.role !== "WORKER") {
      resp.writeHead(403, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "only workers can upload videos" }));
      return;
    }

    const url = new URL(req.url!, `http://localhost`);
    const fileName = url.searchParams.get("fileName") ?? "video.mp4";
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "mp4";

    const workerId = await getWorkerIdForUser(auth.userID);
    const fileKey = `${workerId}/intro-video.${ext}`;
    const contentType = req.headers["content-type"] ?? "video/mp4";
    const body = await readBody(req);

    await workerVideosBucket.upload(fileKey, body, { contentType });

    await db.exec`
      UPDATE workers SET intro_video_url = ${fileKey}, updated_at = NOW()
      WHERE worker_id = ${workerId}
    `;

    const { url: videoUrl } = await workerVideosBucket.signedDownloadUrl(fileKey, { ttl: 3600 });

    resp.writeHead(200, { "Content-Type": "application/json" });
    resp.end(JSON.stringify({ videoUrl }));
  }
);

export const uploadWorkerResume = api.raw(
  { expose: true, auth: true, method: "POST", path: "/uploads/worker-resume" },
  async (req, resp) => {
    const auth = getAuthData();
    if (!auth || auth.role !== "WORKER") {
      resp.writeHead(403, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "only workers can upload resumes" }));
      return;
    }

    const url = new URL(req.url!, `http://localhost`);
    const fileName = url.searchParams.get("fileName") ?? "resume.pdf";
    const ext = (fileName.split(".").pop() ?? "").toLowerCase();
    const allowedExts = new Set(["pdf", "doc", "docx"]);
    if (!allowedExts.has(ext)) {
      resp.writeHead(400, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "resume must be PDF, DOC, or DOCX" }));
      return;
    }

    const workerId = await getWorkerIdForUser(auth.userID);
    const fileKey = `${workerId}/resume-${Date.now()}.${ext}`;
    const contentType = req.headers["content-type"] ?? "application/octet-stream";
    const body = await readBody(req);

    await workerDocumentsBucket.upload(fileKey, body, { contentType });

    await db.exec`DELETE FROM worker_resumes WHERE worker_id = ${workerId}`;

    const row = await db.queryRow<{
      id: string;
      worker_id: string;
      file_key: string;
      file_name: string;
      uploaded_at: Date;
    }>`
      INSERT INTO worker_resumes (worker_id, file_key, file_name)
      VALUES (${workerId}, ${fileKey}, ${fileName})
      RETURNING id, worker_id, file_key, file_name, uploaded_at
    `;

    if (!row) {
      resp.writeHead(500, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "failed to record resume" }));
      return;
    }

    const { url: fileUrl } = await workerDocumentsBucket.signedDownloadUrl(row.file_key, { ttl: 3600 });

    resp.writeHead(200, { "Content-Type": "application/json" });
    resp.end(JSON.stringify({
      id: row.id,
      workerId: row.worker_id,
      fileUrl,
      fileName: row.file_name,
      uploadedAt: row.uploaded_at,
    }));
  }
);

export const uploadEmailImage = api.raw(
  { expose: true, auth: true, method: "POST", path: "/uploads/email-image" },
  async (req, resp) => {
    const auth = getAuthData();
    if (!auth) {
      resp.writeHead(403, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    const isAdmin = await db.queryRow<{ user_id: string }>`
      SELECT user_id FROM admin_users WHERE user_id = ${auth.userID}
    `;
    if (!isAdmin) {
      resp.writeHead(403, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "only admins can upload email images" }));
      return;
    }

    const url = new URL(req.url!, `http://localhost`);
    const fileName = url.searchParams.get("fileName") ?? "image.jpg";
    const ext = (fileName.split(".").pop() ?? "").toLowerCase();
    const allowedExts = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
    if (!allowedExts.has(ext)) {
      resp.writeHead(400, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "image must be JPG, PNG, GIF, or WebP" }));
      return;
    }

    const fileKey = `email-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const contentType = req.headers["content-type"] ?? "image/jpeg";
    const body = await readBody(req);

    await profilePhotosBucket.upload(fileKey, body, { contentType });

    const imageUrl = profilePhotosBucket.publicUrl(fileKey);

    resp.writeHead(200, { "Content-Type": "application/json" });
    resp.end(JSON.stringify({ imageUrl }));
  }
);

export const uploadEmployerLogo = api.raw(
  { expose: true, auth: true, method: "POST", path: "/uploads/employer-logo" },
  async (req, resp) => {
    const auth = getAuthData();
    if (!auth || auth.role !== "EMPLOYER") {
      resp.writeHead(403, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "only employers can upload logos" }));
      return;
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) {
      resp.writeHead(404, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: "employer not found" }));
      return;
    }

    const url = new URL(req.url!, `http://localhost`);
    const fileName = url.searchParams.get("fileName") ?? "logo.jpg";
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileKey = `logos/employer-${employer.employer_id}.${ext}`;
    const contentType = req.headers["content-type"] ?? "image/jpeg";
    const body = await readBody(req);

    await profilePhotosBucket.upload(fileKey, body, { contentType });

    const logoUrl = profilePhotosBucket.publicUrl(fileKey);

    await db.exec`
      UPDATE employers SET logo_url = ${logoUrl}, updated_at = NOW()
      WHERE employer_id = ${employer.employer_id}
    `;

    resp.writeHead(200, { "Content-Type": "application/json" });
    resp.end(JSON.stringify({ logoUrl }));
  }
);
