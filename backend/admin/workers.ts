import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdminOrCompliance } from "./guard";
import type { ReferenceStatus } from "../workers/references";
import { computeCompletion, type CompletionSection } from "../workers/completion_shared";

export interface AdminWorkerSummary {
  workerId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  location: string | null;
  isVerified: boolean;
  documentCount: number;
  pendingDocumentCount: number;
  pendingReferenceCount: number;
  createdAt: Date;
  profileCompletionPct: number;
  profileCompletionSections: CompletionSection[];
  profileCompletionItems: {
    location: boolean;
    bio: boolean;
    experienceYears: boolean;
    skills: boolean;
    documents: boolean;
    availability: boolean;
    resume: boolean;
    references: boolean;
    introVideo: boolean;
    photo: boolean;
  };
}

export interface ListWorkersResponse {
  workers: AdminWorkerSummary[];
}

export const adminListWorkers = api<void, ListWorkersResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/workers" },
  async () => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const rows = await db.queryAll<{
      worker_id: string;
      user_id: string;
      name: string;
      email: string;
      phone: string;
      location: string | null;
      is_verified: boolean;
      doc_count: number;
      pending_count: number;
      pending_ref_count: number;
      created_at: Date;
      has_bio: boolean;
      has_experience: boolean;
      has_skills: boolean;
      has_availability: boolean;
      has_resume: boolean;
      has_references: boolean;
      has_video: boolean;
      has_photo: boolean;
    }>`
      SELECT
        w.worker_id,
        w.user_id,
        w.name,
        u.email,
        w.phone,
        w.location,
        u.is_verified,
        COUNT(wd.id)::int AS doc_count,
        COUNT(wd.id) FILTER (WHERE wd.verification_status = 'Pending')::int AS pending_count,
        (SELECT COUNT(*)::int FROM worker_references wr WHERE wr.worker_id = w.worker_id AND wr.status IN ('Pending', 'Contacted')) AS pending_ref_count,
        u.created_at,
        (w.bio IS NOT NULL AND w.bio <> '') AS has_bio,
        (w.experience_years IS NOT NULL) AS has_experience,
        EXISTS (SELECT 1 FROM worker_skills ws WHERE ws.worker_id = w.worker_id) AS has_skills,
        EXISTS (SELECT 1 FROM worker_availability wa WHERE wa.worker_id = w.worker_id) AS has_availability,
        EXISTS (SELECT 1 FROM worker_resumes wr WHERE wr.worker_id = w.worker_id) AS has_resume,
        EXISTS (SELECT 1 FROM worker_references wref WHERE wref.worker_id = w.worker_id) AS has_references,
        (w.intro_video_url IS NOT NULL AND w.intro_video_url <> '') AS has_video,
        (w.avatar_url IS NOT NULL AND w.avatar_url <> '') AS has_photo
      FROM workers w
      JOIN users u ON u.user_id = w.user_id
      LEFT JOIN worker_documents wd ON wd.worker_id = w.worker_id
      GROUP BY w.worker_id, w.user_id, w.name, u.email, w.phone, w.location, u.is_verified, u.created_at,
               w.bio, w.experience_years, w.intro_video_url, w.avatar_url
      ORDER BY pending_count DESC, u.created_at DESC
    `;

    return {
      workers: rows.map((r) => {
        const inputs = {
          fullName:       !!(r.name?.trim()),
          phone:          !!(r.phone?.trim()),
          location:       !!r.location,
          bio:            r.has_bio,
          experienceYears: r.has_experience,
          photo:          r.has_photo,
          skills:         r.has_skills,
          availability:   r.has_availability,
          documents:      r.doc_count >= 3,
          resume:         r.has_resume,
          references:     r.has_references,
        };
        const { completionPercent, sections } = computeCompletion(inputs);
        const items = {
          location: !!r.location,
          bio: r.has_bio,
          experienceYears: r.has_experience,
          skills: r.has_skills,
          documents: r.doc_count >= 3,
          availability: r.has_availability,
          resume: r.has_resume,
          references: r.has_references,
          introVideo: r.has_video,
          photo: r.has_photo,
        };
        return {
          workerId: r.worker_id,
          userId: r.user_id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          location: r.location,
          isVerified: r.is_verified,
          documentCount: r.doc_count,
          pendingDocumentCount: r.pending_count,
          pendingReferenceCount: r.pending_ref_count,
          createdAt: r.created_at,
          profileCompletionPct: completionPercent,
          profileCompletionItems: items,
          profileCompletionSections: sections,
        };
      }),
    };
  }
);

export interface AdminWorkerDocumentView {
  id: string;
  workerId: string;
  documentType: string;
  fileKey: string;
  uploadDate: Date;
  expiryDate: Date | null;
  verificationStatus: string;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectionReason: string | null;
}

export interface GetWorkerDocumentsRequest {
  workerId: string;
}

export interface GetWorkerDocumentsResponse {
  documents: AdminWorkerDocumentView[];
}

export const adminGetWorkerDocuments = api<GetWorkerDocumentsRequest, GetWorkerDocumentsResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/workers/:workerId/documents" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const rows = await db.queryAll<{
      id: string;
      worker_id: string;
      document_type: string;
      file_key: string;
      upload_date: Date;
      expiry_date: Date | null;
      verification_status: string;
      verified_by: string | null;
      verified_at: Date | null;
      rejection_reason: string | null;
    }>`
      SELECT id, worker_id, document_type, file_key, upload_date, expiry_date,
             verification_status, verified_by, verified_at, rejection_reason
      FROM worker_documents
      WHERE worker_id = ${req.workerId}
      ORDER BY upload_date DESC
    `;

    return {
      documents: rows.map((r) => ({
        id: r.id,
        workerId: r.worker_id,
        documentType: r.document_type,
        fileKey: r.file_key,
        uploadDate: r.upload_date,
        expiryDate: r.expiry_date,
        verificationStatus: r.verification_status,
        verifiedBy: r.verified_by,
        verifiedAt: r.verified_at,
        rejectionReason: r.rejection_reason,
      })),
    };
  }
);

export interface AdminReferenceView {
  id: string;
  workerId: string;
  refereeName: string;
  refereeTitle: string;
  refereeOrganisation: string;
  refereeEmail: string | null;
  refereePhone: string | null;
  relationship: string;
  status: ReferenceStatus;
  notes: string | null;
  createdAt: Date;
}

export interface GetWorkerReferencesRequest {
  workerId: string;
}

export interface GetWorkerReferencesResponse {
  references: AdminReferenceView[];
}

export const adminGetWorkerReferences = api<GetWorkerReferencesRequest, GetWorkerReferencesResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/workers/:workerId/references" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const rows = await db.queryAll<{
      id: string; worker_id: string; referee_name: string; referee_title: string;
      referee_organisation: string; referee_email: string | null; referee_phone: string | null;
      relationship: string; status: string; notes: string | null; created_at: Date;
    }>`
      SELECT id, worker_id, referee_name, referee_title, referee_organisation,
             referee_email, referee_phone, relationship, status, notes, created_at
      FROM worker_references WHERE worker_id = ${req.workerId}
      ORDER BY created_at ASC
    `;

    return {
      references: rows.map((r) => ({
        id: r.id,
        workerId: r.worker_id,
        refereeName: r.referee_name,
        refereeTitle: r.referee_title,
        refereeOrganisation: r.referee_organisation,
        refereeEmail: r.referee_email,
        refereePhone: r.referee_phone,
        relationship: r.relationship,
        status: r.status as ReferenceStatus,
        notes: r.notes,
        createdAt: r.created_at,
      })),
    };
  }
);

export interface VerifyReferenceRequest {
  referenceId: string;
  status: ReferenceStatus;
}

export interface VerifyReferenceResponse {
  referenceId: string;
  status: ReferenceStatus;
}

export const adminVerifyReference = api<VerifyReferenceRequest, VerifyReferenceResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/references/:referenceId/verify" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const validStatuses: ReferenceStatus[] = ["Pending", "Contacted", "Verified", "Declined"];
    if (!validStatuses.includes(req.status)) {
      throw APIError.invalidArgument("invalid status");
    }

    const row = await db.queryRow<{ id: string; status: string }>`
      UPDATE worker_references
      SET status = ${req.status}, updated_at = NOW()
      WHERE id = ${req.referenceId}
      RETURNING id, status
    `;

    if (!row) throw APIError.notFound("reference not found");

    return { referenceId: row.id, status: row.status as ReferenceStatus };
  }
);
