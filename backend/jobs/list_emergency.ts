import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { JobRequest, mapRow } from "./get";

export interface ListEmergencyJobsResponse {
  jobs: JobRequest[];
}

export const listEmergencyJobs = api<void, ListEmergencyJobsResponse>(
  { expose: true, auth: true, method: "GET", path: "/jobs/emergency" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can browse emergency shifts");
    }

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
      WHERE is_emergency = TRUE
        AND status = 'Open'
        AND (response_deadline IS NULL OR response_deadline > NOW())
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return { jobs: rows.map(mapRow) };
  }
);
