import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface InterviewRequest {
  id: string;
  employerId: string;
  workerId: string;
  suggestedSlots: string[];
  confirmedSlot: string | null;
  workerConfirmedAt: Date | null;
  scheduledAt: Date | null;
  durationMinutes: number;
  location: string | null;
  notes: string | null;
  status: "AwaitingWorker" | "Confirmed" | "Declined" | "Cancelled";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInterviewRequestParams {
  workerId: string;
  suggestedSlots: string[];
  durationMinutes?: number;
  location?: string;
  notes?: string;
}

export interface ConfirmInterviewRequestSlotParams {
  requestId: string;
  confirmedSlot: string;
}

export interface DeclineInterviewRequestParams {
  requestId: string;
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
  suggested_slots: string[] | null;
  confirmed_slot: Date | null;
  worker_confirmed_at: Date | null;
  scheduled_at: Date | null;
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
    suggestedSlots: typeof row.suggested_slots === "string"
      ? JSON.parse(row.suggested_slots)
      : (row.suggested_slots ?? []),
    confirmedSlot: row.confirmed_slot ? new Date(row.confirmed_slot).toISOString() : null,
    workerConfirmedAt: row.worker_confirmed_at,
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

    if (!req.suggestedSlots || req.suggestedSlots.length === 0) {
      throw APIError.invalidArgument("at least one time slot must be suggested");
    }
    if (req.suggestedSlots.length > 5) {
      throw APIError.invalidArgument("maximum 5 time slots can be suggested");
    }

    const now = new Date();
    for (const slot of req.suggestedSlots) {
      if (new Date(slot) <= now) {
        throw APIError.invalidArgument("all suggested slots must be in the future");
      }
    }

    const duration = req.durationMinutes ?? 30;
    if (duration < 15 || duration > 240) {
      throw APIError.invalidArgument("duration must be between 15 and 240 minutes");
    }

    const slotsJson = JSON.stringify(req.suggestedSlots);

    const row = await db.queryRow<{
      id: string;
      employer_id: string;
      worker_id: string;
      suggested_slots: string[] | null;
      confirmed_slot: Date | null;
      worker_confirmed_at: Date | null;
      scheduled_at: Date | null;
      duration_minutes: number;
      location: string | null;
      notes: string | null;
      status: string;
      created_at: Date;
      updated_at: Date;
    }>`
      INSERT INTO interview_requests (employer_id, worker_id, suggested_slots, duration_minutes, location, notes)
      VALUES (${employer.employer_id}, ${req.workerId}, ${slotsJson}::jsonb, ${duration}, ${req.location ?? null}, ${req.notes ?? null})
      RETURNING id, employer_id, worker_id, suggested_slots, confirmed_slot, worker_confirmed_at, scheduled_at, duration_minutes, location, notes, status, created_at, updated_at
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
      suggested_slots: string[] | null;
      confirmed_slot: Date | null;
      worker_confirmed_at: Date | null;
      scheduled_at: Date | null;
      duration_minutes: number;
      location: string | null;
      notes: string | null;
      status: string;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT id, employer_id, worker_id, suggested_slots, confirmed_slot, worker_confirmed_at, scheduled_at, duration_minutes, location, notes, status, created_at, updated_at
      FROM interview_requests
      WHERE employer_id = ${employer.employer_id}
      ORDER BY created_at ASC
    `;

    return { requests: rows.map(mapRow) };
  }
);

export const listWorkerInterviewRequests = api<void, ListInterviewRequestsResponse>(
  { expose: true, auth: true, method: "GET", path: "/workers/interview-requests" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can view their interview requests");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const rows = await db.queryAll<{
      id: string;
      employer_id: string;
      worker_id: string;
      suggested_slots: string[] | null;
      confirmed_slot: Date | null;
      worker_confirmed_at: Date | null;
      scheduled_at: Date | null;
      duration_minutes: number;
      location: string | null;
      notes: string | null;
      status: string;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT id, employer_id, worker_id, suggested_slots, confirmed_slot, worker_confirmed_at, scheduled_at, duration_minutes, location, notes, status, created_at, updated_at
      FROM interview_requests
      WHERE worker_id = ${worker.worker_id}
      ORDER BY created_at ASC
    `;

    return { requests: rows.map(mapRow) };
  }
);

export const confirmInterviewRequestSlot = api<ConfirmInterviewRequestSlotParams, InterviewRequest>(
  { expose: true, auth: true, method: "POST", path: "/employers/interview-requests/:requestId/confirm" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can confirm interview slots");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const existing = await db.queryRow<{ status: string; suggested_slots: string[] | null; worker_id: string }>`
      SELECT status, suggested_slots, worker_id FROM interview_requests WHERE id = ${req.requestId}
    `;
    if (!existing) throw APIError.notFound("interview request not found");
    if (existing.worker_id !== worker.worker_id) {
      throw APIError.permissionDenied("not authorized");
    }
    if (existing.status !== "AwaitingWorker") {
      throw APIError.failedPrecondition("interview request is not awaiting worker confirmation");
    }

    const slots: string[] = typeof existing.suggested_slots === "string"
      ? JSON.parse(existing.suggested_slots)
      : (existing.suggested_slots ?? []);
    const chosen = new Date(req.confirmedSlot);
    const isValid = slots.some((s) => Math.abs(new Date(s).getTime() - chosen.getTime()) < 1000);
    if (!isValid) {
      throw APIError.invalidArgument("chosen slot is not one of the suggested slots");
    }

    if (chosen <= new Date()) {
      throw APIError.invalidArgument("chosen slot is in the past");
    }

    const row = await db.queryRow<{
      id: string;
      employer_id: string;
      worker_id: string;
      suggested_slots: string[] | null;
      confirmed_slot: Date | null;
      worker_confirmed_at: Date | null;
      scheduled_at: Date | null;
      duration_minutes: number;
      location: string | null;
      notes: string | null;
      status: string;
      created_at: Date;
      updated_at: Date;
    }>`
      UPDATE interview_requests
      SET
        status = 'Confirmed',
        confirmed_slot = ${req.confirmedSlot}::timestamptz,
        scheduled_at = ${req.confirmedSlot}::timestamptz,
        worker_confirmed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${req.requestId} AND status = 'AwaitingWorker'
      RETURNING id, employer_id, worker_id, suggested_slots, confirmed_slot, worker_confirmed_at, scheduled_at, duration_minutes, location, notes, status, created_at, updated_at
    `;
    if (!row) throw APIError.notFound("interview request not found or already processed");

    return mapRow(row);
  }
);

export const declineInterviewRequest = api<DeclineInterviewRequestParams, InterviewRequest>(
  { expose: true, auth: true, method: "POST", path: "/employers/interview-requests/:requestId/decline" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can decline interview requests");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const row = await db.queryRow<{
      id: string;
      employer_id: string;
      worker_id: string;
      suggested_slots: string[] | null;
      confirmed_slot: Date | null;
      worker_confirmed_at: Date | null;
      scheduled_at: Date | null;
      duration_minutes: number;
      location: string | null;
      notes: string | null;
      status: string;
      created_at: Date;
      updated_at: Date;
    }>`
      UPDATE interview_requests
      SET status = 'Declined', updated_at = NOW()
      WHERE id = ${req.requestId} AND worker_id = ${worker.worker_id} AND status = 'AwaitingWorker'
      RETURNING id, employer_id, worker_id, suggested_slots, confirmed_slot, worker_confirmed_at, scheduled_at, duration_minutes, location, notes, status, created_at, updated_at
    `;
    if (!row) throw APIError.notFound("interview request not found or already processed");

    return mapRow(row);
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
      suggested_slots: string[] | null;
      confirmed_slot: Date | null;
      worker_confirmed_at: Date | null;
      scheduled_at: Date | null;
      duration_minutes: number;
      location: string | null;
      notes: string | null;
      status: string;
      created_at: Date;
      updated_at: Date;
    }>`
      UPDATE interview_requests
      SET status = 'Cancelled', updated_at = NOW()
      WHERE id = ${req.requestId} AND employer_id = ${employer.employer_id} AND status IN ('AwaitingWorker', 'Confirmed')
      RETURNING id, employer_id, worker_id, suggested_slots, confirmed_slot, worker_confirmed_at, scheduled_at, duration_minutes, location, notes, status, created_at, updated_at
    `;
    if (!row) throw APIError.notFound("interview request not found or already cancelled");

    return mapRow(row);
  }
);
