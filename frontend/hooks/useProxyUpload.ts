import { useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { WorkerDocument } from "~backend/workers/documents";
import type { WorkerResume } from "~backend/workers/resume";
import backend from "~backend/client";

export function useProxyUpload() {
  const { token } = useAuth();

  const client = useMemo(() => {
    if (!token) return null;
    return backend.with({ auth: async () => ({ authorization: `Bearer ${token}` }) });
  }, [token]);

  async function doUpload(resp: Promise<Response>): Promise<unknown> {
    const r = await resp;
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(err.error ?? "Upload failed");
    }
    return r.json();
  }

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
    return doUpload(client.uploads.uploadWorkerDocument({
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      query,
    })) as Promise<WorkerDocument>;
  }, [client]);

  const uploadAvatar = useCallback(async (file: File): Promise<{ avatarUrl: string }> => {
    if (!client) throw new Error("Not authenticated");
    return doUpload(client.uploads.uploadWorkerAvatar({
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      query: { fileName: file.name },
    })) as Promise<{ avatarUrl: string }>;
  }, [client]);

  const uploadVideo = useCallback(async (file: File): Promise<{ videoUrl: string }> => {
    if (!client) throw new Error("Not authenticated");
    return doUpload(client.uploads.uploadWorkerVideo({
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      query: { fileName: file.name },
    })) as Promise<{ videoUrl: string }>;
  }, [client]);

  const uploadResume = useCallback(async (file: File): Promise<WorkerResume> => {
    if (!client) throw new Error("Not authenticated");
    return doUpload(client.uploads.uploadWorkerResume({
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      query: { fileName: file.name },
    })) as Promise<WorkerResume>;
  }, [client]);

  const uploadEmployerLogo = useCallback(async (file: File): Promise<{ logoUrl: string }> => {
    if (!client) throw new Error("Not authenticated");
    return doUpload(client.uploads.uploadEmployerLogo({
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      query: { fileName: file.name },
    })) as Promise<{ logoUrl: string }>;
  }, [client]);

  const uploadEmailImage = useCallback(async (file: File): Promise<{ imageUrl: string }> => {
    if (!client) throw new Error("Not authenticated");
    return doUpload(client.uploads.uploadEmailImage({
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
      query: { fileName: file.name },
    })) as Promise<{ imageUrl: string }>;
  }, [client]);

  return { uploadDocument, uploadAvatar, uploadVideo, uploadResume, uploadEmployerLogo, uploadEmailImage };
}
