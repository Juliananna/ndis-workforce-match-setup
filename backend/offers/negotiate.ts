import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { mapOfferRow, getOfferHistory } from "./helpers";
import type { Offer } from "./types";
import { offerEmailTopic } from "./topic";

export interface EmployerNegotiateRequest {
  offerId: string;
  action: "accept_rate" | "counter_rate" | "cancel";
  counterRate?: number;
  note?: string;
}

export const employerNegotiate = api<EmployerNegotiateRequest, Offer>(
  { expose: true, auth: true, method: "POST", path: "/offers/:offerId/negotiate" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can negotiate offers");
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const offer = await db.queryRow<{
      offer_id: string;
      employer_id: string;
      status: string;
      negotiated_rate: number | null;
    }>`
      SELECT offer_id, employer_id, status, negotiated_rate
      FROM offers
      WHERE offer_id = ${req.offerId}
    `;
    if (!offer) throw APIError.notFound("offer not found");
    if (offer.employer_id !== employer.employer_id) throw APIError.permissionDenied("not authorized to manage this offer");

    if (req.action === "cancel") {
      const cancellableStatuses = ["Pending", "Negotiating", "Accepted"];
      if (!cancellableStatuses.includes(offer.status)) {
        throw APIError.failedPrecondition(`cannot cancel an offer with status '${offer.status}'`);
      }
    } else {
      if (offer.status !== "Negotiating") {
        throw APIError.failedPrecondition(`can only accept_rate or counter_rate when status is 'Negotiating', current: '${offer.status}'`);
      }
    }

    let newStatus: string;
    let eventType: string;
    let rate: number | null = null;

    if (req.action === "accept_rate") {
      newStatus = "Accepted";
      eventType = "ACCEPTED";
      rate = offer.negotiated_rate;
    } else if (req.action === "counter_rate") {
      if (req.counterRate == null || req.counterRate < 0) {
        throw APIError.invalidArgument("counterRate must be non-negative when countering");
      }
      newStatus = "Negotiating";
      eventType = "RATE_PROPOSED";
      rate = req.counterRate;
    } else if (req.action === "cancel") {
      newStatus = "Cancelled";
      eventType = "CANCELLED";
    } else {
      throw APIError.invalidArgument("invalid action");
    }

    type OfferRow = {
      offer_id: string;
      job_id: string;
      employer_id: string;
      worker_id: string;
      snapshot_location: string;
      snapshot_shift_date: string;
      snapshot_shift_start_time: string;
      snapshot_shift_duration_hours: number;
      snapshot_support_type_tags: string[] | null;
      snapshot_client_notes: string | null;
      snapshot_behavioural_considerations: string | null;
      snapshot_medical_requirements: string | null;
      offered_rate: number;
      negotiated_rate: number | null;
      latest_proposed_by: string | null;
      status: string;
      additional_notes: string | null;
      created_at: Date;
      updated_at: Date;
    };

    let updated: OfferRow | null;
    if (req.action === "counter_rate") {
      updated = await db.queryRow<OfferRow>`
        UPDATE offers
        SET status = ${newStatus}, negotiated_rate = ${rate}, latest_proposed_by = 'EMPLOYER', updated_at = NOW()
        WHERE offer_id = ${req.offerId}
        RETURNING offer_id, job_id, employer_id, worker_id,
          snapshot_location, snapshot_shift_date::text, snapshot_shift_start_time, snapshot_shift_duration_hours,
          snapshot_support_type_tags, snapshot_client_notes, snapshot_behavioural_considerations, snapshot_medical_requirements,
          offered_rate, negotiated_rate, latest_proposed_by, status, additional_notes, created_at, updated_at
      `;
    } else {
      updated = await db.queryRow<OfferRow>`
        UPDATE offers
        SET status = ${newStatus}, latest_proposed_by = 'EMPLOYER', updated_at = NOW()
        WHERE offer_id = ${req.offerId}
        RETURNING offer_id, job_id, employer_id, worker_id,
          snapshot_location, snapshot_shift_date::text, snapshot_shift_start_time, snapshot_shift_duration_hours,
          snapshot_support_type_tags, snapshot_client_notes, snapshot_behavioural_considerations, snapshot_medical_requirements,
          offered_rate, negotiated_rate, latest_proposed_by, status, additional_notes, created_at, updated_at
      `;
    }
    if (!updated) throw APIError.internal("failed to update offer");

    await db.exec`
      INSERT INTO offer_negotiation_events (offer_id, actor, event_type, rate, note)
      VALUES (${req.offerId}, 'EMPLOYER', ${eventType}, ${rate}, ${req.note ?? null})
    `;

    const emailableActions = ["accept_rate", "counter_rate"] as const;
    if ((emailableActions as readonly string[]).includes(req.action)) {
      const workerUser = await db.queryRow<{ user_id: string }>`
        SELECT u.user_id FROM users u
        JOIN workers w ON w.user_id = u.user_id
        WHERE w.worker_id = ${updated.worker_id}
      `;
      if (workerUser) {
        const offerEventType = req.action === "accept_rate" ? "OFFER_ACCEPTED" : "RATE_PROPOSED";
        await offerEmailTopic.publish({
          eventType: offerEventType,
          offerId: updated.offer_id,
          jobId: updated.job_id,
          recipientUserId: workerUser.user_id,
          recipientRole: "WORKER",
          location: updated.snapshot_location,
          shiftDate: updated.snapshot_shift_date,
          shiftStartTime: updated.snapshot_shift_start_time,
          offeredRate: updated.offered_rate,
          proposedRate: rate ?? undefined,
          notes: req.note,
        });
      }
    }

    const result = mapOfferRow(updated);
    result.history = await getOfferHistory(req.offerId);
    return result;
  }
);
