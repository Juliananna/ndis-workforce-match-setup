import { api, APIError } from "encore.dev/api";
import db from "../db";
import { rowToSession } from "./session_helpers";
import type { ResumeSession, WorkHistoryEntry, QualificationEntry, TrainingEntry, CheckEntry, CapabilityStory, AvailabilityEntry } from "./types";

interface UpdateSessionRequest {
  id: string;
  stepCompleted?: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  travelRadiusKm?: number;
  targetRole?: string;
  experienceLevel?: string;
  experienceYears?: number;
  supportSettings?: string[];
  supportTasks?: string[];
  supportStyle?: string;
  capabilityStories?: CapabilityStory[];
  availability?: AvailabilityEntry[];
  driversLicence?: boolean;
  ownVehicle?: boolean;
  languages?: string[];
  workHistory?: WorkHistoryEntry[];
  qualifications?: QualificationEntry[];
  training?: TrainingEntry[];
  checks?: CheckEntry[];
  ndisScreeningNumber?: string;
}

interface UpdateSessionResponse {
  session: ResumeSession;
}

// Updates a resume builder session with new questionnaire data.
export const updateSession = api<UpdateSessionRequest, UpdateSessionResponse>(
  { expose: true, method: "PATCH", path: "/resume-sessions/:id" },
  async (req) => {
    const existing = await db.queryRow`SELECT id FROM resume_sessions WHERE id = ${req.id}`;
    if (!existing) throw APIError.notFound("session not found");

    const supportSettingsJson = req.supportSettings != null ? JSON.stringify(req.supportSettings) : null;
    const supportTasksJson = req.supportTasks != null ? JSON.stringify(req.supportTasks) : null;
    const languagesJson = req.languages != null ? JSON.stringify(req.languages) : null;
    const capabilityStoriesJson = req.capabilityStories != null ? JSON.stringify(req.capabilityStories) : null;
    const availabilityJson = req.availability != null ? JSON.stringify(req.availability) : null;
    const workHistoryJson = req.workHistory != null ? JSON.stringify(req.workHistory) : null;
    const qualificationsJson = req.qualifications != null ? JSON.stringify(req.qualifications) : null;
    const trainingJson = req.training != null ? JSON.stringify(req.training) : null;
    const checksJson = req.checks != null ? JSON.stringify(req.checks) : null;

    await db.exec`
      UPDATE resume_sessions SET
        updated_at = NOW(),
        step_completed = COALESCE(${req.stepCompleted ?? null}, step_completed),
        first_name = COALESCE(${req.firstName ?? null}, first_name),
        last_name = COALESCE(${req.lastName ?? null}, last_name),
        phone = COALESCE(${req.phone ?? null}, phone),
        suburb = COALESCE(${req.suburb ?? null}, suburb),
        state = COALESCE(${req.state ?? null}, state),
        postcode = COALESCE(${req.postcode ?? null}, postcode),
        travel_radius_km = COALESCE(${req.travelRadiusKm ?? null}, travel_radius_km),
        target_role = COALESCE(${req.targetRole ?? null}, target_role),
        experience_level = COALESCE(${req.experienceLevel ?? null}, experience_level),
        experience_years = COALESCE(${req.experienceYears ?? null}, experience_years),
        support_settings = COALESCE(${supportSettingsJson}::jsonb, support_settings),
        support_tasks = COALESCE(${supportTasksJson}::jsonb, support_tasks),
        support_style = COALESCE(${req.supportStyle ?? null}, support_style),
        capability_stories = COALESCE(${capabilityStoriesJson}::jsonb, capability_stories),
        availability = COALESCE(${availabilityJson}::jsonb, availability),
        drivers_licence = COALESCE(${req.driversLicence ?? null}, drivers_licence),
        own_vehicle = COALESCE(${req.ownVehicle ?? null}, own_vehicle),
        languages = COALESCE(${languagesJson}::jsonb, languages),
        work_history = COALESCE(${workHistoryJson}::jsonb, work_history),
        qualifications = COALESCE(${qualificationsJson}::jsonb, qualifications),
        training = COALESCE(${trainingJson}::jsonb, training),
        checks = COALESCE(${checksJson}::jsonb, checks),
        ndis_screening_number = COALESCE(${req.ndisScreeningNumber ?? null}, ndis_screening_number)
      WHERE id = ${req.id}
    `;

    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${req.id}`;
    return { session: rowToSession(row!) };
  }
);
