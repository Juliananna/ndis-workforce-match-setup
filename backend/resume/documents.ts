import { api, APIError } from "encore.dev/api";
import db from "../db";
import type { DocumentRecord } from "./types";

interface AddDocumentRequest {
  id: string;
  documentType: string;
  documentTitle: string;
  fileUrl: string;
  expiryDate?: string;
  visibility?: string;
}

interface AddDocumentResponse {
  document: DocumentRecord;
}

// Adds a document to a resume session.
export const addDocument = api<AddDocumentRequest, AddDocumentResponse>(
  { expose: true, method: "POST", path: "/resume-sessions/:id/documents" },
  async (req) => {
    const existing = await db.queryRow`SELECT id FROM resume_sessions WHERE id = ${req.id}`;
    if (!existing) throw APIError.notFound("session not found");

    const visibility = req.visibility ?? "private";
    if (!["private", "providers", "public"].includes(visibility)) {
      throw APIError.invalidArgument("invalid visibility value");
    }

    const row = await db.queryRow<{
      id: string; session_id: string; document_type: string; document_title: string;
      file_url: string; expiry_date: string | null; visibility: string; verified: boolean;
      admin_notes: string | null; created_at: Date;
    }>`
      INSERT INTO resume_session_documents (session_id, document_type, document_title, file_url, expiry_date, visibility)
      VALUES (${req.id}, ${req.documentType}, ${req.documentTitle}, ${req.fileUrl}, ${req.expiryDate ?? null}, ${visibility})
      RETURNING *
    `;

    await db.exec`
      INSERT INTO resume_audit_log (session_id, event_type, event_data)
      VALUES (${req.id}, 'document_added', ${JSON.stringify({ documentType: req.documentType })}::jsonb)
    `;

    return {
      document: {
        id: row!.id, sessionId: row!.session_id, documentType: row!.document_type,
        documentTitle: row!.document_title, fileUrl: row!.file_url, expiryDate: row!.expiry_date,
        visibility: row!.visibility, verified: row!.verified, adminNotes: row!.admin_notes, createdAt: row!.created_at,
      },
    };
  }
);

interface UpdateDocumentVisibilityRequest {
  id: string;
  documentId: string;
  visibility: string;
}

interface UpdateDocumentVisibilityResponse {
  document: DocumentRecord;
}

// Updates the visibility setting of a document in a resume session.
export const updateDocumentVisibility = api<UpdateDocumentVisibilityRequest, UpdateDocumentVisibilityResponse>(
  { expose: true, method: "PATCH", path: "/resume-sessions/:id/documents/:documentId/visibility" },
  async (req) => {
    if (!["private", "providers", "public"].includes(req.visibility)) {
      throw APIError.invalidArgument("invalid visibility value");
    }

    const row = await db.queryRow<{
      id: string; session_id: string; document_type: string; document_title: string;
      file_url: string; expiry_date: string | null; visibility: string; verified: boolean;
      admin_notes: string | null; created_at: Date;
    }>`
      UPDATE resume_session_documents
      SET visibility = ${req.visibility}, updated_at = NOW()
      WHERE id = ${req.documentId} AND session_id = ${req.id}
      RETURNING *
    `;

    if (!row) throw APIError.notFound("document not found");

    return {
      document: {
        id: row.id, sessionId: row.session_id, documentType: row.document_type,
        documentTitle: row.document_title, fileUrl: row.file_url, expiryDate: row.expiry_date,
        visibility: row.visibility, verified: row.verified, adminNotes: row.admin_notes, createdAt: row.created_at,
      },
    };
  }
);
