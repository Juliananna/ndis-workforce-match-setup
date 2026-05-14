import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import bcrypt from "bcryptjs";
import db from "../db";

interface SetPasswordRequest {
  newPassword: string;
}

interface SetPasswordResponse {
  message: string;
}

export const setPassword = api<SetPasswordRequest, SetPasswordResponse>(
  { expose: true, auth: true, method: "POST", path: "/auth/set-password" },
  async (req) => {
    const authData = getAuthData()!;

    if (!req.newPassword || req.newPassword.length < 8) {
      throw APIError.invalidArgument("password must be at least 8 characters");
    }

    const user = await db.queryRow<{ user_id: string; password_hash: string | null }>`
      SELECT user_id, password_hash FROM users WHERE user_id = ${authData.userID}
    `;

    if (!user) throw APIError.notFound("user not found");

    if (user.password_hash) {
      throw APIError.failedPrecondition("a password is already set — use the forgot password flow to change it");
    }

    const passwordHash = await bcrypt.hash(req.newPassword, 12);

    await db.exec`
      UPDATE users SET password_hash = ${passwordHash} WHERE user_id = ${authData.userID}
    `;

    return { message: "Password set successfully" };
  }
);
