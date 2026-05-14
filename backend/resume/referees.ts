import { api, APIError } from "encore.dev/api";
import db from "../db";
import type { RefereeRecord } from "./types";

interface AddRefereeRequest {
  id: string;
  refereeName: string;
  refereeRole: string;
  organisation?: string;
  relationship: string;
  phone?: string;
  email?: string;
  yearsKnown?: number;
  consentToContact: boolean;
}

interface AddRefereeResponse {
  referee: RefereeRecord;
}

// Adds a referee to a resume session.
export const addReferee = api<AddRefereeRequest, AddRefereeResponse>(
  { expose: true, method: "POST", path: "/resume-sessions/:id/referees" },
  async (req) => {
    const existing = await db.queryRow`SELECT id FROM resume_sessions WHERE id = ${req.id}`;
    if (!existing) throw APIError.notFound("session not found");

    if (!req.refereeName || !req.refereeRole || !req.relationship) {
      throw APIError.invalidArgument("refereeName, refereeRole and relationship are required");
    }

    const row = await db.queryRow<{
      id: string; session_id: string; referee_name: string; referee_role: string; organisation: string | null;
      relationship: string; phone: string | null; email: string | null; years_known: number | null;
      consent_to_contact: boolean; reference_status: string; reference_notes: string | null; created_at: Date;
    }>`
      INSERT INTO resume_session_referees
        (session_id, referee_name, referee_role, organisation, relationship, phone, email, years_known, consent_to_contact)
      VALUES
        (${req.id}, ${req.refereeName}, ${req.refereeRole}, ${req.organisation ?? null},
         ${req.relationship}, ${req.phone ?? null}, ${req.email ?? null}, ${req.yearsKnown ?? null}, ${req.consentToContact})
      RETURNING *
    `;

    await db.exec`
      INSERT INTO resume_audit_log (session_id, event_type, event_data)
      VALUES (${req.id}, 'referee_added', ${JSON.stringify({ refereeName: req.refereeName })}::jsonb)
    `;

    return {
      referee: {
        id: row!.id, sessionId: row!.session_id, refereeName: row!.referee_name, refereeRole: row!.referee_role,
        organisation: row!.organisation, relationship: row!.relationship, phone: row!.phone, email: row!.email,
        yearsKnown: row!.years_known, consentToContact: row!.consent_to_contact, referenceStatus: row!.reference_status,
        referenceNotes: row!.reference_notes, createdAt: row!.created_at,
      },
    };
  }
);

interface UpdateRefereeRequest {
  id: string;
  refereeId: string;
  referenceStatus?: string;
  referenceNotes?: string;
}

interface UpdateRefereeResponse {
  referee: RefereeRecord;
}

// Updates a referee's status or notes (used by admin).
export const updateReferee = api<UpdateRefereeRequest, UpdateRefereeResponse>(
  { expose: true, method: "PATCH", path: "/resume-sessions/:id/referees/:refereeId" },
  async (req) => {
    const row = await db.queryRow<{
      id: string; session_id: string; referee_name: string; referee_role: string; organisation: string | null;
      relationship: string; phone: string | null; email: string | null; years_known: number | null;
      consent_to_contact: boolean; reference_status: string; reference_notes: string | null; created_at: Date;
    }>`
      UPDATE resume_session_referees
      SET reference_status = COALESCE(${req.referenceStatus ?? null}, reference_status),
          reference_notes = COALESCE(${req.referenceNotes ?? null}, reference_notes),
          updated_at = NOW()
      WHERE id = ${req.refereeId} AND session_id = ${req.id}
      RETURNING *
    `;

    if (!row) throw APIError.notFound("referee not found");

    return {
      referee: {
        id: row.id, sessionId: row.session_id, refereeName: row.referee_name, refereeRole: row.referee_role,
        organisation: row.organisation, relationship: row.relationship, phone: row.phone, email: row.email,
        yearsKnown: row.years_known, consentToContact: row.consent_to_contact, referenceStatus: row.reference_status,
        referenceNotes: row.reference_notes, createdAt: row.created_at,
      },
    };
  }
);
