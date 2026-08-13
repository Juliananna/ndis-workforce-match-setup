import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface WorkerContactInfoRequest {
  workerId: string;
}

export interface WorkerContactInfoResponse {
  email: string;
  phone: string;
  name: string;
}

export const getWorkerContactInfo = api<WorkerContactInfoRequest, WorkerContactInfoResponse>(
  { expose: true, auth: true, method: "GET", path: "/employers/workers/:workerId/contact" },
  async ({ workerId }) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can access worker contact info");
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const agreement = await db.queryRow<{ offer_id: string }>`
      SELECT offer_id FROM offers
      WHERE employer_id = ${employer.employer_id}
        AND worker_id = ${workerId}
        AND status = 'Accepted'
      LIMIT 1
    `;
    if (!agreement) {
      throw APIError.permissionDenied(
        "worker contact info is only available after an offer has been accepted"
      );
    }

    const row = await db.queryRow<{ email: string; phone: string; name: string; full_name: string | null }>`
      SELECT u.email, w.phone, w.name, w.full_name
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      WHERE w.worker_id = ${workerId}
    `;
    if (!row) throw APIError.notFound("worker not found");

    return {
      email: row.email,
      phone: row.phone,
      name: row.full_name || row.name,
    };
  }
);
