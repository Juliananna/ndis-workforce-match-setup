import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdmin } from "./guard";

export interface PrivacyPolicyResponse {
  content: string;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface UpdatePrivacyPolicyRequest {
  content: string;
}

export const getPrivacyPolicy = api<void, PrivacyPolicyResponse>(
  { expose: true, auth: false, method: "GET", path: "/privacy-policy" },
  async () => {
    const row = await db.queryRow<{
      content: string;
      updated_at: Date;
      updated_by: string | null;
    }>`SELECT content, updated_at, updated_by FROM privacy_policy ORDER BY id DESC LIMIT 1`;

    return {
      content: row?.content ?? "",
      updatedAt: row?.updated_at ?? null,
      updatedBy: row?.updated_by ?? null,
    };
  }
);

export const updatePrivacyPolicy = api<UpdatePrivacyPolicyRequest, void>(
  { expose: true, auth: true, method: "POST", path: "/admin/privacy-policy" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const userRow = await db.queryRow<{ email: string }>`SELECT email FROM users WHERE user_id = ${auth.userID}`;

    await db.exec`
      UPDATE privacy_policy SET content = ${req.content}, updated_at = NOW(), updated_by = ${userRow?.email ?? auth.userID}
      WHERE id = (SELECT id FROM privacy_policy ORDER BY id DESC LIMIT 1)
    `;
  }
);
