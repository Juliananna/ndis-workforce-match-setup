import { api } from "encore.dev/api";
import db from "../db";
import type { ResumeSession } from "./types";
import { rowToSession } from "./session_helpers";

interface CreateSessionRequest {
  firstName?: string;
  lastName?: string;
  targetRole?: string;
}

interface CreateSessionResponse {
  session: ResumeSession;
}

// Creates a new resume builder session for a guest user.
export const createSession = api<CreateSessionRequest, CreateSessionResponse>(
  { expose: true, method: "POST", path: "/resume-sessions" },
  async (req) => {
    const row = await db.queryRow<{ id: string }>`
      INSERT INTO resume_sessions (first_name, last_name, target_role)
      VALUES (${req.firstName ?? null}, ${req.lastName ?? null}, ${req.targetRole ?? null})
      RETURNING id
    `;

    const session = await db.queryRow`
      SELECT * FROM resume_sessions WHERE id = ${row!.id}
    `;

    await db.exec`
      INSERT INTO resume_audit_log (session_id, event_type, event_data)
      VALUES (${row!.id}, 'session_created', '{}')
    `;

    return { session: rowToSession(session!) };
  }
);
