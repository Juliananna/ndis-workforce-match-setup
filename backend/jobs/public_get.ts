import { api, APIError } from "encore.dev/api";
import db from "../db";

export interface PublicJobDetails {
  jobId: string;
  jobType: "shift" | "general";
  jobTitle: string | null;
  location: string;
  shiftDate: string | null;
  shiftStartTime: string | null;
  shiftDurationHours: number | null;
  supportTypeTags: string[];
  genderPreference: "Male" | "Female" | "No preference" | null;
  ageRangePreference: string | null;
  weekdayRate: number;
  weekendRate: number;
  publicHolidayRate: number;
  isEmergency: boolean;
  responseDeadline: Date | null;
  organisationName: string;
  logoUrl: string | null;
  createdAt: Date;
}

export interface GetPublicJobParams {
  jobId: string;
}

export const getPublicJob = api<GetPublicJobParams, PublicJobDetails>(
  { expose: true, auth: false, method: "GET", path: "/jobs/public/:jobId" },
  async ({ jobId }) => {
    const row = await db.queryRow<{
      job_id: string;
      job_type: string;
      job_title: string | null;
      location: string;
      shift_date: string | null;
      shift_start_time: string | null;
      shift_duration_hours: number | null;
      support_type_tags: string[] | null;
      gender_preference: string | null;
      age_range_preference: string | null;
      weekday_rate: number;
      weekend_rate: number;
      public_holiday_rate: number;
      status: string;
      is_emergency: boolean;
      response_deadline: Date | null;
      organisation_name: string;
      logo_url: string | null;
      created_at: Date;
    }>`
      SELECT jr.job_id, jr.job_type, jr.job_title, jr.location,
             jr.shift_date::text AS shift_date, jr.shift_start_time,
             jr.shift_duration_hours, jr.support_type_tags, jr.gender_preference,
             jr.age_range_preference, jr.weekday_rate, jr.weekend_rate,
             jr.public_holiday_rate, jr.status, jr.is_emergency,
             jr.response_deadline, jr.created_at,
             e.organisation_name, e.logo_url
      FROM job_requests jr
      JOIN employers e ON e.employer_id = jr.employer_id
      WHERE jr.job_id = ${jobId}
        AND jr.status = 'Open'
    `;

    if (!row) throw APIError.notFound("job not found or not available");

    return {
      jobId: row.job_id,
      jobType: (row.job_type ?? "shift") as PublicJobDetails["jobType"],
      jobTitle: row.job_title,
      location: row.location,
      shiftDate: row.shift_date,
      shiftStartTime: row.shift_start_time,
      shiftDurationHours: row.shift_duration_hours,
      supportTypeTags: row.support_type_tags ?? [],
      genderPreference: row.gender_preference as PublicJobDetails["genderPreference"],
      ageRangePreference: row.age_range_preference,
      weekdayRate: row.weekday_rate,
      weekendRate: row.weekend_rate,
      publicHolidayRate: row.public_holiday_rate,
      isEmergency: row.is_emergency,
      responseDeadline: row.response_deadline,
      organisationName: row.organisation_name,
      logoUrl: row.logo_url,
      createdAt: row.created_at,
    };
  }
);
