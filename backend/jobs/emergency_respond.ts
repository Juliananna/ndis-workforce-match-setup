import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface ExpressInterestRequest {
  jobId: string;
  note?: string;
}

export interface ExpressInterestResponse {
  responseId: string;
  jobId: string;
  workerId: string;
  note: string | null;
  createdAt: Date;
}

export const expressInterest = api<ExpressInterestRequest, ExpressInterestResponse>(
  { expose: true, auth: true, method: "POST", path: "/jobs/:jobId/interest" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can express interest in shifts");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const job = await db.queryRow<{ job_id: string; is_emergency: boolean; status: string; response_deadline: Date | null }>`
      SELECT job_id, is_emergency, status, response_deadline
      FROM job_requests
      WHERE job_id = ${req.jobId}
    `;
    if (!job) throw APIError.notFound("job request not found");
    if (!job.is_emergency) throw APIError.failedPrecondition("this is not an emergency shift");
    if (job.status !== "Open") throw APIError.failedPrecondition("this shift is no longer open");
    if (job.response_deadline && job.response_deadline < new Date()) {
      throw APIError.failedPrecondition("the response deadline for this shift has passed");
    }

    const row = await db.queryRow<{
      id: string;
      job_id: string;
      worker_id: string;
      note: string | null;
      created_at: Date;
    }>`
      INSERT INTO emergency_shift_responses (job_id, worker_id, note)
      VALUES (${req.jobId}, ${worker.worker_id}, ${req.note ?? null})
      ON CONFLICT (job_id, worker_id) DO UPDATE SET note = EXCLUDED.note
      RETURNING id, job_id, worker_id, note, created_at
    `;

    if (!row) throw APIError.internal("failed to record interest");

    return {
      responseId: row.id,
      jobId: row.job_id,
      workerId: row.worker_id,
      note: row.note,
      createdAt: row.created_at,
    };
  }
);

export interface ListEmergencyResponsesRequest {
  jobId: string;
}

export interface EmergencyShiftResponse {
  responseId: string;
  jobId: string;
  workerId: string;
  workerName: string;
  note: string | null;
  createdAt: Date;
}

export interface ListEmergencyResponsesResponse {
  responses: EmergencyShiftResponse[];
}

export const listEmergencyResponses = api<ListEmergencyResponsesRequest, ListEmergencyResponsesResponse>(
  { expose: true, auth: true, method: "GET", path: "/jobs/:jobId/interest" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can view shift interest responses");
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const job = await db.queryRow<{ job_id: string; employer_id: string }>`
      SELECT job_id, employer_id FROM job_requests
      WHERE job_id = ${req.jobId} AND employer_id = ${employer.employer_id}
    `;
    if (!job) throw APIError.notFound("job request not found or not owned by this employer");

    const rows = await db.queryAll<{
      id: string;
      job_id: string;
      worker_id: string;
      name: string;
      note: string | null;
      created_at: Date;
    }>`
      SELECT esr.id, esr.job_id, esr.worker_id, w.name, esr.note, esr.created_at
      FROM emergency_shift_responses esr
      JOIN workers w ON w.worker_id = esr.worker_id
      WHERE esr.job_id = ${req.jobId}
      ORDER BY esr.created_at ASC
    `;

    return {
      responses: rows.map((r) => ({
        responseId: r.id,
        jobId: r.job_id,
        workerId: r.worker_id,
        workerName: r.name,
        note: r.note,
        createdAt: r.created_at,
      })),
    };
  }
);
