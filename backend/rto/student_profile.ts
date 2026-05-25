import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { StudentProfile } from "./types";

export interface UpsertStudentProfileRequest {
  isCurrentStudent?: boolean;
  courseName?: string;
  qualificationLevel?: string;
  placementRequired?: boolean;
  placementHoursRequired?: number;
  placementHoursCompleted?: number;
  placementStartDate?: string;
  preferredPlacementSuburbs?: string[];
  wantsPaidWork?: boolean;
  rtoProgressConsent?: boolean;
  rtoPartnerId?: string;
}

export const upsertStudentProfile = api<UpsertStudentProfileRequest, StudentProfile>(
  { expose: true, auth: true, method: "PUT", path: "/rto/student-profile" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can update student profile");

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const row = await db.queryRow<{
      id: string;
      worker_id: string;
      rto_partner_id: string | null;
      is_current_student: boolean;
      course_name: string | null;
      qualification_level: string | null;
      placement_required: boolean;
      placement_hours_required: number | null;
      placement_hours_completed: number;
      placement_start_date: string | null;
      preferred_placement_suburbs: string[] | null;
      wants_paid_work: boolean;
      rto_progress_consent: boolean;
      created_at: Date;
      updated_at: Date;
    }>`
      INSERT INTO worker_student_profiles
        (worker_id, rto_partner_id, is_current_student, course_name, qualification_level,
         placement_required, placement_hours_required, placement_hours_completed,
         placement_start_date, preferred_placement_suburbs, wants_paid_work, rto_progress_consent)
      VALUES
        (${worker.worker_id}, ${req.rtoPartnerId ?? null}, ${req.isCurrentStudent ?? true},
         ${req.courseName ?? null}, ${req.qualificationLevel ?? null},
         ${req.placementRequired ?? false}, ${req.placementHoursRequired ?? null},
         ${req.placementHoursCompleted ?? 0}, ${req.placementStartDate ?? null},
         ${req.preferredPlacementSuburbs ?? null}, ${req.wantsPaidWork ?? true},
         ${req.rtoProgressConsent ?? false})
      ON CONFLICT (worker_id) DO UPDATE SET
        rto_partner_id              = COALESCE(EXCLUDED.rto_partner_id, worker_student_profiles.rto_partner_id),
        is_current_student          = COALESCE(${req.isCurrentStudent ?? null}, worker_student_profiles.is_current_student),
        course_name                 = COALESCE(${req.courseName ?? null}, worker_student_profiles.course_name),
        qualification_level         = COALESCE(${req.qualificationLevel ?? null}, worker_student_profiles.qualification_level),
        placement_required          = COALESCE(${req.placementRequired ?? null}, worker_student_profiles.placement_required),
        placement_hours_required    = COALESCE(${req.placementHoursRequired ?? null}, worker_student_profiles.placement_hours_required),
        placement_hours_completed   = COALESCE(${req.placementHoursCompleted ?? null}, worker_student_profiles.placement_hours_completed),
        placement_start_date        = COALESCE(${req.placementStartDate ?? null}, worker_student_profiles.placement_start_date),
        preferred_placement_suburbs = COALESCE(${req.preferredPlacementSuburbs ?? null}, worker_student_profiles.preferred_placement_suburbs),
        wants_paid_work             = COALESCE(${req.wantsPaidWork ?? null}, worker_student_profiles.wants_paid_work),
        rto_progress_consent        = COALESCE(${req.rtoProgressConsent ?? null}, worker_student_profiles.rto_progress_consent),
        updated_at                  = NOW()
      RETURNING id, worker_id, rto_partner_id, is_current_student, course_name, qualification_level,
                placement_required, placement_hours_required, placement_hours_completed,
                placement_start_date, preferred_placement_suburbs, wants_paid_work,
                rto_progress_consent, created_at, updated_at
    `;

    if (!row) throw APIError.internal("failed to upsert student profile");

    return mapRow(row);
  }
);

export const getStudentProfile = api<void, StudentProfile>(
  { expose: true, auth: true, method: "GET", path: "/rto/student-profile" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can access student profile");

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const row = await db.queryRow<{
      id: string;
      worker_id: string;
      rto_partner_id: string | null;
      is_current_student: boolean;
      course_name: string | null;
      qualification_level: string | null;
      placement_required: boolean;
      placement_hours_required: number | null;
      placement_hours_completed: number;
      placement_start_date: string | null;
      preferred_placement_suburbs: string[] | null;
      wants_paid_work: boolean;
      rto_progress_consent: boolean;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT id, worker_id, rto_partner_id, is_current_student, course_name, qualification_level,
             placement_required, placement_hours_required, placement_hours_completed,
             placement_start_date, preferred_placement_suburbs, wants_paid_work,
             rto_progress_consent, created_at, updated_at
      FROM worker_student_profiles
      WHERE worker_id = ${worker.worker_id}
    `;

    if (!row) throw APIError.notFound("student profile not found");

    return mapRow(row);
  }
);

function mapRow(row: {
  id: string;
  worker_id: string;
  rto_partner_id: string | null;
  is_current_student: boolean;
  course_name: string | null;
  qualification_level: string | null;
  placement_required: boolean;
  placement_hours_required: number | null;
  placement_hours_completed: number;
  placement_start_date: string | null;
  preferred_placement_suburbs: string[] | null;
  wants_paid_work: boolean;
  rto_progress_consent: boolean;
  created_at: Date;
  updated_at: Date;
}): StudentProfile {
  return {
    id: row.id,
    workerId: row.worker_id,
    rtoPartnerId: row.rto_partner_id,
    isCurrentStudent: row.is_current_student,
    courseName: row.course_name,
    qualificationLevel: row.qualification_level,
    placementRequired: row.placement_required,
    placementHoursRequired: row.placement_hours_required,
    placementHoursCompleted: row.placement_hours_completed,
    placementStartDate: row.placement_start_date,
    preferredPlacementSuburbs: row.preferred_placement_suburbs ?? [],
    wantsPaidWork: row.wants_paid_work,
    rtoProgressConsent: row.rto_progress_consent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
