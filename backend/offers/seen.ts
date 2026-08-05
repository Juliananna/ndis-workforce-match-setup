import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface MarkSeenParams {
  offerId: string;
}

export interface MarkSeenResponse {
  seenAt: Date;
}

export const markOfferSeen = api<MarkSeenParams, MarkSeenResponse>(
  { expose: true, auth: true, method: "POST", path: "/offers/:offerId/seen" },
  async ({ offerId }) => {
    const auth = getAuthData()!;

    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can mark offers as seen");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const row = await db.queryRow<{ seen_at: Date }>`
      UPDATE offers
      SET seen_at = COALESCE(seen_at, NOW())
      WHERE offer_id = ${offerId} AND worker_id = ${worker.worker_id}
      RETURNING seen_at
    `;

    if (!row) throw APIError.notFound("offer not found");

    return { seenAt: row.seen_at };
  }
);
