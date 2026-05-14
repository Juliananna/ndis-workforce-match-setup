import { api, APIError } from "encore.dev/api";
import db from "../db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { rowToSession } from "./session_helpers";

interface ConvertToProfileRequest {
  id: string;
  password: string;
}

interface ConvertToProfileResponse {
  workerId: string;
  userId: string;
  message: string;
  alreadyExists: boolean;
}

// Converts a completed resume session into a KizaziHire worker profile.
export const convertToProfile = api<ConvertToProfileRequest, ConvertToProfileResponse>(
  { expose: true, method: "POST", path: "/resume-sessions/:id/convert-to-profile" },
  async (req) => {
    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${req.id}`;
    if (!row) throw APIError.notFound("session not found");

    const session = rowToSession(row);

    if (!session.email) {
      throw APIError.failedPrecondition("email must be captured before converting to a profile");
    }

    if (!req.password || req.password.length < 8) {
      throw APIError.invalidArgument("password must be at least 8 characters");
    }

    const existingUser = await db.queryRow<{ user_id: string; role: string }>`
      SELECT user_id, role FROM users WHERE email = ${session.email}
    `;

    if (existingUser) {
      const existingWorker = await db.queryRow<{ worker_id: string }>`
        SELECT worker_id FROM workers WHERE user_id = ${existingUser.user_id}
      `;
      if (existingWorker) {
        await db.exec`
          UPDATE resume_sessions SET converted_worker_id = ${existingWorker.worker_id}, status = 'converted', updated_at = NOW()
          WHERE id = ${req.id}
        `;
        return { workerId: existingWorker.worker_id, userId: existingUser.user_id, message: "Linked to existing account", alreadyExists: true };
      }
    }

    const passwordHash = await bcrypt.hash(req.password, 12);
    const verificationToken = randomUUID();
    const fullName = [session.firstName, session.lastName].filter(Boolean).join(" ");
    const name = session.firstName ?? session.email.split("@")[0];
    const location = [session.suburb, session.state].filter(Boolean).join(", ");

    const user = await db.queryRow<{ user_id: string }>`
      INSERT INTO users (email, password_hash, role, is_verified, verification_token)
      VALUES (${session.email}, ${passwordHash}, 'WORKER', FALSE, ${verificationToken})
      RETURNING user_id
    `;

    if (!user) throw APIError.internal("failed to create user account");

    const worker = await db.queryRow<{ worker_id: string }>`
      INSERT INTO workers (
        user_id, name, phone, full_name, location,
        bio, experience_years, qualifications,
        drivers_license, vehicle_access, ndis_screening_number
      )
      VALUES (
        ${user.user_id},
        ${name},
        ${session.phone ?? ""},
        ${fullName || name},
        ${location || null},
        ${session.aiBio ?? session.aiSummary ?? null},
        ${session.experienceYears ?? null},
        ${session.qualifications.map((q) => q.name).join(", ") || null},
        ${session.driversLicence},
        ${session.ownVehicle},
        ${session.ndisScreeningNumber ?? null}
      )
      RETURNING worker_id
    `;

    if (!worker) throw APIError.internal("failed to create worker profile");

    for (const skill of session.supportTasks) {
      await db.exec`
        INSERT INTO worker_skills (worker_id, skill) VALUES (${worker.worker_id}, ${skill})
        ON CONFLICT DO NOTHING
      `;
    }

    if (session.availability.length > 0) {
      const days = session.availability.map((a) => a.day);
      const shifts = [...new Set(session.availability.flatMap((a) => a.shifts))];
      await db.exec`
        INSERT INTO worker_availability (worker_id, available_days, preferred_shift_types, max_travel_distance_km)
        VALUES (${worker.worker_id}, ${JSON.stringify(days)}::text[], ${JSON.stringify(shifts)}::text[], ${session.travelRadiusKm ?? 20})
        ON CONFLICT (worker_id) DO NOTHING
      `;
    }

    await db.exec`
      UPDATE resume_sessions
      SET converted_worker_id = ${worker.worker_id}, status = 'converted', updated_at = NOW()
      WHERE id = ${req.id}
    `;

    await db.exec`
      INSERT INTO resume_audit_log (session_id, event_type, event_data)
      VALUES (${req.id}, 'converted_to_profile', ${JSON.stringify({ workerId: worker.worker_id })}::jsonb)
    `;

    return {
      workerId: worker.worker_id,
      userId: user.user_id,
      message: "KizaziHire worker profile created successfully",
      alreadyExists: false,
    };
  }
);
