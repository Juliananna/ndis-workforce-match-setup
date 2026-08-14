import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface InterviewRequest {
  id: string;
  employerId: string;
  workerId: string;
  scheduledAt: Date;
  durationMinutes: number;
  location: string | null;
  notes: string | null;
  status: "Pending" | "Confirmed" | "Declined" | "Cancelled";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInterviewRequestParams {
  workerId: string;
  scheduledAt: Date;
  durationMinutes?: number;
  location?: string;
  notes?: string;
}

export interface ListInterviewRequestsResponse {
  requests: InterviewRequest[];
}

export interface CancelInterviewRequestParams {
  requestId: string;
}

function mapRow(row: {
  id: string;
  employer_id: string;
  worker_id: string;
  scheduled_at: Date;
  duration_minutes: number;
  location: string | null;
  notes: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}): InterviewRequest {
  return {
    id: row.id,
    employerId: row.employer_id,
    workerId: row.worker_id,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    location: row.location,
    notes: row.notes,
    status: row.status as InterviewRequest["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const requestInterview = api<CreateInterviewRequestParams, InterviewRequest>(
  { expose: true, auth: true, method: "POST", path: "/employers/interview-requests" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can request interviews");
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE worker_id = ${req.workerId}
    `;
    if (!worker) throw APIError.notFound("worker not found");

    if (new Date(req.scheduledAt) < new Date()) {
      throw APIError.invalidArgument("interview must be scheduled in the future");
    }

    const duration = req.durationMinutes ?? 30;
    if (duration < 15 || duration > 240) {
      throw APIError.invalidArgument("duration must be between 15 and 240 minutes");
    }

    const row = await db.queryRow<{
      id: string;
      employer_id: string;
      worker_id: string;
      scheduled_at: Date;
      duration_minutes: number;
      location: string | null;
      notes: string | null;
      status: string;
      created_at: Date;
      updated_at: Date;
    }>`
      INSERT INTO interview_requests (employer_id, worker_id, scheduled_at, duration_minutes, location, notes)
      VALUES (${employer.employer_id}, ${req.workerId}, ${req.scheduledAt}, ${duration}, ${req.location ?? null}, ${req.notes ?? null})
      RETURNING id, employer_id, worker_id, scheduled_at, duration_minutes, location, notes, status, created_at, updated_at
    `;
    if (!row) throw APIError.internal("failed to create interview request");

    return mapRow(row);
  }
);

export const listInterviewRequests = api<void, ListInterviewRequestsResponse>(
  { expose: true, auth: true, method: "GET", path: "/employers/interview-requests" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can view interview requests");
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const rows = await db.queryAll<{
      id: string;
      employer_id: string;
      worker_id: string;
      scheduled_at: Date;
      duration_minutes: number;
      location: string | null;
      notes: string | null;
      status: string;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT id, employer_id, worker_id, scheduled_at, duration_minutes, location, notes, status, created_at, updated_at
      FROM interview_requests
      WHERE employer_id = ${employer.employer_id}
      ORDER BY scheduled_at ASC
    `;

    return { requests: rows.map(mapRow) };
  }
);

export const cancelInterviewRequest = api<CancelInterviewRequestParams, InterviewRequest>(
  { expose: true, auth: true, method: "POST", path: "/employers/interview-requests/:requestId/cancel" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can cancel interview requests");
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const row = await db.queryRow<{
      id: string;
      employer_id: string;
      worker_id: string;
      scheduled_at: Date;
      duration_minutes: number;
      location: string | null;
      notes: string | null;
      status: string;
      created_at: Date;
      updated_at: Date;
    }>`
      UPDATE interview_requests
      SET status = 'Cancelled', updated_at = NOW()
      WHERE id = ${req.requestId} AND employer_id = ${employer.employer_id} AND status = 'Pending'
      RETURNING id, employer_id, worker_id, scheduled_at, duration_minutes, location, notes, status, created_at, updated_at
    `;
    if (!row) throw APIError.notFound("interview request not found or already cancelled");

    return mapRow(row);
  }
);
