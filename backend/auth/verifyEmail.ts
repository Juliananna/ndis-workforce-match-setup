import { api, APIError } from "encore.dev/api";
import db from "../db";
import { userVerifiedTopic } from "../notifications/lifecycle_topics";

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export const verifyEmail = api<VerifyEmailRequest, VerifyEmailResponse>(
  { expose: true, method: "POST", path: "/auth/verify-email" },
  async (req) => {
    if (!req.token || !req.token.trim()) {
      throw APIError.invalidArgument("token is required");
    }

    const user = await db.queryRow<{ user_id: string; email: string; role: string; name: string }>`
      SELECT u.user_id, u.email, u.role, COALESCE(w.name, e.organisation_name, u.email) AS name
      FROM users u
      LEFT JOIN workers w ON w.user_id = u.user_id
      LEFT JOIN employers e ON e.user_id = u.user_id
      WHERE u.verification_token = ${req.token.trim()}
        AND u.is_verified = FALSE
    `;

    if (!user) {
      throw APIError.notFound("invalid or already used verification token");
    }

    await db.exec`
      UPDATE users
      SET is_verified = TRUE, verification_token = NULL
      WHERE user_id = ${user.user_id}
    `;

    try {
      await userVerifiedTopic.publish({
        userId: user.user_id,
        email: user.email,
        role: user.role as "WORKER" | "EMPLOYER",
        name: user.name,
      });
    } catch {
    }

    return { message: "Email verified successfully. You can now log in." };
  }
);
