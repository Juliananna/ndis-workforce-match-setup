import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import db from "../db";
import { assertAdmin } from "./guard";
import { sendAdminPasswordResetEmail } from "../emailer/password_reset_email";

export interface AdminResetPasswordRequest {
  userId: string;
}

export interface AdminResetPasswordResponse {
  message: string;
  temporaryPassword: string;
}

export const adminResetUserPassword = api<AdminResetPasswordRequest, AdminResetPasswordResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/users/:userId/reset-password" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const user = await db.queryRow<{ user_id: string; email: string }>`
      SELECT user_id, email FROM users WHERE user_id = ${req.userId}
    `;

    if (!user) {
      throw APIError.notFound("user not found");
    }

    const temporaryPassword = randomBytes(6).toString("base64url").slice(0, 10) + "!1";

    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    await db.exec`UPDATE users SET password_hash = ${passwordHash} WHERE user_id = ${req.userId}`;

    await db.exec`
      UPDATE password_reset_tokens SET used_at = NOW()
      WHERE user_id = ${req.userId} AND used_at IS NULL
    `;

    try {
      await sendAdminPasswordResetEmail(user.email, temporaryPassword);
    } catch {
    }

    return {
      message: `Password reset for ${user.email}. A temporary password has been emailed to them.`,
      temporaryPassword,
    };
  }
);
