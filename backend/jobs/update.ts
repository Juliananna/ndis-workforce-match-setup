import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { SUPPORT_TYPE_TAGS } from "./tags";
import { JobRequest, mapRow } from "./get";

export interface UpdateJobRequestParams {
  jobId: string;
}

export interface UpdateJobRequestRequest {
  jobId: string;
  jobTitle?: string;
  location?: string;
  shiftDate?: string;
  shiftStartTime?: string;
  shiftDurationHours?: number;
  supportTypeTags?: string[];
  clientNotes?: string;
  genderPreference?: "Male" | "Female" | "No preference";
  ageRangePreference?: string;
  behaviouralConsiderations?: string;
  medicalRequirements?: string;
  weekdayRate?: number;
  weekendRate?: number;
  publicHolidayRate?: number;
  status?: "Draft" | "Open" | "Closed" | "Cancelled";
  isEmergency?: boolean;
  responseDeadline?: string;
  latitude?: number;
  longitude?: number;
}

export const updateJobRequest = api<UpdateJobRequestRequest, JobRequest>(
  { expose: true, auth: true, method: "PUT", path: "/jobs/:jobId" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can update job requests");
    }

    if (req.shiftDate !== undefined && req.shiftDate && !/^\d{4}-\d{2}-\d{2}$/.test(req.shiftDate)) {
      throw APIError.invalidArgument("shiftDate must be YYYY-MM-DD");
    }
    if (req.shiftStartTime !== undefined && req.shiftStartTime && !/^\d{2}:\d{2}$/.test(req.shiftStartTime)) {
      throw APIError.invalidArgument("shiftStartTime must be HH:MM");
    }
    if (req.shiftDurationHours !== undefined && req.shiftDurationHours !== null && (req.shiftDurationHours <= 0 || req.shiftDurationHours > 24)) {
      throw APIError.invalidArgument("shiftDurationHours must be between 0 and 24");
    }
    if (req.weekdayRate !== undefined && req.weekdayRate < 0) throw APIError.invalidArgument("weekdayRate must be non-negative");
    if (req.weekendRate !== undefined && req.weekendRate < 0) throw APIError.invalidArgument("weekendRate must be non-negative");
    if (req.publicHolidayRate !== undefined && req.publicHolidayRate < 0) throw APIError.invalidArgument("publicHolidayRate must be non-negative");

    if (req.supportTypeTags !== undefined) {
      const validTags = new Set<string>(SUPPORT_TYPE_TAGS);
      for (const tag of req.supportTypeTags) {
        if (!validTags.has(tag)) throw APIError.invalidArgument(`invalid support type tag: ${tag}`);
      }
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
      throw APIError.failedPrecondition(`cannot edit a job request with status: ${existing.status}`);
    }

    const tags = req.supportTypeTags ?? null;

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
      SET
        job_title = COALESCE(${req.jobTitle ?? null}, job_title),
        location = COALESCE(${req.location ?? null}, location),
        shift_date = COALESCE(${req.shiftDate ?? null}::date, shift_date),
        shift_start_time = COALESCE(${req.shiftStartTime ?? null}, shift_start_time),
        shift_duration_hours = COALESCE(${req.shiftDurationHours ?? null}, shift_duration_hours),
        support_type_tags = COALESCE(${tags}, support_type_tags),
        client_notes = COALESCE(${req.clientNotes ?? null}, client_notes),
        gender_preference = COALESCE(${req.genderPreference ?? null}, gender_preference),
        age_range_preference = COALESCE(${req.ageRangePreference ?? null}, age_range_preference),
        behavioural_considerations = COALESCE(${req.behaviouralConsiderations ?? null}, behavioural_considerations),
        medical_requirements = COALESCE(${req.medicalRequirements ?? null}, medical_requirements),
        weekday_rate = COALESCE(${req.weekdayRate ?? null}, weekday_rate),
        weekend_rate = COALESCE(${req.weekendRate ?? null}, weekend_rate),
        public_holiday_rate = COALESCE(${req.publicHolidayRate ?? null}, public_holiday_rate),
        status = COALESCE(${req.status ?? null}, status),
        is_emergency = COALESCE(${req.isEmergency ?? null}, is_emergency),
        response_deadline = COALESCE(${req.responseDeadline ? new Date(req.responseDeadline) : null}, response_deadline),
        latitude = COALESCE(${req.latitude ?? null}, latitude),
        longitude = COALESCE(${req.longitude ?? null}, longitude),
        updated_at = NOW()
      WHERE job_id = ${req.jobId} AND employer_id = ${employer.employer_id}
      RETURNING job_id, employer_id, job_type, job_title, location, shift_date::text, shift_start_time,
                shift_duration_hours, support_type_tags, client_notes, gender_preference,
                age_range_preference, behavioural_considerations, medical_requirements,
                weekday_rate, weekend_rate, public_holiday_rate, status,
                is_emergency, response_deadline, latitude, longitude, created_at, updated_at
    `;

    if (!row) throw APIError.internal("failed to update job request");

    return mapRow(row);
  }
);
