import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { JobRequest, mapRow } from "./get";

export interface CancelJobRequestRequest {
  jobId: string;
}

export const cancelJobRequest = api<CancelJobRequestRequest, JobRequest>(
  { expose: true, auth: true, method: "POST", path: "/jobs/:jobId/cancel" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can cancel job requests");
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const existing = await db.queryRow<{ status: string }>`
      SELECT status FROM job_requests WHERE job_id = ${req.jobId} AND employer_id = ${employer.employer_id}
    `;
    if (!existing) throw APIError.notFound("job request not found");

    if (existing.status === "Closed" || existing.status === "Cancelled") {
      throw APIError.failedPrecondition(`job request is already ${existing.status}`);
    }

    const row = await db.queryRow<{
      job_id: string;
      employer_id: string;
      job_type: string;
      job_title: string | null;
      location: string;
      shift_date: string | null;
      shift_start_time: string | null;
      shift_duration_hours: number | null;
      support_type_tags: string[] | null;
      client_notes: string | null;
      gender_preference: string | null;
      age_range_preference: string | null;
      behavioural_considerations: string | null;
      medical_requirements: string | null;
      weekday_rate: number;
      weekend_rate: number;
      public_holiday_rate: number;
      status: string;
      is_emergency: boolean;
      response_deadline: Date | null;
      latitude: number | null;
      longitude: number | null;
      created_at: Date;
      updated_at: Date;
    }>`
      UPDATE job_requests
      SET status = 'Cancelled', updated_at = NOW()
      WHERE job_id = ${req.jobId} AND employer_id = ${employer.employer_id}
      RETURNING job_id, employer_id, job_type, job_title, location, shift_date::text, shift_start_time,
                shift_duration_hours, support_type_tags, client_notes, gender_preference,
                age_range_preference, behavioural_considerations, medical_requirements,
                weekday_rate, weekend_rate, public_holiday_rate, status,
                is_emergency, response_deadline, latitude, longitude, created_at, updated_at
    `;

    if (!row) throw APIError.internal("failed to cancel job request");

    return mapRow(row);
  }
);
