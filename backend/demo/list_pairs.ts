import { api } from "encore.dev/api";
import db from "../db";

export interface DemoPairInfo {
  index: number;
  label: string;
  workerEmail: string;
  employerEmail: string;
  workerName: string;
  employerName: string;
}

export interface ListDemoPairsResponse {
  pairs: DemoPairInfo[];
  seeded: boolean;
}

export const listDemoPairs = api<void, ListDemoPairsResponse>(
  { expose: true, method: "GET", path: "/demo/pairs" },
  async () => {
    const pairs = await db.queryAll<{
      label: string;
      worker_user_id: string;
      employer_user_id: string;
    }>`SELECT label, worker_user_id, employer_user_id FROM demo_pairs ORDER BY created_at`;

    if (pairs.length === 0) {
      return { pairs: [], seeded: false };
    }

    const result: DemoPairInfo[] = [];

    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];

      const workerRow = await db.queryRow<{ full_name: string | null; name: string; email: string }>`
        SELECT w.full_name, w.name, u.email
        FROM workers w JOIN users u ON u.user_id = w.user_id
        WHERE w.user_id = ${p.worker_user_id}
      `;

      const employerRow = await db.queryRow<{ organisation_name: string; email: string }>`
        SELECT e.organisation_name, u.email
        FROM employers e JOIN users u ON u.user_id = e.user_id
        WHERE e.user_id = ${p.employer_user_id}
      `;

      result.push({
        index: i,
        label: p.label,
        workerEmail: workerRow?.email ?? "",
        employerEmail: employerRow?.email ?? "",
        workerName: workerRow?.full_name ?? workerRow?.name ?? "",
        employerName: employerRow?.organisation_name ?? "",
      });
    }

    return { pairs: result, seeded: true };
  }
);
