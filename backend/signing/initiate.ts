import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { createAndSendEnvelope, getSigningUrl } from "./annature_client";
import { buildNdisCoCPdf } from "./ndis_coc_document";

export interface InitiateSigningRequest {
  redirectUrl?: string;
}

export interface InitiateSigningResponse {
  signingUrl: string;
  envelopeId: string;
  expiration: string;
  alreadySigned: boolean;
}

export const initiateNdisCocSigning = api<InitiateSigningRequest, InitiateSigningResponse>(
  { expose: true, auth: true, method: "POST", path: "/signing/ndis-coc/initiate" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can sign the NDIS Code of Conduct");
    }

    const worker = await db.queryRow<{
      worker_id: string;
      full_name: string | null;
      name: string;
    }>`
      SELECT w.worker_id, w.full_name, w.name
      FROM workers w
      WHERE w.user_id = ${auth.userID}
    `;

    if (!worker) throw APIError.notFound("worker profile not found");

    const user = await db.queryRow<{ email: string }>`
      SELECT email FROM users WHERE user_id = ${auth.userID}
    `;
    if (!user) throw APIError.notFound("user not found");

    const existing = await db.queryRow<{
      id: string;
      annature_envelope_id: string;
      annature_recipient_id: string;
      status: string;
    }>`
      SELECT id, annature_envelope_id, annature_recipient_id, status
      FROM ndis_conduct_signings
      WHERE worker_id = ${worker.worker_id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existing?.status === "completed") {
      return {
        signingUrl: "",
        envelopeId: existing.annature_envelope_id,
        expiration: "",
        alreadySigned: true,
      };
    }

    if (existing && (existing.status === "pending" || existing.status === "sent")) {
      const { url, expiration } = await getSigningUrl(existing.annature_recipient_id);
      return {
        signingUrl: url,
        envelopeId: existing.annature_envelope_id,
        expiration,
        alreadySigned: false,
      };
    }

    const workerName = worker.full_name || worker.name;
    const documentBase64 = buildNdisCoCPdf();
    const redirectUrl = req.redirectUrl || "https://ndis-workforce-match-setup-d6t4j0c82vjgmsb23vrg.lp.dev/dashboard";

    const { envelopeId, recipientId } = await createAndSendEnvelope({
      name: `NDIS Code of Conduct - ${workerName}`,
      workerName,
      workerEmail: user.email,
      documentBase64,
      redirectUrl,
    });

    await db.exec`
      INSERT INTO ndis_conduct_signings (worker_id, annature_envelope_id, annature_recipient_id, status)
      VALUES (${worker.worker_id}, ${envelopeId}, ${recipientId}, 'sent')
    `;

    const { url, expiration } = await getSigningUrl(recipientId);

    return {
      signingUrl: url,
      envelopeId,
      expiration,
      alreadySigned: false,
    };
  }
);
