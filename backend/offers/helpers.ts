import db from "../db";
import type { Offer, NegotiationEvent } from "./types";

export function mapOfferRow(row: {
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
}): Offer {
  return {
    offerId: row.offer_id,
    jobId: row.job_id,
    employerId: row.employer_id,
    workerId: row.worker_id,
    snapshotLocation: row.snapshot_location,
    snapshotShiftDate: row.snapshot_shift_date,
    snapshotShiftStartTime: row.snapshot_shift_start_time,
    snapshotShiftDurationHours: row.snapshot_shift_duration_hours,
    snapshotSupportTypeTags: row.snapshot_support_type_tags ?? [],
    snapshotClientNotes: row.snapshot_client_notes,
    snapshotBehaviouralConsiderations: row.snapshot_behavioural_considerations,
    snapshotMedicalRequirements: row.snapshot_medical_requirements,
    offeredRate: row.offered_rate,
    negotiatedRate: row.negotiated_rate,
    latestProposedBy: row.latest_proposed_by as Offer["latestProposedBy"],
    status: row.status as Offer["status"],
    additionalNotes: row.additional_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventRow(row: {
  event_id: string;
  offer_id: string;
  actor: string;
  event_type: string;
  rate: number | null;
  note: string | null;
  created_at: Date;
}): NegotiationEvent {
  return {
    eventId: row.event_id,
    offerId: row.offer_id,
    actor: row.actor as NegotiationEvent["actor"],
    eventType: row.event_type as NegotiationEvent["eventType"],
    rate: row.rate,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function getOfferHistory(offerId: string): Promise<NegotiationEvent[]> {
  const events: NegotiationEvent[] = [];
  const rows = db.query<{
    event_id: string;
    offer_id: string;
    actor: string;
    event_type: string;
    rate: number | null;
    note: string | null;
    created_at: Date;
  }>`
    SELECT event_id, offer_id, actor, event_type, rate, note, created_at
    FROM offer_negotiation_events
    WHERE offer_id = ${offerId}
    ORDER BY created_at ASC
  `;
  for await (const row of rows) {
    events.push(mapEventRow(row));
  }
  return events;
}
