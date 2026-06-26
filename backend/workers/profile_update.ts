import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { WorkerProfile } from "./profile_get";
import { isValidEmail, isValidPhone } from "../auth/validation";
import type { WorkHistoryEntry, QualificationEntry, TrainingEntry, CheckEntry, CapabilityStory } from "../resume/types";

export interface UpdateWorkerProfileRequest {
  name?: string;
  phone?: string;
  fullName?: string;
  location?: string;
  suburb?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  travelRadiusKm?: number;
  driversLicense?: boolean;
  vehicleAccess?: boolean;
  bio?: string;
  experienceYears?: number;
  experienceLevel?: string;
  targetRole?: string;
  previousEmployers?: string;
  qualifications?: string;
  ndisScreeningNumber?: string;
  seekingPlacement?: boolean;
  email?: string;
  supportSettings?: string[];
  supportTasks?: string[];
  supportStyle?: string;
  languages?: string[];
  workHistory?: WorkHistoryEntry[];
  qualificationsJson?: QualificationEntry[];
  training?: TrainingEntry[];
  checks?: CheckEntry[];
  capabilityStories?: CapabilityStory[];
}

function parseJsonb<T>(val: unknown, fallback: T): T {
  if (val == null) return fallback;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  return val as T;
}

export const updateWorkerProfile = api<UpdateWorkerProfileRequest, WorkerProfile>(
  { expose: true, auth: true, method: "PUT", path: "/workers/profile" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    if (req.email !== undefined && req.email !== "") {
      if (!isValidEmail(req.email)) {
        throw APIError.invalidArgument("invalid email format");
      }
    }
    if (req.phone !== undefined && req.phone.trim() !== "") {
      if (!isValidPhone(req.phone)) {
        throw APIError.invalidArgument("please enter a valid Australian phone number");
      }
    }
    if (req.fullName !== undefined && req.fullName.trim() === "") {
      throw APIError.invalidArgument("full name is required");
    }
    if (req.bio !== undefined && req.bio.trim() === "") {
      throw APIError.invalidArgument("bio is required");
    }
    if (req.experienceYears !== undefined && req.experienceYears < 0) {
      throw APIError.invalidArgument("experience years must be 0 or greater");
    }

    const existing = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!existing) {
      throw APIError.notFound("worker profile not found");
    }

    if (req.email !== undefined) {
      await db.exec`UPDATE users SET email = ${req.email.toLowerCase()} WHERE user_id = ${auth.userID}`;
    }

    const supportSettingsJson = req.supportSettings != null ? JSON.stringify(req.supportSettings) : null;
    const supportTasksJson = req.supportTasks != null ? JSON.stringify(req.supportTasks) : null;
    const languagesJson = req.languages != null ? JSON.stringify(req.languages) : null;
    const workHistoryJson = req.workHistory != null ? JSON.stringify(req.workHistory) : null;
    const qualsJsonVal = req.qualificationsJson != null ? JSON.stringify(req.qualificationsJson) : null;
    const trainingJson = req.training != null ? JSON.stringify(req.training) : null;
    const checksJson = req.checks != null ? JSON.stringify(req.checks) : null;
    const capabilityStoriesJson = req.capabilityStories != null ? JSON.stringify(req.capabilityStories) : null;

    const row = await db.queryRow<{
      worker_id: string;
      user_id: string;
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
      UPDATE workers
      SET
        name = COALESCE(${req.name ?? null}, name),
        seeking_placement = COALESCE(${req.seekingPlacement ?? null}, seeking_placement),
        phone = COALESCE(${req.phone ?? null}, phone),
        full_name = COALESCE(${req.fullName ?? null}, full_name),
        location = COALESCE(${req.location ?? null}, location),
        suburb = COALESCE(${req.suburb ?? null}, suburb),
        postcode = COALESCE(${req.postcode ?? null}, postcode),
        latitude = COALESCE(${req.latitude ?? null}, latitude),
        longitude = COALESCE(${req.longitude ?? null}, longitude),
        travel_radius_km = COALESCE(${req.travelRadiusKm ?? null}, travel_radius_km),
        drivers_license = COALESCE(${req.driversLicense ?? null}, drivers_license),
        vehicle_access = COALESCE(${req.vehicleAccess ?? null}, vehicle_access),
        bio = COALESCE(${req.bio ?? null}, bio),
        experience_years = COALESCE(${req.experienceYears ?? null}, experience_years),
        experience_level = COALESCE(${req.experienceLevel ?? null}, experience_level),
        target_role = COALESCE(${req.targetRole ?? null}, target_role),
        previous_employers = COALESCE(${req.previousEmployers ?? null}, previous_employers),
        qualifications = COALESCE(${req.qualifications ?? null}, qualifications),
        ndis_screening_number = COALESCE(${req.ndisScreeningNumber ?? null}, ndis_screening_number),
        support_settings = COALESCE(${supportSettingsJson}::jsonb, support_settings),
        support_tasks = COALESCE(${supportTasksJson}::jsonb, support_tasks),
        support_style = COALESCE(${req.supportStyle ?? null}, support_style),
        languages = COALESCE(${languagesJson}::jsonb, languages),
        work_history = COALESCE(${workHistoryJson}::jsonb, work_history),
        qualifications_json = COALESCE(${qualsJsonVal}::jsonb, qualifications_json),
        training = COALESCE(${trainingJson}::jsonb, training),
        checks = COALESCE(${checksJson}::jsonb, checks),
        capability_stories = COALESCE(${capabilityStoriesJson}::jsonb, capability_stories),
        updated_at = NOW()
      WHERE user_id = ${auth.userID}
      RETURNING worker_id, user_id, name, phone, full_name, location, suburb, postcode,
                latitude, longitude, travel_radius_km,
                drivers_license, vehicle_access, bio, experience_years, experience_level,
                target_role, previous_employers,
                qualifications, intro_video_url, avatar_url, ndis_screening_number, seeking_placement, updated_at,
                support_settings, support_tasks, support_style, languages,
                work_history, qualifications_json, training, checks, capability_stories, resume_session_id
    `;

    if (!row) {
      throw APIError.internal("failed to update worker profile");
    }

    const updatedEmail = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${auth.userID}`;

    const workHistory = parseJsonb<unknown[]>(row.work_history, []);
    const qualsJson = parseJsonb<unknown[]>(row.qualifications_json, []);
    const fields = [
      row.full_name,
      row.location,
      row.bio,
      row.experience_years !== null ? "x" : null,
      row.qualifications || qualsJson.length > 0 ? "x" : null,
      row.phone,
      row.target_role,
      workHistory.length > 0 ? "x" : null,
    ];
    const filled = fields.filter((f) => f !== null && f !== "").length;
    const completionPercent = Math.round((filled / fields.length) * 100);

    return {
      workerId: row.worker_id,
      userId: row.user_id,
      email: updatedEmail?.email ?? "",
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
      completionPercent,
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
