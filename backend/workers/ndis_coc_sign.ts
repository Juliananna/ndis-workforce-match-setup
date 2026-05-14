import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface SignNdisCocRequest {
  signatureDataUrl: string;
}

export interface SignNdisCocResponse {
  signedAt: Date;
}

export interface NdisCocStatusResponse {
  signed: boolean;
  signedAt: Date | null;
}

export const signNdisCoc = api<SignNdisCocRequest, SignNdisCocResponse>(
  { expose: true, auth: true, method: "POST", path: "/workers/ndis-coc/sign" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("workers only");

    if (!req.signatureDataUrl?.startsWith("data:image/png;base64,")) {
      throw APIError.invalidArgument("invalid signature data");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker not found");

    const row = await db.queryRow<{ signed_at: Date }>`
      INSERT INTO ndis_conduct_signings (worker_id, signature_data_url)
      VALUES (${worker.worker_id}, ${req.signatureDataUrl})
      ON CONFLICT (worker_id) DO UPDATE
        SET signature_data_url = EXCLUDED.signature_data_url,
            signed_at = NOW()
      RETURNING signed_at
    `;

    const existing = await db.queryRow<{ id: string }>`
      SELECT id FROM worker_documents
      WHERE worker_id = ${worker.worker_id}
        AND document_type = 'NDIS Code of Conduct acknowledgement'
      LIMIT 1
    `;

    const fileKey = `ndis-coc-signed/${worker.worker_id}`;

    if (!existing) {
      await db.exec`
        INSERT INTO worker_documents
          (worker_id, document_type, title, file_key, verification_status, is_demo_url)
        VALUES
          (${worker.worker_id}, 'NDIS Code of Conduct acknowledgement',
           'NDIS Code of Conduct (Signed)', ${fileKey}, 'Verified', TRUE)
      `;
    } else {
      await db.exec`
        UPDATE worker_documents
        SET verification_status = 'Verified', updated_at = NOW()
        WHERE id = ${existing.id}
      `;
    }

    return { signedAt: row!.signed_at };
  }
);

export const getNdisCocStatus = api<void, NdisCocStatusResponse>(
  { expose: true, auth: true, method: "GET", path: "/workers/ndis-coc/status" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("workers only");

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker not found");

    const row = await db.queryRow<{ signed_at: Date }>`
      SELECT signed_at FROM ndis_conduct_signings WHERE worker_id = ${worker.worker_id}
    `;

    return { signed: !!row, signedAt: row?.signed_at ?? null };
  }
);
