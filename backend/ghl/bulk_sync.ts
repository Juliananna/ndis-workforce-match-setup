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

    return { synced, failed };
  }
);
