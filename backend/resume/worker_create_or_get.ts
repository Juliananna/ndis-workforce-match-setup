import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { rowToSession } from "./session_helpers";
import type { ResumeSession } from "./types";

interface WorkerCreateOrGetSessionResponse {
  session: ResumeSession;
  prefilled: boolean;
}

export const workerCreateOrGetSession = api<void, WorkerCreateOrGetSessionResponse>(
  { expose: true, auth: true, method: "POST", path: "/resume-sessions/worker/create-or-get" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const worker = await db.queryRow<{
      worker_id: string;
      email: string;
      full_name: string | null;
      phone: string;
      suburb: string | null;
      postcode: string | null;
      state: string | null;
      travel_radius_km: number | null;
      drivers_license: boolean;
      vehicle_access: boolean;
      experience_years: number | null;
      experience_level: string | null;
      target_role: string | null;
      ndis_screening_number: string | null;
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
      SELECT w.worker_id, u.email, w.full_name, w.phone, w.suburb, w.postcode,
             NULL::text AS state,
             w.travel_radius_km, w.drivers_license, w.vehicle_access,
             w.experience_years, w.experience_level, w.target_role, w.ndis_screening_number,
             w.support_settings, w.support_tasks, w.support_style, w.languages,
             w.work_history, w.qualifications_json, w.training, w.checks, w.capability_stories,
             w.resume_session_id
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      WHERE w.user_id = ${auth.userID}
    `;

    if (!worker) {
      throw APIError.notFound("worker profile not found");
    }

    function parseJsonb<T>(val: unknown, fallback: T): T {
      if (val == null) return fallback;
      if (typeof val === "string") {
        try { return JSON.parse(val) as T; } catch { return fallback; }
      }
      return val as T;
    }

    if (worker.resume_session_id) {
      const existing = await db.queryRow`
        SELECT * FROM resume_sessions WHERE id = ${worker.resume_session_id}
      `;
      if (existing) {
        return { session: rowToSession(existing), prefilled: false };
      }
    }

    const existingByWorker = await db.queryRow`
      SELECT * FROM resume_sessions
      WHERE converted_worker_id = ${worker.worker_id}
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    if (existingByWorker) {
      return { session: rowToSession(existingByWorker), prefilled: false };
    }

    const nameParts = (worker.full_name ?? "").trim().split(/\s+/);
    const firstName = nameParts[0] ?? null;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

    const supportSettings = parseJsonb<string[]>(worker.support_settings, []);
    const supportTasks = parseJsonb<string[]>(worker.support_tasks, []);
    const languages = parseJsonb<string[]>(worker.languages, []);
    const workHistory = parseJsonb<object[]>(worker.work_history, []);
    const qualifications = parseJsonb<object[]>(worker.qualifications_json, []);
    const training = parseJsonb<object[]>(worker.training, []);
    const checks = parseJsonb<object[]>(worker.checks, []);
    const capabilityStories = parseJsonb<object[]>(worker.capability_stories, []);

    const row = await db.queryRow<{ id: string }>`
      INSERT INTO resume_sessions (
        email, first_name, last_name, phone, suburb, postcode, state,
        travel_radius_km, drivers_licence, own_vehicle,
        experience_years, experience_level, target_role, ndis_screening_number,
        support_settings, support_tasks, support_style, languages,
        work_history, qualifications, training, checks, capability_stories,
        converted_worker_id
      )
      VALUES (
        ${worker.email},
        ${firstName},
        ${lastName},
        ${worker.phone || null},
        ${worker.suburb},
        ${worker.postcode},
        ${worker.state},
        ${worker.travel_radius_km},
        ${worker.drivers_license},
        ${worker.vehicle_access},
        ${worker.experience_years},
        ${worker.experience_level},
        ${worker.target_role},
        ${worker.ndis_screening_number},
        ${JSON.stringify(supportSettings)}::jsonb,
        ${JSON.stringify(supportTasks)}::jsonb,
        ${worker.support_style},
        ${JSON.stringify(languages)}::jsonb,
        ${JSON.stringify(workHistory)}::jsonb,
        ${JSON.stringify(qualifications)}::jsonb,
        ${JSON.stringify(training)}::jsonb,
        ${JSON.stringify(checks)}::jsonb,
        ${JSON.stringify(capabilityStories)}::jsonb,
        ${worker.worker_id}
      )
      RETURNING id
    `;

    await db.exec`
      UPDATE workers SET resume_session_id = ${row!.id} WHERE worker_id = ${worker.worker_id}
    `;

    await db.exec`
      INSERT INTO resume_audit_log (session_id, event_type, event_data)
      VALUES (${row!.id}, 'session_created_from_worker_profile', ${JSON.stringify({ worker_id: worker.worker_id })})
    `;

    const session = await db.queryRow`
      SELECT * FROM resume_sessions WHERE id = ${row!.id}
    `;

    return { session: rowToSession(session!), prefilled: true };
  }
);
