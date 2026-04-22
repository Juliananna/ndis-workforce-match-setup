import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface JobInterestRequest {
  jobId: string;
  note?: string;
}

export interface JobInterestResponse {
  interestId: string;
  jobId: string;
  workerId: string;
  note: string | null;
  createdAt: Date;
}

export const expressJobInterest = api<JobInterestRequest, JobInterestResponse>(
  { expose: true, auth: true, method: "POST", path: "/jobs/:jobId/express-interest" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can express interest in jobs");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const job = await db.queryRow<{ job_id: string; status: string }>`
      SELECT job_id, status FROM job_requests WHERE job_id = ${req.jobId}
    `;
    if (!job) throw APIError.notFound("job not found");
    if (job.status !== "Open") throw APIError.failedPrecondition("this job is no longer open");

    const row = await db.queryRow<{
      id: string;
      job_id: string;
      worker_id: string;
      note: string | null;
      created_at: Date;
    }>`
      INSERT INTO job_interest (job_id, worker_id, note)
      VALUES (${req.jobId}, ${worker.worker_id}, ${req.note ?? null})
      ON CONFLICT (job_id, worker_id) DO UPDATE SET note = EXCLUDED.note
      RETURNING id, job_id, worker_id, note, created_at
    `;

    if (!row) throw APIError.internal("failed to record interest");

    return {
      interestId: row.id,
      jobId: row.job_id,
      workerId: row.worker_id,
      note: row.note,
      createdAt: row.created_at,
    };
  }
);

export interface ListJobInterestRequest {
  jobId: string;
}

export interface JobInterestEntry {
  interestId: string;
  jobId: string;
  workerId: string;
  workerName: string;
  note: string | null;
  createdAt: Date;
}

export interface ListJobInterestResponse {
  interests: JobInterestEntry[];
}

export const listJobInterest = api<ListJobInterestRequest, ListJobInterestResponse>(
  { expose: true, auth: true, method: "GET", path: "/jobs/:jobId/express-interest" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can view job interest");
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const job = await db.queryRow<{ job_id: string }>`
      SELECT job_id FROM job_requests
      WHERE job_id = ${req.jobId} AND employer_id = ${employer.employer_id}
    `;
    if (!job) throw APIError.notFound("job not found or not owned by this employer");

    const rows = await db.queryAll<{
      id: string;
      job_id: string;
      worker_id: string;
      name: string;
      note: string | null;
      created_at: Date;
    }>`
      SELECT ji.id, ji.job_id, ji.worker_id, w.name, ji.note, ji.created_at
      FROM job_interest ji
      JOIN workers w ON w.worker_id = ji.worker_id
      JOIN users u ON u.user_id = w.user_id
      WHERE ji.job_id = ${req.jobId}
        AND u.is_demo = FALSE
      ORDER BY ji.created_at ASC
    `;

    return {
      interests: rows.map((r) => ({
        interestId: r.id,
        jobId: r.job_id,
        workerId: r.worker_id,
        workerName: r.name,
        note: r.note,
        createdAt: r.created_at,
      })),
    };
  }
);
