import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import db from "../db";
import { sendPasswordResetEmail } from "../emailer/password_reset_email";

const appBaseUrl = secret("AppBaseUrl");

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export const forgotPassword = api<ForgotPasswordRequest, ForgotPasswordResponse>(
  { expose: true, method: "POST", path: "/auth/forgot-password" },
  async (req) => {
    if (!req.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email)) {
      throw APIError.invalidArgument("valid email is required");
    }

    const user = await db.queryRow<{ user_id: string; email: string; is_verified: boolean }>`
      SELECT user_id, email, is_verified FROM users WHERE email = ${req.email.toLowerCase()}
    `;

    if (user && user.is_verified) {
      await db.exec`
        UPDATE password_reset_tokens SET used_at = NOW()
        WHERE user_id = ${user.user_id} AND used_at IS NULL
      `;

      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.exec`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES (${user.user_id}, ${token}, ${expiresAt})
      `;

      try {
        const baseUrl = appBaseUrl();
        await sendPasswordResetEmail(user.email, token, baseUrl);
      } catch {
      }
    }

    return { message: "If an account with that email exists, a password reset link has been sent." };
  }
);

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export const resetPassword = api<ResetPasswordRequest, ResetPasswordResponse>(
  { expose: true, method: "POST", path: "/auth/reset-password" },
  async (req) => {
    if (!req.token) {
      throw APIError.invalidArgument("token is required");
    }
    if (!req.newPassword || req.newPassword.length < 8) {
      throw APIError.invalidArgument("password must be at least 8 characters");
    }

    const record = await db.queryRow<{ id: string; user_id: string; expires_at: Date; used_at: Date | null }>`
      SELECT id, user_id, expires_at, used_at
      FROM password_reset_tokens
      WHERE token = ${req.token}
    `;

    if (!record) {
      throw APIError.notFound("invalid or expired reset link");
    }

    if (record.used_at) {
      throw APIError.failedPrecondition("this reset link has already been used");
    }

    if (new Date() > record.expires_at) {
      throw APIError.failedPrecondition("this reset link has expired");
    }

    const passwordHash = await bcrypt.hash(req.newPassword, 12);

    await db.exec`UPDATE users SET password_hash = ${passwordHash} WHERE user_id = ${record.user_id}`;
    await db.exec`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ${record.id}`;

    return { message: "Password reset successfully. You can now log in with your new password." };
  }
);
