import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { profilePhotosBucket } from "../workers/storage";

export interface GetLogoUploadUrlRequest {
  fileName: string;
}

export interface GetLogoUploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
}

export interface LogoResponse {
  logoUrl: string | null;
}

export const getLogoUploadUrl = api<GetLogoUploadUrlRequest, GetLogoUploadUrlResponse>(
  { expose: true, auth: true, method: "POST", path: "/employers/logo/upload-url" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") throw APIError.permissionDenied("only employers can access this endpoint");

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer not found");

    const ext = req.fileName.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileKey = `logos/employer-${employer.employer_id}.${ext}`;
    const { url } = await profilePhotosBucket.signedUploadUrl(fileKey, { ttl: 3600 });
    return { uploadUrl: url, fileKey };
  }
);

export const confirmLogoUpload = api<{ fileKey: string }, LogoResponse>(
  { expose: true, auth: true, method: "POST", path: "/employers/logo/confirm" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") throw APIError.permissionDenied("only employers can access this endpoint");

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer not found");

    if (!req.fileKey.startsWith(`logos/employer-${employer.employer_id}`)) {
      throw APIError.permissionDenied("invalid file key");
    }

    const exists = await profilePhotosBucket.exists(req.fileKey);
    if (!exists) throw APIError.failedPrecondition("file not found in storage; upload it first");

    const logoUrl = profilePhotosBucket.publicUrl(req.fileKey);

    await db.exec`
      UPDATE employers SET logo_url = ${logoUrl}, updated_at = NOW()
      WHERE employer_id = ${employer.employer_id}
    `;

    return { logoUrl };
  }
);

export const deleteEmployerLogo = api<void, void>(
  { expose: true, auth: true, method: "DELETE", path: "/employers/logo" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") throw APIError.permissionDenied("only employers can access this endpoint");

    const row = await db.queryRow<{ employer_id: string; logo_url: string | null }>`
      SELECT employer_id, logo_url FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!row) throw APIError.notFound("employer not found");

    if (row.logo_url) {
      const parts = row.logo_url.split("/");
      const fileKey = parts.slice(-2).join("/");
      try { await profilePhotosBucket.remove(fileKey); } catch { /* ignore */ }
    }

    await db.exec`
      UPDATE employers SET logo_url = NULL, updated_at = NOW()
      WHERE employer_id = ${row.employer_id}
    `;
  }
);
