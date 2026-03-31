import { api } from "encore.dev/api";
import db from "../db";
import { upsertContact } from "../ghl/client";

export interface RegisterDemoLeadRequest {
  name: string;
  email: string;
  role: string;
}

export interface RegisterDemoLeadResponse {
  id: string;
}

export const registerDemoLead = api<RegisterDemoLeadRequest, RegisterDemoLeadResponse>(
  { expose: true, method: "POST", path: "/demo/leads" },
  async (req) => {
    const row = await db.queryRow<{ id: string }>`
      INSERT INTO demo_leads (name, email, role)
      VALUES (${req.name}, ${req.email}, ${req.role})
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    let id: string;
    if (!row) {
      const existing = await db.queryRow<{ id: string }>`
        SELECT id FROM demo_leads WHERE email = ${req.email}
      `;
      id = existing!.id;
    } else {
      id = row.id;

      const nameParts = req.name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? req.name;
      const lastName = nameParts.slice(1).join(" ") || undefined;

      upsertContact({
        email: req.email,
        firstName,
        lastName,
        name: req.name,
        tags: ["demo-lead", "ndis-platform", req.role.toLowerCase()],
        source: "Demo Portal",
      }).catch(() => {});
    }

    return { id };
  }
);
