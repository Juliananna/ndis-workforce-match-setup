import { useCallback } from "react";
import { useAuthedBackend } from "./useAuthedBackend";
import type { WorkerDocument } from "~backend/workers/documents";
import type { WorkerResume } from "~backend/workers/resume";

export function useProxyUpload() {
  const client = useAuthedBackend();

  const uploadDocument = useCallback(async (
    file: File,
    documentType: string,
    expiryDate?: string,
    title?: string,
  ): Promise<WorkerDocument> => {
    if (!client) throw new Error("Not authenticated");
    const query: Record<string, string> = { documentType, fileName: file.name };
    if (expiryDate) query.expiryDate = expiryDate;
    if (title) query.title = title;
    const resp = await client.uploads.uploadWorkerDocument({
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      query,
    });
    return resp.json() as Promise<WorkerDocument>;
  }, [client]);

  const uploadAvatar = useCallback(async (file: File): Promise<{ avatarUrl: string }> => {
    if (!client) throw new Error("Not authenticated");
    const resp = await client.uploads.uploadWorkerAvatar({
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      query: { fileName: file.name },
    });
    return resp.json() as Promise<{ avatarUrl: string }>;
  }, [client]);

  const uploadVideo = useCallback(async (file: File): Promise<{ videoUrl: string }> => {
    if (!client) throw new Error("Not authenticated");
    const resp = await client.uploads.uploadWorkerVideo({
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      query: { fileName: file.name },
    });
    return resp.json() as Promise<{ videoUrl: string }>;
  }, [client]);

  const uploadResume = useCallback(async (file: File): Promise<WorkerResume> => {
    if (!client) throw new Error("Not authenticated");
    const resp = await client.uploads.uploadWorkerResume({
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      query: { fileName: file.name },
    });
    return resp.json() as Promise<WorkerResume>;
  }, [client]);

  const uploadEmployerLogo = useCallback(async (file: File): Promise<{ logoUrl: string }> => {
    if (!client) throw new Error("Not authenticated");
    const resp = await client.uploads.uploadEmployerLogo({
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      query: { fileName: file.name },
    });
    return resp.json() as Promise<{ logoUrl: string }>;
  }, [client]);

  const uploadEmailImage = useCallback(async (file: File): Promise<{ imageUrl: string }> => {
    if (!client) throw new Error("Not authenticated");
    const resp = await client.uploads.uploadEmailImage({
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      query: { fileName: file.name },
    });
    return resp.json() as Promise<{ imageUrl: string }>;
  }, [client]);

  return { uploadDocument, uploadAvatar, uploadVideo, uploadResume, uploadEmployerLogo, uploadEmailImage };
}
