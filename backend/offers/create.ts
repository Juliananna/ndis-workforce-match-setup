import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { mapOfferRow } from "./helpers";
import type { Offer } from "./types";
import { offerEmailTopic } from "./topic";

export interface CreateOfferRequest {
  jobId: string;
  workerId: string;
  offeredRate: number;
  additionalNotes?: string;
}

export const createOffer = api<CreateOfferRequest, Offer>(
  { expose: true, auth: true, method: "POST", path: "/offers" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can create offers");
    }
    if (!req.jobId?.trim()) throw APIError.invalidArgument("jobId is required");
    if (!req.workerId?.trim()) throw APIError.invalidArgument("workerId is required");
    if (req.offeredRate == null || req.offeredRate < 0) throw APIError.invalidArgument("offeredRate must be non-negative");

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const job = await db.queryRow<{
      job_id: string;
      employer_id: string;
      location: string;
      shift_date: string;
      shift_start_time: string;
      shift_duration_hours: number;
      support_type_tags: string[] | null;
      client_notes: string | null;
      behavioural_considerations: string | null;
      medical_requirements: string | null;
      status: string;
    }>`
      SELECT job_id, employer_id, location, shift_date::text, shift_start_time,
             shift_duration_hours, support_type_tags, client_notes,
             behavioural_considerations, medical_requirements, status
      FROM job_requests
      WHERE job_id = ${req.jobId} AND employer_id = ${employer.employer_id}
    `;
    if (!job) throw APIError.notFound("job request not found or not owned by this employer");
    if (job.status === "Cancelled") throw APIError.failedPrecondition("cannot send offer for a cancelled job");

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE worker_id = ${req.workerId}
    `;
    if (!worker) throw APIError.notFound("worker not found");

    const existing = await db.queryRow<{ offer_id: string }>`
      SELECT offer_id FROM offers
      WHERE job_id = ${req.jobId} AND worker_id = ${req.workerId}
        AND status NOT IN ('Declined', 'Cancelled')
    `;
    if (existing) throw APIError.alreadyExists("an active offer already exists for this worker on this job");

    const tags = job.support_type_tags ?? [];
    const row = await db.queryRow<{
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
    }>`
      INSERT INTO offers (
        job_id, employer_id, worker_id,
        snapshot_location, snapshot_shift_date, snapshot_shift_start_time, snapshot_shift_duration_hours,
        snapshot_support_type_tags, snapshot_client_notes, snapshot_behavioural_considerations, snapshot_medical_requirements,
        offered_rate, latest_proposed_by, status, additional_notes
      ) VALUES (
        ${req.jobId}, ${employer.employer_id}, ${req.workerId},
        ${job.location}, ${job.shift_date}::date, ${job.shift_start_time}, ${job.shift_duration_hours},
        ${tags}, ${job.client_notes ?? null}, ${job.behavioural_considerations ?? null}, ${job.medical_requirements ?? null},
        ${req.offeredRate}, 'EMPLOYER', 'Pending', ${req.additionalNotes ?? null}
      )
      RETURNING offer_id, job_id, employer_id, worker_id,
        snapshot_location, snapshot_shift_date::text, snapshot_shift_start_time, snapshot_shift_duration_hours,
        snapshot_support_type_tags, snapshot_client_notes, snapshot_behavioural_considerations, snapshot_medical_requirements,
        offered_rate, negotiated_rate, latest_proposed_by, status, additional_notes, created_at, updated_at
    `;
    if (!row) throw APIError.internal("failed to create offer");

    await db.exec`
      INSERT INTO offer_negotiation_events (offer_id, actor, event_type, rate, note)
      VALUES (${row.offer_id}, 'EMPLOYER', 'OFFER_SENT', ${req.offeredRate}, ${req.additionalNotes ?? null})
    `;

    const workerUser = await db.queryRow<{ user_id: string }>`
      SELECT user_id FROM workers WHERE worker_id = ${req.workerId}
    `;
    if (workerUser) {
      await offerEmailTopic.publish({
        eventType: "OFFER_RECEIVED",
        offerId: row.offer_id,
        jobId: row.job_id,
        recipientUserId: workerUser.user_id,
        recipientRole: "WORKER",
        location: row.snapshot_location,
        shiftDate: row.snapshot_shift_date,
        shiftStartTime: row.snapshot_shift_start_time,
        offeredRate: row.offered_rate,
        notes: row.additional_notes ?? undefined,
      });
    }

    return mapOfferRow(row);
  }
);
