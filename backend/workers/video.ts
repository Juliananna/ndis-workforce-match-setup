import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { workerVideosBucket } from "./storage";

export interface GetVideoUploadUrlRequest {
  fileName: string;
}

export interface GetVideoUploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
}

export interface ConfirmVideoUploadRequest {
  fileKey: string;
}

export interface WorkerVideoResponse {
  videoUrl: string | null;
}

// Returns a signed upload URL for the worker's intro video.
export const getVideoUploadUrl = api<GetVideoUploadUrlRequest, GetVideoUploadUrlResponse>(
  { expose: true, auth: true, method: "POST", path: "/workers/video/upload-url" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) {
      throw APIError.notFound("worker not found");
    }

    const ext = req.fileName.split(".").pop() ?? "mp4";
    const fileKey = `${worker.worker_id}/intro-video.${ext}`;

    const { url } = await workerVideosBucket.signedUploadUrl(fileKey, { ttl: 3600 });

    return { uploadUrl: url, fileKey };
  }
);

// Confirms and saves the intro video after upload.
export const confirmVideoUpload = api<ConfirmVideoUploadRequest, WorkerVideoResponse>(
  { expose: true, auth: true, method: "POST", path: "/workers/video/confirm" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) {
      throw APIError.notFound("worker not found");
    }

    if (!req.fileKey.startsWith(`${worker.worker_id}/`)) {
      throw APIError.permissionDenied("invalid file key");
    }

    const exists = await workerVideosBucket.exists(req.fileKey);
    if (!exists) {
      throw APIError.failedPrecondition("video file not found in storage; upload it first");
    }

    await db.exec`
      UPDATE workers SET intro_video_url = ${req.fileKey}, updated_at = NOW()
      WHERE worker_id = ${worker.worker_id}
    `;

    const { url: videoUrl } = await workerVideosBucket.signedDownloadUrl(req.fileKey, { ttl: 3600 });

    return { videoUrl };
  }
);

// Returns a signed playback URL for the authenticated worker's intro video.
export const getWorkerVideo = api<void, WorkerVideoResponse>(
  { expose: true, auth: true, method: "GET", path: "/workers/video" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const row = await db.queryRow<{ intro_video_url: string | null }>`
      SELECT intro_video_url FROM workers WHERE user_id = ${auth.userID}
    `;

    if (!row || !row.intro_video_url) {
      return { videoUrl: null };
    }

    const { url: videoUrl } = await workerVideosBucket.signedDownloadUrl(row.intro_video_url, { ttl: 3600 });

    return { videoUrl };
  }
);

// Removes the worker's intro video.
export const deleteWorkerVideo = api<void, void>(
  { expose: true, auth: true, method: "DELETE", path: "/workers/video" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const row = await db.queryRow<{ worker_id: string; intro_video_url: string | null }>`
      SELECT worker_id, intro_video_url FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!row) {
      throw APIError.notFound("worker not found");
    }

    if (row.intro_video_url) {
      try {
        await workerVideosBucket.remove(row.intro_video_url);
      } catch (e) {
        console.error("Failed to remove video from storage:", e);
      }
    }

    await db.exec`
      UPDATE workers SET intro_video_url = NULL, updated_at = NOW()
      WHERE worker_id = ${row.worker_id}
    `;
  }
);
