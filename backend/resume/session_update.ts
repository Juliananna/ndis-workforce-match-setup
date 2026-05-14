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
        support_settings = COALESCE(${req.supportSettings ? JSON.stringify(req.supportSettings) : null}::text[], support_settings),
        support_tasks = COALESCE(${req.supportTasks ? JSON.stringify(req.supportTasks) : null}::text[], support_tasks),
        support_style = COALESCE(${req.supportStyle ?? null}, support_style),
        capability_stories = COALESCE(${req.capabilityStories ? JSON.stringify(req.capabilityStories) : null}::jsonb, capability_stories),
        availability = COALESCE(${req.availability ? JSON.stringify(req.availability) : null}::jsonb, availability),
        drivers_licence = COALESCE(${req.driversLicence ?? null}, drivers_licence),
        own_vehicle = COALESCE(${req.ownVehicle ?? null}, own_vehicle),
        languages = COALESCE(${req.languages ? JSON.stringify(req.languages) : null}::text[], languages),
        work_history = COALESCE(${req.workHistory ? JSON.stringify(req.workHistory) : null}::jsonb, work_history),
        qualifications = COALESCE(${req.qualifications ? JSON.stringify(req.qualifications) : null}::jsonb, qualifications),
        training = COALESCE(${req.training ? JSON.stringify(req.training) : null}::jsonb, training),
        checks = COALESCE(${req.checks ? JSON.stringify(req.checks) : null}::jsonb, checks),
        ndis_screening_number = COALESCE(${req.ndisScreeningNumber ?? null}, ndis_screening_number)
      WHERE id = ${req.id}
    `;

    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${req.id}`;
    return { session: rowToSession(row!) };
  }
);
