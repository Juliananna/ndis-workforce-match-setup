import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { mapOfferRow, getOfferHistory } from "./helpers";
import type { Offer } from "./types";
import { offerEmailTopic } from "./topic";
import { offerDeclinedTopic } from "../notifications/lifecycle_topics";

const ID_TYPES = ["Driver's Licence", "Passport / ID"];
const CERT_TYPES = [
  "NDIS Worker Screening Check", "NDIS Worker Orientation Module",
  "NDIS Code of Conduct acknowledgement", "Infection Control Certificate",
  "First Aid Certificate", "CPR Certificate",
  "Certificate III / IV Disability", "Working With Children Check", "Police Clearance",
];

async function computeWorkerVerificationScore(workerId: string): Promise<number> {
  const [worker, availRow, refsRow, docsRows] = await Promise.all([
    db.queryRow<{ full_name: string | null; location: string | null; bio: string | null; experience_years: number | null; phone: string | null }>`
      SELECT full_name, location, bio, experience_years, phone FROM workers WHERE worker_id = ${workerId}
    `,
    db.queryRow<{ cnt: number }>`SELECT COUNT(*)::int AS cnt FROM worker_availability WHERE worker_id = ${workerId}`,
    db.queryRow<{ cnt: number }>`SELECT COUNT(*)::int AS cnt FROM worker_references WHERE worker_id = ${workerId}`,
    db.queryAll<{ document_type: string }>`SELECT document_type FROM worker_documents WHERE worker_id = ${workerId}`,
  ]);
  if (!worker) return 0;
  const uploadedTypes = new Set(docsRows.map((d) => d.document_type));
  let score = 0;
  if (!!worker.full_name?.trim() && !!worker.location?.trim() && !!worker.bio?.trim() && worker.experience_years !== null && !!worker.phone?.trim()) score += 20;
  if (ID_TYPES.some((t) => uploadedTypes.has(t))) score += 20;
  if (CERT_TYPES.some((t) => uploadedTypes.has(t))) score += 20;
  if ((refsRow?.cnt ?? 0) > 0) score += 20;
  if ((availRow?.cnt ?? 0) > 0) score += 20;
  return score;
}

export interface WorkerRespondRequest {
  offerId: string;
  action: "accept" | "decline" | "propose_rate";
  proposedRate?: number;
  note?: string;
}

export const workerRespond = api<WorkerRespondRequest, Offer>(
  { expose: true, auth: true, method: "POST", path: "/offers/:offerId/respond" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can respond to offers");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    if (req.action === "accept" || req.action === "propose_rate") {
      const verificationScore = await computeWorkerVerificationScore(worker.worker_id);
      if (verificationScore < 80) {
        throw APIError.failedPrecondition(
          "Your profile must be at least 80% complete (Priority Profile tier) to accept or negotiate offers. " +
          "Complete your profile details, upload an ID, add certifications, and set your availability to unlock offers."
        );
      }
    }

    const offer = await db.queryRow<{
      offer_id: string;
      worker_id: string;
      status: string;
      offered_rate: number;
    }>`
      SELECT offer_id, worker_id, status, offered_rate
      FROM offers
      WHERE offer_id = ${req.offerId}
    `;
    if (!offer) throw APIError.notFound("offer not found");
    if (offer.worker_id !== worker.worker_id) throw APIError.permissionDenied("not authorized to respond to this offer");

    const allowedStatuses = ["Pending", "Negotiating"];
    if (!allowedStatuses.includes(offer.status)) {
      throw APIError.failedPrecondition(`cannot respond to an offer with status '${offer.status}'`);
    }

    let newStatus: string;
    let eventType: string;
    let rate: number | null = null;

    if (req.action === "accept") {
      newStatus = "Accepted";
      eventType = "ACCEPTED";
    } else if (req.action === "decline") {
      newStatus = "Declined";
      eventType = "DECLINED";
    } else if (req.action === "propose_rate") {
      if (req.proposedRate == null || req.proposedRate < 0) {
        throw APIError.invalidArgument("proposedRate must be non-negative when proposing a rate");
      }
      newStatus = "Negotiating";
      eventType = "RATE_PROPOSED";
      rate = req.proposedRate;
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
    if (rate !== null) {
      updated = await db.queryRow<OfferRow>`
        UPDATE offers
        SET status = ${newStatus}, negotiated_rate = ${rate}, latest_proposed_by = 'WORKER', updated_at = NOW()
        WHERE offer_id = ${req.offerId}
        RETURNING offer_id, job_id, employer_id, worker_id,
          snapshot_location, snapshot_shift_date::text, snapshot_shift_start_time, snapshot_shift_duration_hours,
          snapshot_support_type_tags, snapshot_client_notes, snapshot_behavioural_considerations, snapshot_medical_requirements,
          offered_rate, negotiated_rate, latest_proposed_by, status, additional_notes, created_at, updated_at
      `;
    } else {
      updated = await db.queryRow<OfferRow>`
        UPDATE offers
        SET status = ${newStatus}, latest_proposed_by = 'WORKER', updated_at = NOW()
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
      VALUES (${req.offerId}, 'WORKER', ${eventType}, ${rate}, ${req.note ?? null})
    `;

    const emailableActions = ["accept", "propose_rate"] as const;
    if ((emailableActions as readonly string[]).includes(req.action)) {
      const employerUser = await db.queryRow<{ user_id: string }>`
        SELECT u.user_id FROM users u
        JOIN employers e ON e.user_id = u.user_id
        WHERE e.employer_id = ${updated.employer_id}
      `;
      if (employerUser) {
        const offerEventType = req.action === "accept" ? "OFFER_ACCEPTED" : "RATE_PROPOSED";
        await offerEmailTopic.publish({
          eventType: offerEventType,
          offerId: updated.offer_id,
          jobId: updated.job_id,
          recipientUserId: employerUser.user_id,
          recipientRole: "EMPLOYER",
          location: updated.snapshot_location,
          shiftDate: updated.snapshot_shift_date,
          shiftStartTime: updated.snapshot_shift_start_time,
          offeredRate: updated.offered_rate,
          proposedRate: rate ?? undefined,
          notes: req.note,
        });
      }
    }

    if (req.action === "decline") {
      const employerUser = await db.queryRow<{ user_id: string }>`
        SELECT u.user_id FROM users u
        JOIN employers e ON e.user_id = u.user_id
        WHERE e.employer_id = ${updated.employer_id}
      `;
      if (employerUser) {
        await offerDeclinedTopic.publish({
          offerId: updated.offer_id,
          recipientUserId: employerUser.user_id,
          declinedByRole: "WORKER",
          location: updated.snapshot_location,
          shiftDate: updated.snapshot_shift_date,
          notes: req.note,
        });
      }
    }

    const result = mapOfferRow(updated);
    result.history = await getOfferHistory(req.offerId);
    return result;
  }
);
