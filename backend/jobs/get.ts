import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface JobRequest {
  jobId: string;
  employerId: string;
  jobType: "shift" | "general";
  jobTitle: string | null;
  location: string;
  shiftDate: string | null;
  shiftStartTime: string | null;
  shiftDurationHours: number | null;
  supportTypeTags: string[];
  clientNotes: string | null;
  genderPreference: "Male" | "Female" | "No preference" | null;
  ageRangePreference: string | null;
  behaviouralConsiderations: string | null;
  medicalRequirements: string | null;
  weekdayRate: number;
  weekendRate: number;
  publicHolidayRate: number;
  status: "Draft" | "Open" | "Closed" | "Cancelled";
  isEmergency: boolean;
  responseDeadline: Date | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetJobRequestParams {
  jobId: string;
}

export const getJobRequest = api<GetJobRequestParams, JobRequest>(
  { expose: true, auth: true, method: "GET", path: "/jobs/:jobId" },
  async ({ jobId }) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can access job requests");
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

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
      SELECT job_id, employer_id, job_type, job_title, location, shift_date::text, shift_start_time,
             shift_duration_hours, support_type_tags, client_notes, gender_preference,
             age_range_preference, behavioural_considerations, medical_requirements,
             weekday_rate, weekend_rate, public_holiday_rate, status,
             is_emergency, response_deadline, latitude, longitude, created_at, updated_at
      FROM job_requests
      WHERE job_id = ${jobId} AND employer_id = ${employer.employer_id}
    `;

    if (!row) throw APIError.notFound("job request not found");

    return mapRow(row);
  }
);

export function mapRow(row: {
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
}): JobRequest {
  return {
    jobId: row.job_id,
    employerId: row.employer_id,
    jobType: (row.job_type ?? "shift") as JobRequest["jobType"],
    jobTitle: row.job_title,
    location: row.location,
    shiftDate: row.shift_date,
    shiftStartTime: row.shift_start_time,
    shiftDurationHours: row.shift_duration_hours,
    supportTypeTags: row.support_type_tags ?? [],
    clientNotes: row.client_notes,
    genderPreference: row.gender_preference as JobRequest["genderPreference"],
    ageRangePreference: row.age_range_preference,
    behaviouralConsiderations: row.behavioural_considerations,
    medicalRequirements: row.medical_requirements,
    weekdayRate: row.weekday_rate,
    weekendRate: row.weekend_rate,
    publicHolidayRate: row.public_holiday_rate,
    status: row.status as JobRequest["status"],
    isEmergency: row.is_emergency,
    responseDeadline: row.response_deadline,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
