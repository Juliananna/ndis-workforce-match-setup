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

export interface UpdateSalesAgentRequest {
  userId: string;
  email?: string;
  password?: string;
  notes?: string;
}

export interface UpdateSalesAgentResponse {
  userId: string;
  email: string;
  notes: string | null;
}

export const updateSalesAgent = api<UpdateSalesAgentRequest, UpdateSalesAgentResponse>(
  { expose: true, auth: true, method: "PATCH", path: "/sales/agents/:userId" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const existing = await db.queryRow<{ user_id: string; email: string; notes: string | null }>`
      SELECT sa.user_id, u.email, sa.notes
      FROM sales_agents sa
      JOIN users u ON u.user_id = sa.user_id
      WHERE sa.user_id = ${req.userId}
    `;
    if (!existing) throw APIError.notFound("sales agent not found");

    if (req.email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email)) throw APIError.invalidArgument("valid email is required");
      const conflict = await db.queryRow<{ user_id: string }>`
        SELECT user_id FROM users WHERE email = ${req.email.trim().toLowerCase()} AND user_id != ${req.userId}
      `;
      if (conflict) throw APIError.alreadyExists("email already in use");
      await db.exec`UPDATE users SET email = ${req.email.trim().toLowerCase()} WHERE user_id = ${req.userId}`;
    }

    if (req.password !== undefined) {
      if (req.password.length < 8) throw APIError.invalidArgument("password must be at least 8 characters");
      const hash = await bcrypt.hash(req.password, 12);
      await db.exec`UPDATE users SET password_hash = ${hash} WHERE user_id = ${req.userId}`;
    }

    if (req.notes !== undefined) {
      await db.exec`UPDATE sales_agents SET notes = ${req.notes || null} WHERE user_id = ${req.userId}`;
    }

    const updated = await db.queryRow<{ email: string; notes: string | null }>`
      SELECT u.email, sa.notes FROM sales_agents sa JOIN users u ON u.user_id = sa.user_id WHERE sa.user_id = ${req.userId}
    `;

    return { userId: req.userId, email: updated!.email, notes: updated!.notes };
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
