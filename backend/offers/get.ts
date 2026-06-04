import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { mapOfferRow, getOfferHistory } from "./helpers";
import type { Offer } from "./types";

export interface GetOfferParams {
  offerId: string;
}

export const getOffer = api<GetOfferParams, Offer>(
  { expose: true, auth: true, method: "GET", path: "/offers/:offerId" },
  async ({ offerId }) => {
    const auth = getAuthData()!;

    const row = await db.queryRow<{
      offer_id: string;
      job_id: string;
      employer_id: string;
      worker_id: string;
      worker_name: string | null;
      snapshot_location: string;
      snapshot_shift_date: string;
      snapshot_shift_start_time: string;
      snapshot_shift_duration_hours: number;
      snapshot_support_type_tags: string[] | null;
      snapshot_client_notes: string | null;
      snapshot_behavioural_considerations: string | null;
      snapshot_medical_requirements: string | null;
      offered_rate: number;
      negotiated_rate: number | null;
      latest_proposed_by: string | null;
      status: string;
      additional_notes: string | null;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT o.offer_id, o.job_id, o.employer_id, o.worker_id,
        CONCAT(u.first_name, ' ', u.last_name) AS worker_name,
        o.snapshot_location, o.snapshot_shift_date::text, o.snapshot_shift_start_time, o.snapshot_shift_duration_hours,
        o.snapshot_support_type_tags, o.snapshot_client_notes, o.snapshot_behavioural_considerations, o.snapshot_medical_requirements,
        o.offered_rate, o.negotiated_rate, o.latest_proposed_by, o.status, o.additional_notes, o.created_at, o.updated_at
      FROM offers o
      JOIN workers w ON w.worker_id = o.worker_id
      JOIN users u ON u.user_id = w.user_id
      WHERE o.offer_id = ${offerId}
    `;
    if (!row) throw APIError.notFound("offer not found");

    if (auth.role === "EMPLOYER") {
      const employer = await db.queryRow<{ employer_id: string }>`
        SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
      `;
      if (!employer || employer.employer_id !== row.employer_id) {
        throw APIError.permissionDenied("not authorized to view this offer");
      }
    } else if (auth.role === "WORKER") {
      const worker = await db.queryRow<{ worker_id: string }>`
        SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
      `;
      if (!worker || worker.worker_id !== row.worker_id) {
        throw APIError.permissionDenied("not authorized to view this offer");
      }
    } else {
      throw APIError.permissionDenied("not authorized");
    }

    const offer = mapOfferRow(row);
    offer.history = await getOfferHistory(offerId);
    return offer;
  }
);
