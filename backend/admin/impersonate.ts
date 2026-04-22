import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertSysAdmin } from "./guard";
import { signToken } from "../auth/jwt";

export interface ImpersonateRequest {
  userId: string;
}

export interface ImpersonateResponse {
  token: string;
  email: string;
  role: string;
}

export const impersonateUser = api<ImpersonateRequest, ImpersonateResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/impersonate" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSysAdmin(auth.userID);

    const row = await db.queryRow<{ user_id: string; email: string; role: string }>`
      SELECT user_id, email, role FROM users WHERE user_id = ${req.userId}
    `;
    if (!row) throw APIError.notFound("user not found");

    const token = await signToken({
      userID: row.user_id,
      email: row.email,
      role: row.role,
    });

    return { token, email: row.email, role: row.role };
  }
);

export interface ListImpersonatableUsersResponse {
  workers: { userId: string; name: string; email: string }[];
  employers: { userId: string; organisationName: string; email: string }[];
}

export const listImpersonatableUsers = api<void, ListImpersonatableUsersResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/impersonate/users" },
  async () => {
    const auth = getAuthData()!;
    await assertSysAdmin(auth.userID);

    const workers = await db.queryAll<{ user_id: string; name: string; email: string }>`
      SELECT w.user_id, w.name, u.email
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      ORDER BY w.name ASC
      LIMIT 200
    `;

    const employers = await db.queryAll<{ user_id: string; organisation_name: string; email: string }>`
      SELECT e.user_id, e.organisation_name, u.email
      FROM employers e
      JOIN users u ON u.user_id = e.user_id
      ORDER BY e.organisation_name ASC
      LIMIT 200
    `;

    return {
      workers: workers.map((r) => ({ userId: r.user_id, name: r.name, email: r.email })),
      employers: employers.map((r) => ({ userId: r.user_id, organisationName: r.organisation_name, email: r.email })),
    };
  }
);
