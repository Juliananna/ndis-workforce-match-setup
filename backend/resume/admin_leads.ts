import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdminOrCompliance } from "../admin/guard";
import { rowToSession } from "./session_helpers";
import type { ResumeSession, DocumentRecord, RefereeRecord } from "./types";

interface ListLeadsParams {
  status?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

interface LeadSummary {
  session: ResumeSession;
  documentCount: number;
  refereeCount: number;
  consentCount: number;
}

interface ListLeadsResponse {
  leads: LeadSummary[];
  total: number;
}

// Lists all resume builder leads for admin review.
export const listLeads = api<ListLeadsParams, ListLeadsResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/resume-leads" },
  async (params) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;
    const status = params.status ?? null;

    const rows = status
      ? await db.queryAll`SELECT * FROM resume_sessions WHERE status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      : await db.queryAll`SELECT * FROM resume_sessions ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const countRow = status
      ? await db.queryRow<{ count: number }>`SELECT COUNT(*)::int as count FROM resume_sessions WHERE status = ${status}`
      : await db.queryRow<{ count: number }>`SELECT COUNT(*)::int as count FROM resume_sessions`;

    const leads: LeadSummary[] = [];

    for (const row of rows) {
      const docCount = await db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count FROM resume_session_documents WHERE session_id = ${row.id}
      `;
      const refCount = await db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count FROM resume_session_referees WHERE session_id = ${row.id}
      `;
      const consentCount = await db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int as count FROM resume_session_consents WHERE session_id = ${row.id} AND granted = TRUE
      `;
      leads.push({
        session: rowToSession(row),
        documentCount: docCount?.count ?? 0,
        refereeCount: refCount?.count ?? 0,
        consentCount: consentCount?.count ?? 0,
      });
    }

    return { leads, total: countRow?.count ?? 0 };
  }
);

interface GetLeadDetailParams {
  id: string;
}

interface GetLeadDetailResponse {
  session: ResumeSession;
  documents: DocumentRecord[];
  referees: RefereeRecord[];
  auditLog: Array<{ id: string; eventType: string; eventData: any; createdAt: Date }>;
}

// Retrieves full detail for a resume lead including documents, referees and audit log.
export const getLeadDetail = api<GetLeadDetailParams, GetLeadDetailResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/resume-leads/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${id}`;
    if (!row) throw APIError.notFound("lead not found");

    const docRows = await db.queryAll<{
      id: string; session_id: string; document_type: string; document_title: string;
      file_url: string; expiry_date: string | null; visibility: string; verified: boolean;
      admin_notes: string | null; created_at: Date;
    }>`SELECT * FROM resume_session_documents WHERE session_id = ${id} ORDER BY created_at`;

    const refRows = await db.queryAll<{
      id: string; session_id: string; referee_name: string; referee_role: string; organisation: string | null;
      relationship: string; phone: string | null; email: string | null; years_known: number | null;
      consent_to_contact: boolean; reference_status: string; reference_notes: string | null; created_at: Date;
    }>`SELECT * FROM resume_session_referees WHERE session_id = ${id} ORDER BY created_at`;

    const auditRows = await db.queryAll<{
      id: string; event_type: string; event_data: any; created_at: Date;
    }>`SELECT * FROM resume_audit_log WHERE session_id = ${id} ORDER BY created_at DESC LIMIT 50`;

    return {
      session: rowToSession(row),
      documents: docRows.map((r) => ({
        id: r.id, sessionId: r.session_id, documentType: r.document_type, documentTitle: r.document_title,
        fileUrl: r.file_url, expiryDate: r.expiry_date, visibility: r.visibility, verified: r.verified,
        adminNotes: r.admin_notes, createdAt: r.created_at,
      })),
      referees: refRows.map((r) => ({
        id: r.id, sessionId: r.session_id, refereeName: r.referee_name, refereeRole: r.referee_role,
        organisation: r.organisation, relationship: r.relationship, phone: r.phone, email: r.email,
        yearsKnown: r.years_known, consentToContact: r.consent_to_contact, referenceStatus: r.reference_status,
        referenceNotes: r.reference_notes, createdAt: r.created_at,
      })),
      auditLog: auditRows.map((r) => ({
        id: r.id, eventType: r.event_type, eventData: r.event_data, createdAt: r.created_at,
      })),
    };
  }
);

interface VerifyDocumentRequest {
  id: string;
  documentId: string;
  verified: boolean;
  adminNotes?: string;
}

interface VerifyDocumentResponse {
  success: boolean;
}

// Marks a resume session document as verified or rejected.
export const verifyResumeDocument = api<VerifyDocumentRequest, VerifyDocumentResponse>(
  { expose: true, auth: true, method: "PATCH", path: "/admin/resume-leads/:id/documents/:documentId/verify" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    await db.exec`
      UPDATE resume_session_documents
      SET verified = ${req.verified}, admin_notes = COALESCE(${req.adminNotes ?? null}, admin_notes), updated_at = NOW()
      WHERE id = ${req.documentId} AND session_id = ${req.id}
    `;

    await db.exec`
      INSERT INTO resume_audit_log (session_id, event_type, event_data)
      VALUES (${req.id}, 'document_verified', ${JSON.stringify({ documentId: req.documentId, verified: req.verified })}::jsonb)
    `;

    return { success: true };
  }
);
