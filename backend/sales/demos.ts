import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertSalesOrAdmin } from "./guard";

export type DemoStatus = "scheduled" | "completed" | "no_show" | "cancelled";
export type DemoType = "standard" | "employer" | "worker" | "full_platform";

export interface DemoSession {
  id: string;
  prospectName: string;
  prospectEmail: string;
  prospectCompany: string | null;
  prospectPhone: string | null;
  notes: string | null;
  demoType: DemoType;
  status: DemoStatus;
  scheduledAt: Date;
  completedAt: Date | null;
  conductedByEmail: string | null;
  outcome: string | null;
  followUpAt: Date | null;
  createdAt: Date;
}

export interface ListDemosResponse {
  demos: DemoSession[];
}

export const listDemos = api<void, ListDemosResponse>(
  { expose: true, auth: true, method: "GET", path: "/sales/demos" },
  async () => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const rows = await db.queryAll<{
      id: string;
      prospect_name: string;
      prospect_email: string;
      prospect_company: string | null;
      prospect_phone: string | null;
      notes: string | null;
      demo_type: string;
      status: string;
      scheduled_at: Date;
      completed_at: Date | null;
      conducted_by_email: string | null;
      outcome: string | null;
      follow_up_at: Date | null;
      created_at: Date;
    }>`
      SELECT
        d.id, d.prospect_name, d.prospect_email, d.prospect_company, d.prospect_phone,
        d.notes, d.demo_type, d.status, d.scheduled_at, d.completed_at,
        u.email AS conducted_by_email, d.outcome, d.follow_up_at, d.created_at
      FROM sales_demo_sessions d
      LEFT JOIN users u ON u.user_id = d.conducted_by
      ORDER BY d.scheduled_at DESC
    `;

    return {
      demos: rows.map((r) => ({
        id: r.id,
        prospectName: r.prospect_name,
        prospectEmail: r.prospect_email,
        prospectCompany: r.prospect_company,
        prospectPhone: r.prospect_phone,
        notes: r.notes,
        demoType: r.demo_type as DemoType,
        status: r.status as DemoStatus,
        scheduledAt: r.scheduled_at,
        completedAt: r.completed_at,
        conductedByEmail: r.conducted_by_email,
        outcome: r.outcome,
        followUpAt: r.follow_up_at,
        createdAt: r.created_at,
      })),
    };
  }
);

export interface CreateDemoRequest {
  prospectName: string;
  prospectEmail: string;
  prospectCompany?: string;
  prospectPhone?: string;
  notes?: string;
  demoType: DemoType;
  scheduledAt: Date;
  followUpAt?: Date;
}

export interface CreateDemoResponse {
  demo: DemoSession;
}

export const createDemo = api<CreateDemoRequest, CreateDemoResponse>(
  { expose: true, auth: true, method: "POST", path: "/sales/demos" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    if (!req.prospectName.trim()) throw APIError.invalidArgument("prospect name is required");
    if (!req.prospectEmail.trim()) throw APIError.invalidArgument("prospect email is required");

    const row = await db.queryRow<{
      id: string;
      prospect_name: string;
      prospect_email: string;
      prospect_company: string | null;
      prospect_phone: string | null;
      notes: string | null;
      demo_type: string;
      status: string;
      scheduled_at: Date;
      completed_at: Date | null;
      outcome: string | null;
      follow_up_at: Date | null;
      created_at: Date;
    }>`
      INSERT INTO sales_demo_sessions
        (prospect_name, prospect_email, prospect_company, prospect_phone, notes, demo_type, scheduled_at, follow_up_at, conducted_by)
      VALUES
        (${req.prospectName.trim()}, ${req.prospectEmail.trim()}, ${req.prospectCompany ?? null},
         ${req.prospectPhone ?? null}, ${req.notes ?? null}, ${req.demoType},
         ${req.scheduledAt}, ${req.followUpAt ?? null}, ${auth.userID})
      RETURNING *
    `;

    return {
      demo: {
        id: row!.id,
        prospectName: row!.prospect_name,
        prospectEmail: row!.prospect_email,
        prospectCompany: row!.prospect_company,
        prospectPhone: row!.prospect_phone,
        notes: row!.notes,
        demoType: row!.demo_type as DemoType,
        status: row!.status as DemoStatus,
        scheduledAt: row!.scheduled_at,
        completedAt: row!.completed_at,
        conductedByEmail: auth.email,
        outcome: row!.outcome,
        followUpAt: row!.follow_up_at,
        createdAt: row!.created_at,
      },
    };
  }
);

export interface UpdateDemoStatusRequest {
  demoId: string;
  status: DemoStatus;
  outcome?: string;
}

export const updateDemoStatus = api<UpdateDemoStatusRequest, void>(
  { expose: true, auth: true, method: "POST", path: "/sales/demos/:demoId/status" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const validStatuses: DemoStatus[] = ["scheduled", "completed", "no_show", "cancelled"];
    if (!validStatuses.includes(req.status)) throw APIError.invalidArgument("invalid status");

    const completedAt = req.status === "completed" ? new Date() : null;

    const row = await db.queryRow<{ id: string }>`
      UPDATE sales_demo_sessions
      SET status = ${req.status},
          outcome = ${req.outcome ?? null},
          completed_at = ${completedAt}
      WHERE id = ${req.demoId}
      RETURNING id
    `;
    if (!row) throw APIError.notFound("demo not found");
  }
);

export interface DeleteDemoRequest {
  demoId: string;
}

export const deleteDemo = api<DeleteDemoRequest, void>(
  { expose: true, auth: true, method: "DELETE", path: "/sales/demos/:demoId" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    await db.exec`DELETE FROM sales_demo_sessions WHERE id = ${req.demoId}`;
  }
);
