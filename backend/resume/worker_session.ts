import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { rowToSession } from "./session_helpers";
import type { ResumeSession } from "./types";

interface WorkerResumeSessionResponse {
  session: ResumeSession | null;
}

// Returns the resume builder session linked to the authenticated worker's profile, if any.
export const getWorkerResumeSession = api<void, WorkerResumeSessionResponse>(
  { expose: true, auth: true, method: "GET", path: "/resume-sessions/worker/mine" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) {
      throw APIError.notFound("worker profile not found");
    }

    const row = await db.queryRow`
      SELECT * FROM resume_sessions
      WHERE converted_worker_id = ${worker.worker_id}
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    return { session: row ? rowToSession(row) : null };
  }
);
