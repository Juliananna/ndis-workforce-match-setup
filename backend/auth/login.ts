import { api, APIError } from "encore.dev/api";
import bcrypt from "bcryptjs";
import db from "../db";
import { signToken } from "./jwt";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: string;
  userId: string;
}

// Authenticates a user and returns a JWT token.
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    if (!req.email || !req.password) {
      throw APIError.invalidArgument("email and password are required");
    }

    const user = await db.queryRow<{
      user_id: string;
      email: string;
      password_hash: string;
      role: string;
      is_verified: boolean;
    }>`
      SELECT user_id, email, password_hash, role, is_verified
      FROM users
      WHERE email = ${req.email.toLowerCase()}
    `;

    if (!user) {
      throw APIError.unauthenticated("invalid email or password");
    }

    const valid = await bcrypt.compare(req.password, user.password_hash);
    if (!valid) {
      throw APIError.unauthenticated("invalid email or password");
    }

    if (!user.is_verified) {
      throw APIError.permissionDenied("email_not_verified");
    }

    const token = await signToken({
      userID: user.user_id,
      email: user.email,
      role: user.role,
    });

    await db.exec`UPDATE users SET last_login_at = NOW() WHERE user_id = ${user.user_id}`;

    return {
      token,
      role: user.role,
      userId: user.user_id,
    };
  }
);
