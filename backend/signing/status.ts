import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface NdisCocSigningStatus {
  status: "not_started" | "pending" | "sent" | "completed" | "declined" | "voided";
  signedAt: Date | null;
  documentUrl: string | null;
  envelopeId: string | null;
}

export const getNdisCocStatus = api<void, NdisCocSigningStatus>(
  { expose: true, auth: true, method: "GET", path: "/signing/ndis-coc/status" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const row = await db.queryRow<{
      status: string;
      signed_at: Date | null;
      document_url: string | null;
      annature_envelope_id: string;
    }>`
      SELECT status, signed_at, document_url, annature_envelope_id
      FROM ndis_conduct_signings
      WHERE worker_id = ${worker.worker_id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!row) {
      return { status: "not_started", signedAt: null, documentUrl: null, envelopeId: null };
    }

    return {
      status: row.status as NdisCocSigningStatus["status"],
      signedAt: row.signed_at,
      documentUrl: row.document_url,
      envelopeId: row.annature_envelope_id,
    };
  }
);
