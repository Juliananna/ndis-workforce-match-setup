import { api } from "encore.dev/api";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import db from "../db";

const SYSADMIN_EMAIL = "sysadmin@kizazihire.com.au";
const SYSADMIN_PASSWORD = "KizaziAdmin2024!";

export interface BootstrapResponse {
  message: string;
  alreadyExists: boolean;
}

export const bootstrap = api(
  { expose: true, method: "POST", path: "/admin/bootstrap" },
  async (): Promise<BootstrapResponse> => {
    const already = await db.queryRow`
      SELECT 1 FROM sysadmin_bootstrap LIMIT 1
    `;
    if (already) {
      return { message: "Sysadmin already bootstrapped.", alreadyExists: true };
    }

    const existing = await db.queryRow<{ user_id: string }>`
      SELECT user_id FROM users WHERE email = ${SYSADMIN_EMAIL}
    `;

    let userId: string;

    if (existing) {
      userId = existing.user_id;
    } else {
      const passwordHash = await bcrypt.hash(SYSADMIN_PASSWORD, 12);
      const verificationToken = randomUUID();

      const user = await db.queryRow<{ user_id: string }>`
        INSERT INTO users (email, password_hash, role, is_verified, verification_token)
        VALUES (${SYSADMIN_EMAIL}, ${passwordHash}, 'WORKER', TRUE, ${verificationToken})
        RETURNING user_id
      `;
      userId = user!.user_id;
    }

    const adminRow = await db.queryRow`
      SELECT 1 FROM admin_users WHERE user_id = ${userId}
    `;
    if (!adminRow) {
      await db.exec`
        INSERT INTO admin_users (user_id, is_sysadmin, notes)
        VALUES (${userId}, TRUE, 'System administrator — bootstrapped on deploy')
      `;
    } else {
      await db.exec`
        UPDATE admin_users SET is_sysadmin = TRUE WHERE user_id = ${userId}
      `;
    }

    await db.exec`INSERT INTO sysadmin_bootstrap DEFAULT VALUES`;

    return { message: "Sysadmin account created successfully.", alreadyExists: false };
  }
);
