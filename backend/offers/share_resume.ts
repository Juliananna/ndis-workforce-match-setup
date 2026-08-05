import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { mapOfferRow, getOfferHistory } from "./helpers";
import type { Offer } from "./types";

export interface ShareResumeRequest {
  offerId: string;
  share: boolean;
}

export const shareResume = api<ShareResumeRequest, Offer>(
  { expose: true, auth: true, method: "POST", path: "/offers/:offerId/share-resume" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can share their resume");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const offer = await db.queryRow<{ offer_id: string; worker_id: string; status: string }>`
      SELECT offer_id, worker_id, status FROM offers WHERE offer_id = ${req.offerId}
    `;
    if (!offer) throw APIError.notFound("offer not found");
    if (offer.worker_id !== worker.worker_id) throw APIError.permissionDenied("not authorized to manage this offer");
    if (!["Pending", "Negotiating", "Accepted"].includes(offer.status)) {
      throw APIError.failedPrecondition("can only share resume on active offers");
    }

    let resumeSessionId: string | null = null;

    if (req.share) {
      const session = await db.queryRow<{ id: string }>`
        SELECT id FROM resume_sessions
        WHERE converted_worker_id = ${worker.worker_id}
        ORDER BY updated_at DESC
        LIMIT 1
      `;
      if (!session) {
        throw APIError.failedPrecondition("no resume found to share — please complete your resume builder first");
      }
      resumeSessionId = session.id;
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
      seen_at: Date | null;
      resume_shared_at: Date | null;
      resume_session_id: string | null;
    };

    const updated = await db.queryRow<OfferRow>`
      UPDATE offers
      SET
        resume_session_id = ${resumeSessionId},
        resume_shared_at = ${req.share ? new Date() : null},
        updated_at = NOW()
      WHERE offer_id = ${req.offerId}
      RETURNING offer_id, job_id, employer_id, worker_id,
        snapshot_location, snapshot_shift_date::text, snapshot_shift_start_time, snapshot_shift_duration_hours,
        snapshot_support_type_tags, snapshot_client_notes, snapshot_behavioural_considerations, snapshot_medical_requirements,
        offered_rate, negotiated_rate, latest_proposed_by, status, additional_notes, created_at, updated_at, seen_at,
        resume_shared_at, resume_session_id
    `;
    if (!updated) throw APIError.internal("failed to update offer");

    const result = mapOfferRow(updated);
    result.history = await getOfferHistory(req.offerId);
    return result;
  }
);

export interface GetSharedResumeParams {
  offerId: string;
}

export interface GetSharedResumeResponse {
  sessionId: string;
  sharedAt: Date;
}

export const getSharedResume = api<GetSharedResumeParams, GetSharedResumeResponse>(
  { expose: true, auth: true, method: "GET", path: "/offers/:offerId/shared-resume" },
  async ({ offerId }) => {
    const auth = getAuthData()!;

    const offer = await db.queryRow<{
      employer_id: string;
      worker_id: string;
      status: string;
      resume_session_id: string | null;
      resume_shared_at: Date | null;
    }>`
      SELECT employer_id, worker_id, status, resume_session_id, resume_shared_at
      FROM offers WHERE offer_id = ${offerId}
    `;
    if (!offer) throw APIError.notFound("offer not found");

    if (auth.role === "EMPLOYER") {
      const employer = await db.queryRow<{ employer_id: string }>`
        SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
      `;
      if (!employer || employer.employer_id !== offer.employer_id) {
        throw APIError.permissionDenied("not authorized to view this offer");
      }
    } else if (auth.role === "WORKER") {
      const worker = await db.queryRow<{ worker_id: string }>`
        SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
      `;
      if (!worker || worker.worker_id !== offer.worker_id) {
        throw APIError.permissionDenied("not authorized to view this offer");
      }
    } else {
      throw APIError.permissionDenied("not authorized");
    }

    if (!offer.resume_session_id || !offer.resume_shared_at) {
      throw APIError.notFound("no resume has been shared for this offer");
    }

    return {
      sessionId: offer.resume_session_id,
      sharedAt: offer.resume_shared_at,
    };
  }
);
