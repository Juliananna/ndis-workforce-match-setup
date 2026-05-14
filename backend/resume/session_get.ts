import { api, APIError } from "encore.dev/api";
import db from "../db";
import { rowToSession } from "./session_helpers";
import type { ResumeSession, ConsentRecord, RefereeRecord, DocumentRecord } from "./types";

interface GetSessionParams {
  id: string;
}

interface GetSessionResponse {
  session: ResumeSession;
  consents: ConsentRecord[];
  referees: RefereeRecord[];
  documents: DocumentRecord[];
}

// Retrieves a resume builder session with all associated data.
export const getSession = api<GetSessionParams, GetSessionResponse>(
  { expose: true, method: "GET", path: "/resume-sessions/:id" },
  async ({ id }) => {
    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${id}`;
    if (!row) throw APIError.notFound("session not found");

    const consentRows = await db.queryAll<{
      id: string; session_id: string; consent_type: string; granted: boolean; granted_at: Date | null;
    }>`SELECT * FROM resume_session_consents WHERE session_id = ${id}`;

    const refereeRows = await db.queryAll<{
      id: string; session_id: string; referee_name: string; referee_role: string; organisation: string | null;
      relationship: string; phone: string | null; email: string | null; years_known: number | null;
      consent_to_contact: boolean; reference_status: string; reference_notes: string | null; created_at: Date;
    }>`SELECT * FROM resume_session_referees WHERE session_id = ${id} ORDER BY created_at`;

    const docRows = await db.queryAll<{
      id: string; session_id: string; document_type: string; document_title: string; file_url: string;
      expiry_date: string | null; visibility: string; verified: boolean; admin_notes: string | null; created_at: Date;
    }>`SELECT * FROM resume_session_documents WHERE session_id = ${id} ORDER BY created_at`;

    return {
      session: rowToSession(row),
      consents: consentRows.map((r) => ({
        id: r.id, sessionId: r.session_id, consentType: r.consent_type, granted: r.granted, grantedAt: r.granted_at,
      })),
      referees: refereeRows.map((r) => ({
        id: r.id, sessionId: r.session_id, refereeName: r.referee_name, refereeRole: r.referee_role,
        organisation: r.organisation, relationship: r.relationship, phone: r.phone, email: r.email,
        yearsKnown: r.years_known, consentToContact: r.consent_to_contact, referenceStatus: r.reference_status,
        referenceNotes: r.reference_notes, createdAt: r.created_at,
      })),
      documents: docRows.map((r) => ({
        id: r.id, sessionId: r.session_id, documentType: r.document_type, documentTitle: r.document_title,
        fileUrl: r.file_url, expiryDate: r.expiry_date, visibility: r.visibility, verified: r.verified,
        adminNotes: r.admin_notes, createdAt: r.created_at,
      })),
    };
  }
);
