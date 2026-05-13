import { api } from "encore.dev/api";
import db from "../db";

interface AnnatureWebhookPayload {
  event: string;
  envelope_id?: string;
  recipient_id?: string;
  completed?: string;
  master?: string;
  certificate?: string;
  combined?: string;
}

export const annatureWebhook = api.raw(
  { expose: true, method: "POST", path: "/signing/annature/webhook" },
  async (req, resp) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const rawBody = Buffer.concat(chunks).toString("utf8");

    let payload: AnnatureWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      resp.writeHead(400);
      resp.end("invalid JSON");
      return;
    }

    if (payload.event === "envelope_completed" && payload.envelope_id) {
      await db.exec`
        UPDATE ndis_conduct_signings
        SET
          status = 'completed',
          signed_at = NOW(),
          document_url = ${payload.combined ?? payload.master ?? null},
          updated_at = NOW()
        WHERE annature_envelope_id = ${payload.envelope_id}
      `;

      const signing = await db.queryRow<{ worker_id: string }>`
        SELECT worker_id FROM ndis_conduct_signings
        WHERE annature_envelope_id = ${payload.envelope_id}
      `;

      if (signing) {
        const existing = await db.queryRow<{ id: string }>`
          SELECT id FROM worker_documents
          WHERE worker_id = ${signing.worker_id}
            AND document_type = 'NDIS Code of Conduct acknowledgement'
          LIMIT 1
        `;

        if (!existing) {
          const fileKey = `ndis-coc-signed/${signing.worker_id}/${payload.envelope_id}.pdf`;
          await db.exec`
            INSERT INTO worker_documents
              (worker_id, document_type, title, file_key, verification_status, is_demo_url)
            VALUES
              (${signing.worker_id}, 'NDIS Code of Conduct acknowledgement',
               'NDIS Code of Conduct (Signed)', ${payload.combined ?? payload.master ?? fileKey},
               'Verified', TRUE)
          `;
        } else {
          await db.exec`
            UPDATE worker_documents
            SET
              verification_status = 'Verified',
              file_key = ${payload.combined ?? payload.master ?? existing.id},
              is_demo_url = TRUE,
              updated_at = NOW()
            WHERE id = ${existing.id}
          `;
        }
      }
    }

    if (payload.event === "recipient_completed" && payload.envelope_id) {
      await db.exec`
        UPDATE ndis_conduct_signings
        SET status = 'completed', signed_at = NOW(), updated_at = NOW()
        WHERE annature_envelope_id = ${payload.envelope_id}
          AND status != 'completed'
      `;
    }

    if (payload.event === "envelope_voided" && payload.envelope_id) {
      await db.exec`
        UPDATE ndis_conduct_signings
        SET status = 'voided', updated_at = NOW()
        WHERE annature_envelope_id = ${payload.envelope_id}
      `;
    }

    if (payload.event === "recipient_declined" && payload.envelope_id) {
      await db.exec`
        UPDATE ndis_conduct_signings
        SET status = 'declined', updated_at = NOW()
        WHERE annature_envelope_id = ${payload.envelope_id}
      `;
    }

    resp.writeHead(200);
    resp.end("ok");
  }
);
