import { api, APIError } from "encore.dev/api";
import db from "../db";
import { profilePhotosBucket } from "../workers/storage";

interface GetSessionPhotoUploadUrlRequest {
  id: string;
  fileName: string;
}

interface GetSessionPhotoUploadUrlResponse {
  uploadUrl: string;
  photoKey: string;
}

interface ConfirmSessionPhotoRequest {
  id: string;
  photoKey: string;
}

interface ConfirmSessionPhotoResponse {
  photoUrl: string;
}

export const getSessionPhotoUploadUrl = api<GetSessionPhotoUploadUrlRequest, GetSessionPhotoUploadUrlResponse>(
  { expose: true, method: "POST", path: "/resume-sessions/:id/photo-upload-url" },
  async (req) => {
    const session = await db.queryRow<{ id: string }>`SELECT id FROM resume_sessions WHERE id = ${req.id}`;
    if (!session) throw APIError.notFound("session not found");

    const ext = req.fileName.split(".").pop()?.toLowerCase() ?? "jpg";
    const photoKey = `resume-photos/${req.id}.${ext}`;
    const { url } = await profilePhotosBucket.signedUploadUrl(photoKey, { ttl: 3600 });
    return { uploadUrl: url, photoKey };
  }
);

export const confirmSessionPhoto = api<ConfirmSessionPhotoRequest, ConfirmSessionPhotoResponse>(
  { expose: true, method: "POST", path: "/resume-sessions/:id/photo-confirm" },
  async (req) => {
    const session = await db.queryRow<{ id: string }>`SELECT id FROM resume_sessions WHERE id = ${req.id}`;
    if (!session) throw APIError.notFound("session not found");

    if (!req.photoKey.startsWith(`resume-photos/${req.id}`)) {
      throw APIError.permissionDenied("invalid photo key");
    }

    const exists = await profilePhotosBucket.exists(req.photoKey);
    if (!exists) throw APIError.failedPrecondition("photo not found in storage; upload it first");

    await db.exec`UPDATE resume_sessions SET photo_key = ${req.photoKey}, updated_at = NOW() WHERE id = ${req.id}`;

    const photoUrl = profilePhotosBucket.publicUrl(req.photoKey);
    return { photoUrl };
  }
);
