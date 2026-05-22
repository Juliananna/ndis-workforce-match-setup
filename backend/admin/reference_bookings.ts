import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdminOrCompliance } from "./guard";

export interface ReferenceCallBooking {
  id: string;
  referenceId: string;
  officerUserId: string;
  officerEmail: string;
  scheduledAt: Date;
  notes: string | null;
  status: "Scheduled" | "Completed" | "Cancelled";
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingReferenceItem {
  referenceId: string;
  workerId: string;
  workerName: string;
  workerEmail: string;
  refereeName: string;
  refereeTitle: string;
  refereeOrganisation: string;
  refereeEmail: string | null;
  refereePhone: string | null;
  relationship: string;
  referenceStatus: string;
  referenceCreatedAt: Date;
  referenceNotes: string | null;
  booking: ReferenceCallBooking | null;
}

export interface ListPendingReferencesResponse {
  items: PendingReferenceItem[];
}

export const adminListPendingReferences = api<void, ListPendingReferencesResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/references/pending" },
  async () => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const rows = await db.queryAll<{
      reference_id: string;
      worker_id: string;
      worker_name: string;
      worker_email: string;
      referee_name: string;
      referee_title: string;
      referee_organisation: string;
      referee_email: string | null;
      referee_phone: string | null;
      relationship: string;
      ref_status: string;
      ref_created_at: Date;
      ref_notes: string | null;
      booking_id: string | null;
      officer_user_id: string | null;
      officer_email: string | null;
      scheduled_at: Date | null;
      booking_notes: string | null;
      booking_status: string | null;
      booking_created_at: Date | null;
      booking_updated_at: Date | null;
    }>`
      SELECT
        wr.id AS reference_id,
        wr.worker_id,
        w.name AS worker_name,
        u.email AS worker_email,
        wr.referee_name,
        wr.referee_title,
        wr.referee_organisation,
        wr.referee_email,
        wr.referee_phone,
        wr.relationship,
        wr.status AS ref_status,
        wr.created_at AS ref_created_at,
        wr.notes AS ref_notes,
        rcb.id AS booking_id,
        rcb.officer_user_id,
        rcb.officer_email,
        rcb.scheduled_at,
        rcb.notes AS booking_notes,
        rcb.status AS booking_status,
        rcb.created_at AS booking_created_at,
        rcb.updated_at AS booking_updated_at
      FROM worker_references wr
      JOIN workers w ON w.worker_id = wr.worker_id
      JOIN users u ON u.user_id = w.user_id
      LEFT JOIN LATERAL (
        SELECT * FROM reference_call_bookings
        WHERE reference_id = wr.id
          AND status = 'Scheduled'
        ORDER BY scheduled_at ASC
        LIMIT 1
      ) rcb ON TRUE
      WHERE wr.status IN ('Pending', 'Contacted')
        AND u.is_demo = FALSE
      ORDER BY rcb.scheduled_at ASC NULLS LAST, wr.created_at ASC
    `;

    return {
      items: rows.map((r) => ({
        referenceId: r.reference_id,
        workerId: r.worker_id,
        workerName: r.worker_name,
        workerEmail: r.worker_email,
        refereeName: r.referee_name,
        refereeTitle: r.referee_title,
        refereeOrganisation: r.referee_organisation,
        refereeEmail: r.referee_email,
        refereePhone: r.referee_phone,
        relationship: r.relationship,
        referenceStatus: r.ref_status,
        referenceCreatedAt: r.ref_created_at,
        referenceNotes: r.ref_notes,
        booking: r.booking_id
          ? {
              id: r.booking_id,
              referenceId: r.reference_id,
              officerUserId: r.officer_user_id!,
              officerEmail: r.officer_email!,
              scheduledAt: r.scheduled_at!,
              notes: r.booking_notes,
              status: r.booking_status as "Scheduled" | "Completed" | "Cancelled",
              createdAt: r.booking_created_at!,
              updatedAt: r.booking_updated_at!,
            }
          : null,
      })),
    };
  }
);

export interface ListUpcomingBookingsResponse {
  bookings: (ReferenceCallBooking & {
    workerName: string;
    workerEmail: string;
    refereeName: string;
    refereeOrganisation: string;
    refereePhone: string | null;
  })[];
}

export const adminListUpcomingBookings = api<void, ListUpcomingBookingsResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/references/bookings" },
  async () => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const rows = await db.queryAll<{
      id: string;
      reference_id: string;
      officer_user_id: string;
      officer_email: string;
      scheduled_at: Date;
      notes: string | null;
      status: string;
      created_at: Date;
      updated_at: Date;
      worker_name: string;
      worker_email: string;
      referee_name: string;
      referee_organisation: string;
      referee_phone: string | null;
    }>`
      SELECT
        rcb.id, rcb.reference_id, rcb.officer_user_id, rcb.officer_email,
        rcb.scheduled_at, rcb.notes, rcb.status, rcb.created_at, rcb.updated_at,
        w.name AS worker_name,
        u.email AS worker_email,
        wr.referee_name,
        wr.referee_organisation,
        wr.referee_phone
      FROM reference_call_bookings rcb
      JOIN worker_references wr ON wr.id = rcb.reference_id
      JOIN workers w ON w.worker_id = wr.worker_id
      JOIN users u ON u.user_id = w.user_id
      WHERE rcb.status = 'Scheduled'
        AND rcb.scheduled_at >= NOW() - INTERVAL '1 hour'
      ORDER BY rcb.scheduled_at ASC
    `;

    return {
      bookings: rows.map((r) => ({
        id: r.id,
        referenceId: r.reference_id,
        officerUserId: r.officer_user_id,
        officerEmail: r.officer_email,
        scheduledAt: r.scheduled_at,
        notes: r.notes,
        status: r.status as "Scheduled" | "Completed" | "Cancelled",
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        workerName: r.worker_name,
        workerEmail: r.worker_email,
        refereeName: r.referee_name,
        refereeOrganisation: r.referee_organisation,
        refereePhone: r.referee_phone,
      })),
    };
  }
);

export interface CreateBookingRequest {
  referenceId: string;
  scheduledAt: string;
  notes?: string;
}

export interface CreateBookingResponse {
  booking: ReferenceCallBooking;
}

export const adminCreateBooking = api<CreateBookingRequest, CreateBookingResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/references/:referenceId/bookings" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const officer = await db.queryRow<{ email: string }>`
      SELECT email FROM users WHERE user_id = ${auth.userID}
    `;
    if (!officer) throw APIError.notFound("officer not found");

    const ref = await db.queryRow<{ id: string }>`
      SELECT id FROM worker_references WHERE id = ${req.referenceId}
    `;
    if (!ref) throw APIError.notFound("reference not found");

    const scheduledDate = new Date(req.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw APIError.invalidArgument("invalid scheduledAt date");
    }

    await db.exec`
      UPDATE reference_call_bookings
      SET status = 'Cancelled', updated_at = NOW()
      WHERE reference_id = ${req.referenceId} AND status = 'Scheduled'
    `;

    const row = await db.queryRow<{
      id: string; reference_id: string; officer_user_id: string; officer_email: string;
      scheduled_at: Date; notes: string | null; status: string; created_at: Date; updated_at: Date;
    }>`
      INSERT INTO reference_call_bookings (reference_id, officer_user_id, officer_email, scheduled_at, notes)
      VALUES (${req.referenceId}, ${auth.userID}, ${officer.email}, ${scheduledDate}, ${req.notes ?? null})
      RETURNING *
    `;

    if (!row) throw APIError.internal("failed to create booking");

    await db.exec`
      UPDATE worker_references SET status = 'Contacted', updated_at = NOW()
      WHERE id = ${req.referenceId} AND status = 'Pending'
    `;

    return {
      booking: {
        id: row.id,
        referenceId: row.reference_id,
        officerUserId: row.officer_user_id,
        officerEmail: row.officer_email,
        scheduledAt: row.scheduled_at,
        notes: row.notes,
        status: row.status as "Scheduled" | "Completed" | "Cancelled",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    };
  }
);

export interface UpdateReferenceNotesRequest {
  referenceId: string;
  notes: string;
}

export const adminUpdateReferenceNotes = api<UpdateReferenceNotesRequest, void>(
  { expose: true, auth: true, method: "PATCH", path: "/admin/references/:referenceId/notes" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    if (req.notes.length > 2000) throw APIError.invalidArgument("notes cannot exceed 2000 characters");

    const row = await db.queryRow<{ id: string }>`
      UPDATE worker_references
      SET notes = ${req.notes.trim() || null}, updated_at = NOW()
      WHERE id = ${req.referenceId}
      RETURNING id
    `;
    if (!row) throw APIError.notFound("reference not found");
  }
);

export interface CancelBookingRequest {
  bookingId: string;
}

export const adminCancelBooking = api<CancelBookingRequest, void>(
  { expose: true, auth: true, method: "DELETE", path: "/admin/references/bookings/:bookingId" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const row = await db.queryRow<{ id: string }>`
      UPDATE reference_call_bookings
      SET status = 'Cancelled', updated_at = NOW()
      WHERE id = ${req.bookingId} AND status = 'Scheduled'
      RETURNING id
    `;
    if (!row) throw APIError.notFound("booking not found or already cancelled");
  }
);
