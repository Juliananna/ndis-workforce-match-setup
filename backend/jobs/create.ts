import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { SUPPORT_TYPE_TAGS } from "./tags";
import { JobRequest, mapRow } from "./get";
import { requireEmployerSubscription } from "../employers/subscription_guard";

export interface CreateJobRequestRequest {
  jobType?: "shift" | "general";
  jobTitle?: string;
  location: string;
  shiftDate?: string;
  shiftStartTime?: string;
  shiftDurationHours?: number;
  supportTypeTags: string[];
  clientNotes?: string;
  genderPreference?: "Male" | "Female" | "No preference";
  ageRangePreference?: string;
  behaviouralConsiderations?: string;
  medicalRequirements?: string;
  weekdayRate: number;
  weekendRate: number;
  publicHolidayRate: number;
  status?: "Draft" | "Open";
  isEmergency?: boolean;
  responseDeadline?: string;
  latitude?: number;
  longitude?: number;
}

export const createJobRequest = api<CreateJobRequestRequest, JobRequest>(
  { expose: true, auth: true, method: "POST", path: "/jobs" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can create job requests");
    }

    if (!req.location?.trim()) throw APIError.invalidArgument("location is required");

    const jobType = req.jobType ?? "shift";

    if (jobType === "shift") {
      if (!req.shiftDate?.trim()) throw APIError.invalidArgument("shiftDate is required for shift jobs");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(req.shiftDate)) throw APIError.invalidArgument("shiftDate must be YYYY-MM-DD");
      if (!req.shiftStartTime?.trim()) throw APIError.invalidArgument("shiftStartTime is required for shift jobs");
      if (!/^\d{2}:\d{2}$/.test(req.shiftStartTime)) throw APIError.invalidArgument("shiftStartTime must be HH:MM");
      if (!req.shiftDurationHours || req.shiftDurationHours <= 0) throw APIError.invalidArgument("shiftDurationHours must be positive");
      if (req.shiftDurationHours > 24) throw APIError.invalidArgument("shiftDurationHours cannot exceed 24");
    }

    if (!req.supportTypeTags || req.supportTypeTags.length === 0) throw APIError.invalidArgument("at least one supportTypeTag is required");

    const validTags = new Set<string>(SUPPORT_TYPE_TAGS);
    for (const tag of req.supportTypeTags) {
      if (!validTags.has(tag)) throw APIError.invalidArgument(`invalid support type tag: ${tag}`);
    }

    if (req.weekdayRate < 0) throw APIError.invalidArgument("weekdayRate must be non-negative");
    if (req.weekendRate < 0) throw APIError.invalidArgument("weekendRate must be non-negative");
    if (req.publicHolidayRate < 0) throw APIError.invalidArgument("publicHolidayRate must be non-negative");

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    await requireEmployerSubscription(auth.userID);

    const status = req.status ?? "Draft";
    const tags = req.supportTypeTags;

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
      INSERT INTO job_requests (
        job_type, job_title, employer_id, location, shift_date, shift_start_time, shift_duration_hours,
        support_type_tags, client_notes, gender_preference, age_range_preference,
        behavioural_considerations, medical_requirements,
        weekday_rate, weekend_rate, public_holiday_rate, status,
        is_emergency, response_deadline, latitude, longitude
      ) VALUES (
        ${jobType}, ${req.jobTitle ?? null},
        ${employer.employer_id}, ${req.location.trim()},
        ${jobType === "shift" ? req.shiftDate! : null}::date,
        ${jobType === "shift" ? req.shiftStartTime! : null},
        ${jobType === "shift" ? req.shiftDurationHours! : null},
        ${tags},
        ${req.clientNotes ?? null}, ${req.genderPreference ?? null},
        ${req.ageRangePreference ?? null}, ${req.behaviouralConsiderations ?? null},
        ${req.medicalRequirements ?? null},
        ${req.weekdayRate}, ${req.weekendRate}, ${req.publicHolidayRate}, ${status},
        ${req.isEmergency ?? false}, ${req.responseDeadline ? new Date(req.responseDeadline) : null},
        ${req.latitude ?? null}, ${req.longitude ?? null}
      )
      RETURNING job_id, employer_id, job_type, job_title, location, shift_date::text, shift_start_time,
                shift_duration_hours, support_type_tags, client_notes, gender_preference,
                age_range_preference, behavioural_considerations, medical_requirements,
                weekday_rate, weekend_rate, public_holiday_rate, status,
                is_emergency, response_deadline, latitude, longitude, created_at, updated_at
    `;

    if (!row) throw APIError.internal("failed to create job request");

    return mapRow(row);
  }
);
