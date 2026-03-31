import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdmin } from "./guard";

export interface DemoLead {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface ListDemoLeadsResponse {
  leads: DemoLead[];
}

export const listDemoLeads = api(
  { expose: true, method: "GET", path: "/admin/demo-leads", auth: true },
  async (): Promise<ListDemoLeadsResponse> => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const rows = await db.queryAll<{
      id: string;
      name: string;
      email: string;
      role: string;
      created_at: Date;
    }>`
      SELECT id, name, email, role, created_at
      FROM demo_leads
      ORDER BY created_at DESC
    `;

    return {
      leads: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        createdAt: r.created_at,
      })),
    };
  }
);
