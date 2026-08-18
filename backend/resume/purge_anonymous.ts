import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdminOrCompliance } from "../admin/guard";

interface PurgeAnonymousResponse {
  deleted: number;
}

export const purgeAnonymousLeads = api<void, PurgeAnonymousResponse>(
  { expose: true, auth: true, method: "DELETE", path: "/admin/resume-leads/anonymous" },
  async () => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const result = await db.queryRow<{ count: number }>`
      WITH deleted AS (
        DELETE FROM resume_sessions
        WHERE converted_worker_id IS NULL
          AND (first_name IS NULL OR first_name = '')
          AND (last_name IS NULL OR last_name = '')
          AND (email IS NULL OR email = '')
          AND NOT EXISTS (
            SELECT 1 FROM resume_session_documents d WHERE d.session_id = resume_sessions.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM resume_session_referees r WHERE r.session_id = resume_sessions.id
          )
        RETURNING id
      )
      SELECT COUNT(*)::int AS count FROM deleted
    `;

    return { deleted: result?.count ?? 0 };
  }
);
