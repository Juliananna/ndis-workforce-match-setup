import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import bcrypt from "bcryptjs";
import db from "../db";

export interface ComplianceProfileResponse {
  userId: string;
  email: string;
  fullName: string;
  createdAt: Date;
}

export const getComplianceProfile = api<void, ComplianceProfileResponse>(
  { expose: true, auth: true, method: "GET", path: "/compliance/profile" },
  async () => {
    const auth = getAuthData()!;

    const row = await db.queryRow<{
      user_id: string;
      email: string;
      full_name: string;
      created_at: Date;
    }>`
      SELECT co.user_id, u.email, co.full_name, co.created_at
      FROM compliance_officers co
      JOIN users u ON u.user_id = co.user_id
      WHERE co.user_id = ${auth.userID}
    `;

    if (!row) throw APIError.permissionDenied("compliance officer access required");

    return {
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      createdAt: row.created_at,
    };
  }
);

export interface UpdateComplianceProfileRequest {
  fullName?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UpdateComplianceProfileResponse {
  userId: string;
  email: string;
  fullName: string;
}

export const updateComplianceProfile = api<UpdateComplianceProfileRequest, UpdateComplianceProfileResponse>(
  { expose: true, auth: true, method: "PATCH", path: "/compliance/profile" },
  async (req) => {
    const auth = getAuthData()!;

    const row = await db.queryRow<{
      user_id: string;
      email: string;
      full_name: string;
      password_hash: string;
    }>`
      SELECT co.user_id, u.email, co.full_name, u.password_hash
      FROM compliance_officers co
      JOIN users u ON u.user_id = co.user_id
      WHERE co.user_id = ${auth.userID}
    `;

    if (!row) throw APIError.permissionDenied("compliance officer access required");

    if (req.fullName !== undefined) {
      if (!req.fullName.trim()) throw APIError.invalidArgument("fullName cannot be empty");
      await db.exec`UPDATE compliance_officers SET full_name = ${req.fullName.trim()} WHERE user_id = ${auth.userID}`;
    }

    if (req.newPassword !== undefined) {
      if (!req.currentPassword) throw APIError.invalidArgument("currentPassword is required to change password");
      if (req.newPassword.length < 8) throw APIError.invalidArgument("newPassword must be at least 8 characters");

      const valid = await bcrypt.compare(req.currentPassword, row.password_hash);
      if (!valid) throw APIError.unauthenticated("current password is incorrect");

      const hash = await bcrypt.hash(req.newPassword, 12);
      await db.exec`UPDATE users SET password_hash = ${hash} WHERE user_id = ${auth.userID}`;
    }

    const updated = await db.queryRow<{ email: string; full_name: string }>`
      SELECT u.email, co.full_name
      FROM compliance_officers co JOIN users u ON u.user_id = co.user_id
      WHERE co.user_id = ${auth.userID}
    `;

    return { userId: auth.userID, email: updated!.email, fullName: updated!.full_name };
  }
);
