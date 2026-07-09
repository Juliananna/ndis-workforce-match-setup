import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertSysAdmin } from "../admin/guard";
import { upsertContact } from "./client";

export interface BulkSyncResponse {
  synced: number;
  failed: number;
}

export const bulkSyncToGHL = api<void, BulkSyncResponse>(
  { expose: true, auth: true, method: "POST", path: "/ghl/bulk-sync" },
  async () => {
    const auth = getAuthData()!;
    await assertSysAdmin(auth.userID);

    const users = await db.queryAll<{ email: string; role: string; name: string }>`
      SELECT
        u.email,
        u.role,
        COALESCE(w.name, e.organisation_name, u.email) AS name
      FROM users u
      LEFT JOIN workers w ON w.user_id = u.user_id
      LEFT JOIN employers e ON e.user_id = u.user_id
      WHERE u.is_verified = TRUE
        AND u.is_demo = FALSE
        AND u.role IN ('WORKER', 'EMPLOYER')
    `;

    const resumeLeads = await db.queryAll<{
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      converted_worker_id: string | null;
    }>`
      SELECT id, email, first_name, last_name, converted_worker_id
      FROM resume_sessions
      WHERE email IS NOT NULL
        AND status != 'abandoned'
      ORDER BY created_at DESC
    `;

    let synced = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const nameParts = user.name.trim().split(/\s+/);
        const firstName = nameParts[0] ?? user.name;
        const lastName = nameParts.slice(1).join(" ") || undefined;

        await upsertContact({
          email: user.email,
          firstName,
          lastName,
          name: user.name,
          tags: [user.role.toLowerCase(), "ndis-platform", "verified"],
        });
        synced++;
      } catch {
        failed++;
      }
    }

    for (const lead of resumeLeads) {
      try {
        const firstName = lead.first_name ?? lead.email!.split("@")[0];
        const lastName = lead.last_name ?? undefined;
        const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || firstName;
        const tags = ["resume-lead", "worker"];
        if (lead.converted_worker_id) {
          tags.push("resume-converted");
        } else {
          tags.push("profile-not-created");
        }
        const resumeUrl = `https://kizazihire.com.au/resume-builder/preview/${lead.id}`;

        await upsertContact({
          email: lead.email!,
          firstName,
          lastName,
          name,
          tags,
          source: "resume-builder",
          website: resumeUrl,
        });
        synced++;
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  }
);
