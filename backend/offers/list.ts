import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { mapOfferRow } from "./helpers";
import type { Offer, OfferStatus } from "./types";

export interface ListOffersRequest {
  status?: OfferStatus;
}

export interface ListOffersResponse {
  offers: Offer[];
}

export const listOffers = api<ListOffersRequest, ListOffersResponse>(
  { expose: true, auth: true, method: "GET", path: "/offers" },
  async (req) => {
    const auth = getAuthData()!;

    type OfferRow = {
      offer_id: string;
      job_id: string;
      employer_id: string;
      worker_id: string;
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
    };

    const offers: Offer[] = [];

    if (auth.role === "EMPLOYER") {
      const employer = await db.queryRow<{ employer_id: string }>`
        SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
      `;
      if (!employer) throw APIError.notFound("employer profile not found");

      let rows;
      if (req.status) {
        rows = db.query<OfferRow>`
          SELECT offer_id, job_id, employer_id, worker_id,
            snapshot_location, snapshot_shift_date::text, snapshot_shift_start_time, snapshot_shift_duration_hours,
            snapshot_support_type_tags, snapshot_client_notes, snapshot_behavioural_considerations, snapshot_medical_requirements,
            offered_rate, negotiated_rate, latest_proposed_by, status, additional_notes, created_at, updated_at
          FROM offers
          WHERE employer_id = ${employer.employer_id} AND status = ${req.status}
          ORDER BY created_at DESC
        `;
      } else {
        rows = db.query<OfferRow>`
          SELECT offer_id, job_id, employer_id, worker_id,
            snapshot_location, snapshot_shift_date::text, snapshot_shift_start_time, snapshot_shift_duration_hours,
            snapshot_support_type_tags, snapshot_client_notes, snapshot_behavioural_considerations, snapshot_medical_requirements,
            offered_rate, negotiated_rate, latest_proposed_by, status, additional_notes, created_at, updated_at
          FROM offers
          WHERE employer_id = ${employer.employer_id}
          ORDER BY created_at DESC
        `;
      }
      for await (const row of rows) {
        offers.push(mapOfferRow(row));
      }
    } else if (auth.role === "WORKER") {
      const worker = await db.queryRow<{ worker_id: string }>`
        SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
      `;
      if (!worker) throw APIError.notFound("worker profile not found");

      let rows;
      if (req.status) {
        rows = db.query<OfferRow>`
          SELECT offer_id, job_id, employer_id, worker_id,
            snapshot_location, snapshot_shift_date::text, snapshot_shift_start_time, snapshot_shift_duration_hours,
            snapshot_support_type_tags, snapshot_client_notes, snapshot_behavioural_considerations, snapshot_medical_requirements,
            offered_rate, negotiated_rate, latest_proposed_by, status, additional_notes, created_at, updated_at
          FROM offers
          WHERE worker_id = ${worker.worker_id} AND status = ${req.status}
          ORDER BY created_at DESC
        `;
      } else {
        rows = db.query<OfferRow>`
          SELECT offer_id, job_id, employer_id, worker_id,
            snapshot_location, snapshot_shift_date::text, snapshot_shift_start_time, snapshot_shift_duration_hours,
            snapshot_support_type_tags, snapshot_client_notes, snapshot_behavioural_considerations, snapshot_medical_requirements,
            offered_rate, negotiated_rate, latest_proposed_by, status, additional_notes, created_at, updated_at
          FROM offers
          WHERE worker_id = ${worker.worker_id}
          ORDER BY created_at DESC
        `;
      }
      for await (const row of rows) {
        offers.push(mapOfferRow(row));
      }
    } else {
      throw APIError.permissionDenied("not authorized");
    }

    return { offers };
  }
);
