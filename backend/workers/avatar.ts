import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { profilePhotosBucket } from "./storage";

export interface GetAvatarUploadUrlRequest {
  fileName: string;
}

export interface GetAvatarUploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
}

export interface AvatarResponse {
  avatarUrl: string | null;
}

export const getAvatarUploadUrl = api<GetAvatarUploadUrlRequest, GetAvatarUploadUrlResponse>(
  { expose: true, auth: true, method: "POST", path: "/workers/avatar/upload-url" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can access this endpoint");

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker not found");

    const ext = req.fileName.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileKey = `avatars/worker-${worker.worker_id}.${ext}`;
    const { url } = await profilePhotosBucket.signedUploadUrl(fileKey, { ttl: 3600 });
    return { uploadUrl: url, fileKey };
  }
);

export const confirmAvatarUpload = api<{ fileKey: string }, AvatarResponse>(
  { expose: true, auth: true, method: "POST", path: "/workers/avatar/confirm" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can access this endpoint");

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker not found");

    if (!req.fileKey.startsWith(`avatars/worker-${worker.worker_id}`)) {
      throw APIError.permissionDenied("invalid file key");
    }

    const exists = await profilePhotosBucket.exists(req.fileKey);
    if (!exists) throw APIError.failedPrecondition("file not found in storage; upload it first");

    const avatarUrl = profilePhotosBucket.publicUrl(req.fileKey);

    await db.exec`
      UPDATE workers SET avatar_url = ${avatarUrl}, updated_at = NOW()
      WHERE worker_id = ${worker.worker_id}
    `;

    return { avatarUrl };
  }
);

export const deleteWorkerAvatar = api<void, void>(
  { expose: true, auth: true, method: "DELETE", path: "/workers/avatar" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can access this endpoint");

    const row = await db.queryRow<{ worker_id: string; avatar_url: string | null }>`
      SELECT worker_id, avatar_url FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!row) throw APIError.notFound("worker not found");

    if (row.avatar_url) {
      const fileKey = row.avatar_url.split("/").slice(-2).join("/");
      try { await profilePhotosBucket.remove(fileKey); } catch { /* ignore */ }
    }

    await db.exec`
      UPDATE workers SET avatar_url = NULL, updated_at = NOW()
      WHERE worker_id = ${row.worker_id}
    `;
  }
);
