import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertSalesOrAdmin } from "./guard";
import { mapRow } from "../jobs/get";
import type { JobRequest } from "../jobs/get";

export interface ListEmployerJobsRequest {
  userId: string;
}

export interface ListEmployerJobsResponse {
  jobs: JobRequest[];
}

export const listEmployerJobs = api<ListEmployerJobsRequest, ListEmployerJobsResponse>(
  { expose: true, auth: true, method: "GET", path: "/sales/accounts/:userId/jobs" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${req.userId}
    `;

    if (!employer) return { jobs: [] };

    const rows = await db.queryAll<{
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
      SELECT job_id, employer_id, job_type, job_title, location, shift_date::text, shift_start_time,
             shift_duration_hours, support_type_tags, client_notes, gender_preference,
             age_range_preference, behavioural_considerations, medical_requirements,
             weekday_rate, weekend_rate, public_holiday_rate, status,
             is_emergency, response_deadline, latitude, longitude, created_at, updated_at
      FROM job_requests
      WHERE employer_id = ${employer.employer_id}
      ORDER BY created_at DESC
    `;

    return { jobs: rows.map(mapRow) };
  }
);
