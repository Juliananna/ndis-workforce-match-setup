import { api, APIError } from "encore.dev/api";
import db from "../db";
import { signToken } from "../auth/jwt";

export interface DemoLoginRequest {
  role: "WORKER" | "EMPLOYER";
  pairIndex: number;
}

export interface DemoLoginResponse {
  token: string;
  role: string;
  userId: string;
  email: string;
  displayName: string;
}

export const demoLogin = api<DemoLoginRequest, DemoLoginResponse>(
  { expose: true, method: "POST", path: "/demo/login" },
  async (req) => {
    const pairs = await db.queryAll<{
      id: string;
      label: string;
      worker_user_id: string;
      employer_user_id: string;
    }>`SELECT id, label, worker_user_id, employer_user_id FROM demo_pairs ORDER BY created_at`;

    if (pairs.length === 0) {
      throw APIError.failedPrecondition("Demo data not seeded yet. Please seed demo data first.");
    }

    const idx = req.pairIndex % pairs.length;
    const pair = pairs[idx];

    const targetUserId = req.role === "WORKER" ? pair.worker_user_id : pair.employer_user_id;

    const user = await db.queryRow<{
      user_id: string;
      email: string;
      role: string;
      is_demo: boolean;
    }>`
      SELECT user_id, email, role, is_demo FROM users WHERE user_id = ${targetUserId}
    `;

    if (!user) {
      throw APIError.notFound("demo user not found");
    }

    if (!user.is_demo) {
      throw APIError.permissionDenied("not a demo account");
    }

    let displayName = "";
    if (req.role === "WORKER") {
      const worker = await db.queryRow<{ full_name: string | null; name: string }>`
        SELECT full_name, name FROM workers WHERE user_id = ${targetUserId}
      `;
      displayName = worker?.full_name ?? worker?.name ?? user.email;
    } else {
      const employer = await db.queryRow<{ organisation_name: string }>`
        SELECT organisation_name FROM employers WHERE user_id = ${targetUserId}
      `;
      displayName = employer?.organisation_name ?? user.email;
    }

    const token = await signToken({
      userID: user.user_id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      role: user.role,
      userId: user.user_id,
      email: user.email,
      displayName,
    };
  }
);
