import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface MeResponse {
  userId: string;
  email: string;
  role: string;
  isVerified: boolean;
  isAdmin: boolean;
  isSysAdmin: boolean;
  isComplianceOfficer: boolean;
  isSalesAgent: boolean;
  createdAt: Date;
}

export const me = api<void, MeResponse>(
  { expose: true, auth: true, method: "GET", path: "/me" },
  async () => {
    const authData = getAuthData()!;

    const user = await db.queryRow<{
      user_id: string;
      email: string;
      role: string;
      is_verified: boolean;
      created_at: Date;
    }>`
      SELECT user_id, email, role, is_verified, created_at
      FROM users
      WHERE user_id = ${authData.userID}
    `;

    if (!user) {
      throw APIError.notFound("user not found");
    }

    const adminRow = await db.queryRow<{ user_id: string; is_sysadmin: boolean }>`
      SELECT user_id, COALESCE(is_sysadmin, false) AS is_sysadmin FROM admin_users WHERE user_id = ${authData.userID}
    `;

    const complianceRow = await db.queryRow<{ user_id: string }>`
      SELECT user_id FROM compliance_officers WHERE user_id = ${authData.userID}
    `;

    const salesRow = await db.queryRow<{ user_id: string }>`
      SELECT user_id FROM sales_agents WHERE user_id = ${authData.userID}
    `;

    return {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
      isAdmin: !!adminRow,
      isSysAdmin: adminRow?.is_sysadmin ?? false,
      isComplianceOfficer: !!complianceRow,
      isSalesAgent: !!salesRow,
      createdAt: user.created_at,
    };
  }
);
