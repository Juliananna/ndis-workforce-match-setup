import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { WorkHistoryEntry, QualificationEntry, TrainingEntry, CheckEntry, CapabilityStory } from "../resume/types";

export type { WorkHistoryEntry, QualificationEntry, TrainingEntry, CheckEntry, CapabilityStory };

export interface WorkerProfile {
  workerId: string;
  userId: string;
  email: string;
  name: string;
  phone: string;
  fullName: string | null;
  location: string | null;
  suburb: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  travelRadiusKm: number | null;
  driversLicense: boolean;
  vehicleAccess: boolean;
  bio: string | null;
  experienceYears: number | null;
  experienceLevel: string | null;
  targetRole: string | null;
  previousEmployers: string | null;
  qualifications: string | null;
  introVideoUrl: string | null;
  avatarUrl: string | null;
  ndisScreeningNumber: string | null;
  seekingPlacement: boolean;
  updatedAt: Date;
  completionPercent: number;
  supportSettings: string[];
  supportTasks: string[];
  supportStyle: string | null;
  languages: string[];
  workHistory: WorkHistoryEntry[];
  qualificationsJson: QualificationEntry[];
  training: TrainingEntry[];
  checks: CheckEntry[];
  capabilityStories: CapabilityStory[];
  resumeSessionId: string | null;
}

function parseJsonb<T>(val: unknown, fallback: T): T {
  if (val == null) return fallback;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  return val as T;
}

function computeCompletion(w: {
  full_name: string | null;
  location: string | null;
  bio: string | null;
  experience_years: number | null;
  qualifications: string | null;
  phone: string;
  target_role: string | null;
  work_history: unknown;
  qualifications_json: unknown;
}): number {
  const workHistory = parseJsonb<unknown[]>(w.work_history, []);
  const qualsJson = parseJsonb<unknown[]>(w.qualifications_json, []);
  const fields = [
    w.full_name,
    w.location,
    w.bio,
    w.experience_years !== null ? "x" : null,
    w.qualifications || qualsJson.length > 0 ? "x" : null,
    w.phone,
    w.target_role,
    workHistory.length > 0 ? "x" : null,
  ];
  const filled = fields.filter((f) => f !== null && f !== "").length;
  return Math.round((filled / fields.length) * 100);
}

export const getWorkerProfile = api<void, WorkerProfile>(
  { expose: true, auth: true, method: "GET", path: "/workers/profile" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const row = await db.queryRow<{
      worker_id: string;
      user_id: string;
      email: string;
      name: string;
      phone: string;
      full_name: string | null;
      location: string | null;
      suburb: string | null;
      postcode: string | null;
      latitude: number | null;
      longitude: number | null;
      travel_radius_km: number | null;
      drivers_license: boolean;
      vehicle_access: boolean;
      bio: string | null;
      experience_years: number | null;
      experience_level: string | null;
      target_role: string | null;
      previous_employers: string | null;
      qualifications: string | null;
      intro_video_url: string | null;
      avatar_url: string | null;
      ndis_screening_number: string | null;
      seeking_placement: boolean;
      updated_at: Date;
      support_settings: unknown;
      support_tasks: unknown;
      support_style: string | null;
      languages: unknown;
      work_history: unknown;
      qualifications_json: unknown;
      training: unknown;
      checks: unknown;
      capability_stories: unknown;
      resume_session_id: string | null;
    }>`
      SELECT w.worker_id, w.user_id, u.email, w.name, w.phone, w.full_name, w.location,
             w.suburb, w.postcode,
             w.latitude, w.longitude, w.travel_radius_km,
             w.drivers_license, w.vehicle_access, w.bio, w.experience_years, w.experience_level,
             w.target_role, w.previous_employers,
             w.qualifications, w.intro_video_url, w.avatar_url, w.ndis_screening_number,
             w.seeking_placement, w.updated_at,
             w.support_settings, w.support_tasks, w.support_style, w.languages,
             w.work_history, w.qualifications_json, w.training, w.checks, w.capability_stories,
             w.resume_session_id
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      WHERE w.user_id = ${auth.userID}
    `;

    if (!row) {
      throw APIError.notFound("worker profile not found");
    }

    return {
      workerId: row.worker_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      fullName: row.full_name,
      location: row.location,
      suburb: row.suburb,
      postcode: row.postcode,
      latitude: row.latitude,
      longitude: row.longitude,
      travelRadiusKm: row.travel_radius_km,
      driversLicense: row.drivers_license,
      vehicleAccess: row.vehicle_access,
      bio: row.bio,
      experienceYears: row.experience_years,
      experienceLevel: row.experience_level,
      targetRole: row.target_role,
      previousEmployers: row.previous_employers,
      qualifications: row.qualifications,
      introVideoUrl: row.intro_video_url,
      avatarUrl: row.avatar_url,
      ndisScreeningNumber: row.ndis_screening_number,
      seekingPlacement: row.seeking_placement,
      updatedAt: row.updated_at,
      completionPercent: computeCompletion(row),
      supportSettings: parseJsonb<string[]>(row.support_settings, []),
      supportTasks: parseJsonb<string[]>(row.support_tasks, []),
      supportStyle: row.support_style,
      languages: parseJsonb<string[]>(row.languages, []),
      workHistory: parseJsonb<WorkHistoryEntry[]>(row.work_history, []),
      qualificationsJson: parseJsonb<QualificationEntry[]>(row.qualifications_json, []),
      training: parseJsonb<TrainingEntry[]>(row.training, []),
      checks: parseJsonb<CheckEntry[]>(row.checks, []),
      capabilityStories: parseJsonb<CapabilityStory[]>(row.capability_stories, []),
      resumeSessionId: row.resume_session_id,
    };
  }
);
