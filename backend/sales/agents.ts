import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import bcrypt from "bcryptjs";
import db from "../db";
import { assertAdmin } from "./guard";

export interface SalesAgent {
  userId: string;
  email: string;
  grantedAt: Date;
  notes: string | null;
}

export interface ListAgentsResponse {
  agents: SalesAgent[];
}

export const listSalesAgents = api<void, ListAgentsResponse>(
  { expose: true, auth: true, method: "GET", path: "/sales/agents" },
  async () => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const rows = await db.queryAll<{
      user_id: string;
      email: string;
      granted_at: Date;
      notes: string | null;
    }>`
      SELECT s.user_id, u.email, s.granted_at, s.notes
      FROM sales_agents s
      JOIN users u ON u.user_id = s.user_id
      ORDER BY s.granted_at DESC
    `;

    return {
      agents: rows.map((r) => ({
        userId: r.user_id,
        email: r.email,
        grantedAt: r.granted_at,
        notes: r.notes,
      })),
    };
  }
);

export interface CreateSalesAgentRequest {
  email: string;
  password: string;
  notes?: string;
}

export interface CreateSalesAgentResponse {
  userId: string;
  email: string;
}

export const createSalesAgent = api<CreateSalesAgentRequest, CreateSalesAgentResponse>(
  { expose: true, auth: true, method: "POST", path: "/sales/agents" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.email.trim()) throw APIError.invalidArgument("email is required");
    if (req.password.length < 8) throw APIError.invalidArgument("password must be at least 8 characters");

    const existing = await db.queryRow<{ user_id: string }>`
      SELECT user_id FROM users WHERE email = ${req.email.trim().toLowerCase()}
    `;
    if (existing) throw APIError.alreadyExists("email already registered");

    const passwordHash = await bcrypt.hash(req.password, 12);

    const userRow = await db.queryRow<{ user_id: string }>`
      INSERT INTO users (email, password_hash, role, is_verified)
      VALUES (${req.email.trim().toLowerCase()}, ${passwordHash}, 'SALES', true)
      RETURNING user_id
    `;

    await db.exec`
      INSERT INTO sales_agents (user_id, granted_by, notes)
      VALUES (${userRow!.user_id}, ${auth.userID}, ${req.notes ?? null})
    `;

    return { userId: userRow!.user_id, email: req.email.trim().toLowerCase() };
  }
);

export interface DeleteSalesAgentRequest {
  userId: string;
}

export const deleteSalesAgent = api<DeleteSalesAgentRequest, void>(
  { expose: true, auth: true, method: "DELETE", path: "/sales/agents/:userId" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    await db.exec`DELETE FROM sales_agents WHERE user_id = ${req.userId}`;
  }
);
