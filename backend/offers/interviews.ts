import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface InterviewBooking {
  id: string;
  offerId: string;
  employerId: string;
  workerId: string;
  suggestedSlots: string[];
  confirmedSlot: string | null;
  workerConfirmedAt: Date | null;
  scheduledAt: Date | null;
  durationMinutes: number;
  location: string | null;
  notes: string | null;
  status: "AwaitingWorker" | "Scheduled" | "Completed" | "Cancelled";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInterviewRequest {
  offerId: string;
  suggestedSlots: string[];
  durationMinutes?: number;
  location?: string;
  notes?: string;
}

export interface ConfirmInterviewSlotRequest {
  offerId: string;
  interviewId: string;
  confirmedSlot: string;
}

export interface ListInterviewsRequest {
  offerId: string;
}

export interface ListInterviewsResponse {
  interviews: InterviewBooking[];
}

export interface CancelInterviewRequest {
  offerId: string;
  interviewId: string;
}

function mapRow(row: {
  id: string;
  offer_id: string;
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
}): InterviewBooking {
  return {
    id: row.id,
    offerId: row.offer_id,
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
    status: row.status as InterviewBooking["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assertOfferEmployerAccess(offerId: string, userId: string): Promise<{ offer_id: string; employer_id: string; worker_id: string; status: string }> {
  const employer = await db.queryRow<{ employer_id: string }>`
    SELECT employer_id FROM employers WHERE user_id = ${userId}
  `;
  if (!employer) throw APIError.notFound("employer profile not found");

  const offer = await db.queryRow<{ offer_id: string; employer_id: string; worker_id: string; status: string }>`
    SELECT offer_id, employer_id, worker_id, status FROM offers WHERE offer_id = ${offerId}
  `;
  if (!offer) throw APIError.notFound("offer not found");
  if (offer.employer_id !== employer.employer_id) {
    throw APIError.permissionDenied("not authorized to manage this offer");
  }
  return offer;
}

async function assertOfferAccess(offerId: string, userId: string, role: string): Promise<void> {
  if (role === "EMPLOYER") {
    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${userId}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");
    const offer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM offers WHERE offer_id = ${offerId}
    `;
    if (!offer || offer.employer_id !== employer.employer_id) {
      throw APIError.permissionDenied("not authorized");
    }
  } else if (role === "WORKER") {
    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${userId}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");
    const offer = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM offers WHERE offer_id = ${offerId}
    `;
    if (!offer || offer.worker_id !== worker.worker_id) {
      throw APIError.permissionDenied("not authorized");
    }
  } else {
    throw APIError.permissionDenied("not authorized");
  }
}

export const createInterview = api<CreateInterviewRequest, InterviewBooking>(
  { expose: true, auth: true, method: "POST", path: "/offers/:offerId/interviews" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can book interviews");
    }

    const offer = await assertOfferEmployerAccess(req.offerId, auth.userID);
    if (!["Pending", "Negotiating", "Accepted"].includes(offer.status)) {
      throw APIError.failedPrecondition("can only book interviews on active offers");
    }

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
      offer_id: string;
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
      INSERT INTO interview_bookings (offer_id, employer_id, worker_id, suggested_slots, duration_minutes, location, notes)
      VALUES (${req.offerId}, ${offer.employer_id}, ${offer.worker_id}, ${slotsJson}::jsonb, ${duration}, ${req.location ?? null}, ${req.notes ?? null})
      RETURNING id, offer_id, employer_id, worker_id, suggested_slots, confirmed_slot, worker_confirmed_at, scheduled_at, duration_minutes, location, notes, status, created_at, updated_at
    `;
    if (!row) throw APIError.internal("failed to create interview booking");

    return mapRow(row);
  }
);

export const confirmInterviewSlot = api<ConfirmInterviewSlotRequest, InterviewBooking>(
  { expose: true, auth: true, method: "POST", path: "/offers/:offerId/interviews/:interviewId/confirm" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can confirm interview slots");
    }
    await assertOfferAccess(req.offerId, auth.userID, "WORKER");

    const existing = await db.queryRow<{ status: string; suggested_slots: string[] | null }>`
      SELECT status, suggested_slots FROM interview_bookings
      WHERE id = ${req.interviewId} AND offer_id = ${req.offerId}
    `;
    if (!existing) throw APIError.notFound("interview not found");
    if (existing.status !== "AwaitingWorker") {
      throw APIError.failedPrecondition("interview is not awaiting worker confirmation");
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
      offer_id: string;
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
      UPDATE interview_bookings
      SET
        status = 'Scheduled',
        confirmed_slot = ${req.confirmedSlot}::timestamptz,
        scheduled_at = ${req.confirmedSlot}::timestamptz,
        worker_confirmed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${req.interviewId} AND offer_id = ${req.offerId} AND status = 'AwaitingWorker'
      RETURNING id, offer_id, employer_id, worker_id, suggested_slots, confirmed_slot, worker_confirmed_at, scheduled_at, duration_minutes, location, notes, status, created_at, updated_at
    `;
    if (!row) throw APIError.notFound("interview not found or already confirmed");

    return mapRow(row);
  }
);

export const listInterviews = api<ListInterviewsRequest, ListInterviewsResponse>(
  { expose: true, auth: true, method: "GET", path: "/offers/:offerId/interviews" },
  async ({ offerId }) => {
    const auth = getAuthData()!;
    await assertOfferAccess(offerId, auth.userID, auth.role);

    const rows = await db.queryAll<{
      id: string;
      offer_id: string;
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
      SELECT id, offer_id, employer_id, worker_id, suggested_slots, confirmed_slot, worker_confirmed_at, scheduled_at, duration_minutes, location, notes, status, created_at, updated_at
      FROM interview_bookings
      WHERE offer_id = ${offerId}
      ORDER BY created_at ASC
    `;

    return { interviews: rows.map(mapRow) };
  }
);

export const cancelInterview = api<CancelInterviewRequest, InterviewBooking>(
  { expose: true, auth: true, method: "POST", path: "/offers/:offerId/interviews/:interviewId/cancel" },
  async (req) => {
    const auth = getAuthData()!;
    await assertOfferAccess(req.offerId, auth.userID, auth.role);

    const row = await db.queryRow<{
      id: string;
      offer_id: string;
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
      UPDATE interview_bookings
      SET status = 'Cancelled', updated_at = NOW()
      WHERE id = ${req.interviewId} AND offer_id = ${req.offerId} AND status IN ('AwaitingWorker', 'Scheduled')
      RETURNING id, offer_id, employer_id, worker_id, suggested_slots, confirmed_slot, worker_confirmed_at, scheduled_at, duration_minutes, location, notes, status, created_at, updated_at
    `;
    if (!row) throw APIError.notFound("interview booking not found or already cancelled");

    return mapRow(row);
  }
);
