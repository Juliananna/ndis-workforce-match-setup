import { useCallback } from "react";
import { useAuthedBackend } from "./useAuthedBackend";
import type { WorkerDocument } from "~backend/workers/documents";
import type { WorkerResume } from "~backend/workers/resume";

export function useProxyUpload() {
  const client = useAuthedBackend();

  async function putToSignedUrl(uploadUrl: string, file: File): Promise<void> {
    const resp = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Storage upload failed (${resp.status})${text ? ": " + text : ""}`);
    }
  }

  const uploadDocument = useCallback(async (
    file: File,
    documentType: string,
    expiryDate?: string,
    title?: string,
  ): Promise<WorkerDocument> => {
    if (!client) throw new Error("Not authenticated");
    const { uploadUrl, fileKey } = await client.workers.getDocumentUploadUrl({
      fileName: file.name,
      documentType,
      expiryDate,
    });
    await putToSignedUrl(uploadUrl, file);
    return client.workers.confirmDocumentUpload({ fileKey, documentType, expiryDate, title });
  }, [client]);

  const uploadAvatar = useCallback(async (file: File): Promise<{ avatarUrl: string }> => {
    if (!client) throw new Error("Not authenticated");
    const { uploadUrl, fileKey } = await client.workers.getAvatarUploadUrl({ fileName: file.name });
    await putToSignedUrl(uploadUrl, file);
    const { avatarUrl } = await client.workers.confirmAvatarUpload({ fileKey });
    return { avatarUrl: avatarUrl ?? "" };
  }, [client]);

  const uploadVideo = useCallback(async (file: File): Promise<{ videoUrl: string }> => {
    if (!client) throw new Error("Not authenticated");
    const { uploadUrl, fileKey } = await client.workers.getVideoUploadUrl({ fileName: file.name });
    await putToSignedUrl(uploadUrl, file);
    const { videoUrl } = await client.workers.confirmVideoUpload({ fileKey });
    return { videoUrl: videoUrl ?? "" };
  }, [client]);

  const uploadResume = useCallback(async (file: File): Promise<WorkerResume> => {
    if (!client) throw new Error("Not authenticated");
    const { uploadUrl, fileKey } = await client.workers.getResumeUploadUrl({ fileName: file.name });
    await putToSignedUrl(uploadUrl, file);
    return client.workers.confirmResumeUpload({ fileKey, fileName: file.name });
  }, [client]);

  const uploadEmployerLogo = useCallback(async (file: File): Promise<{ logoUrl: string }> => {
    if (!client) throw new Error("Not authenticated");
    const { uploadUrl, fileKey } = await client.employers.getLogoUploadUrl({ fileName: file.name });
    await putToSignedUrl(uploadUrl, file);
    const { logoUrl } = await client.employers.confirmLogoUpload({ fileKey });
    return { logoUrl: logoUrl ?? "" };
  }, [client]);

  const uploadEmailImage = useCallback(async (file: File): Promise<{ imageUrl: string }> => {
    if (!client) throw new Error("Not authenticated");
    const resp = await client.uploads.uploadEmailImage({
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      query: { fileName: file.name },
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Upload failed" }));
      throw new Error((err as { error?: string }).error ?? "Upload failed");
    }
    return resp.json() as Promise<{ imageUrl: string }>;
  }, [client]);

  return { uploadDocument, uploadAvatar, uploadVideo, uploadResume, uploadEmployerLogo, uploadEmailImage };
}
