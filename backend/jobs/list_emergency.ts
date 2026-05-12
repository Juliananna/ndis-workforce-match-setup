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
      SELECT j.job_id, j.employer_id, j.job_type, j.job_title, j.location, j.shift_date::text, j.shift_start_time,
             j.shift_duration_hours, j.support_type_tags, j.client_notes, j.gender_preference,
             j.age_range_preference, j.behavioural_considerations, j.medical_requirements,
             j.weekday_rate, j.weekend_rate, j.public_holiday_rate, j.status,
             j.is_emergency, j.response_deadline, j.latitude, j.longitude, j.created_at, j.updated_at
      FROM job_requests j
      JOIN employers e ON e.employer_id = j.employer_id
      JOIN users u ON u.user_id = e.user_id
      WHERE j.is_emergency = TRUE
        AND j.status = 'Open'
        AND u.is_demo = FALSE
        AND (j.response_deadline IS NULL OR j.response_deadline > NOW())
      ORDER BY j.created_at DESC
      LIMIT 50
    `;

    return { jobs: rows.map(mapRow) };
  }
);
