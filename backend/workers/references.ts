import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export type ReferenceStatus = "Pending" | "Contacted" | "Verified" | "Declined";

export interface WorkerReference {
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
  updatedAt: Date;
}

export interface CreateReferenceRequest {
  refereeName: string;
  refereeTitle: string;
  refereeOrganisation: string;
  refereeEmail?: string;
  refereePhone?: string;
  relationship: string;
  notes?: string;
}

export interface UpdateReferenceRequest {
  referenceId: string;
  refereeName?: string;
  refereeTitle?: string;
  refereeOrganisation?: string;
  refereeEmail?: string;
  refereePhone?: string;
  relationship?: string;
  notes?: string;
}

export interface ListReferencesResponse {
  references: WorkerReference[];
}

async function getWorkerIdForUser(userId: string): Promise<string> {
  const worker = await db.queryRow<{ worker_id: string }>`
    SELECT worker_id FROM workers WHERE user_id = ${userId}
  `;
  if (!worker) throw APIError.notFound("worker not found");
  return worker.worker_id;
}

function mapRow(row: {
  id: string;
  worker_id: string;
  referee_name: string;
  referee_title: string;
  referee_organisation: string;
  referee_email: string | null;
  referee_phone: string | null;
  relationship: string;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}): WorkerReference {
  return {
    id: row.id,
    workerId: row.worker_id,
    refereeName: row.referee_name,
    refereeTitle: row.referee_title,
    refereeOrganisation: row.referee_organisation,
    refereeEmail: row.referee_email,
    refereePhone: row.referee_phone,
    relationship: row.relationship,
    status: row.status as ReferenceStatus,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const listWorkerReferences = api<void, ListReferencesResponse>(
  { expose: true, auth: true, method: "GET", path: "/workers/references" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can access this endpoint");

    const workerId = await getWorkerIdForUser(auth.userID);

    const rows = await db.queryAll<{
      id: string; worker_id: string; referee_name: string; referee_title: string;
      referee_organisation: string; referee_email: string | null; referee_phone: string | null;
      relationship: string; status: string; notes: string | null; created_at: Date; updated_at: Date;
    }>`
      SELECT id, worker_id, referee_name, referee_title, referee_organisation,
             referee_email, referee_phone, relationship, status, notes, created_at, updated_at
      FROM worker_references WHERE worker_id = ${workerId}
      ORDER BY created_at ASC
    `;

    return { references: rows.map(mapRow) };
  }
);

export const createWorkerReference = api<CreateReferenceRequest, WorkerReference>(
  { expose: true, auth: true, method: "POST", path: "/workers/references" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can access this endpoint");

    const workerId = await getWorkerIdForUser(auth.userID);

    const count = await db.queryRow<{ count: number }>`
      SELECT COUNT(*)::int AS count FROM worker_references WHERE worker_id = ${workerId}
    `;
    if ((count?.count ?? 0) >= 5) throw APIError.invalidArgument("maximum of 5 references allowed");

    const row = await db.queryRow<{
      id: string; worker_id: string; referee_name: string; referee_title: string;
      referee_organisation: string; referee_email: string | null; referee_phone: string | null;
      relationship: string; status: string; notes: string | null; created_at: Date; updated_at: Date;
    }>`
      INSERT INTO worker_references (worker_id, referee_name, referee_title, referee_organisation, referee_email, referee_phone, relationship, notes)
      VALUES (${workerId}, ${req.refereeName}, ${req.refereeTitle}, ${req.refereeOrganisation},
              ${req.refereeEmail ?? null}, ${req.refereePhone ?? null}, ${req.relationship}, ${req.notes ?? null})
      RETURNING id, worker_id, referee_name, referee_title, referee_organisation,
                referee_email, referee_phone, relationship, status, notes, created_at, updated_at
    `;

    if (!row) throw APIError.internal("failed to create reference");
    return mapRow(row);
  }
);

export const updateWorkerReference = api<UpdateReferenceRequest, WorkerReference>(
  { expose: true, auth: true, method: "PATCH", path: "/workers/references/:referenceId" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can access this endpoint");

    const workerId = await getWorkerIdForUser(auth.userID);

    const existing = await db.queryRow<{
      id: string; worker_id: string; referee_name: string; referee_title: string;
      referee_organisation: string; referee_email: string | null; referee_phone: string | null;
      relationship: string; status: string; notes: string | null; created_at: Date; updated_at: Date;
    }>`
      SELECT id, worker_id, referee_name, referee_title, referee_organisation,
             referee_email, referee_phone, relationship, status, notes, created_at, updated_at
      FROM worker_references WHERE id = ${req.referenceId}
    `;

    if (!existing) throw APIError.notFound("reference not found");
    if (existing.worker_id !== workerId) throw APIError.permissionDenied("access denied");

    const row = await db.queryRow<{
      id: string; worker_id: string; referee_name: string; referee_title: string;
      referee_organisation: string; referee_email: string | null; referee_phone: string | null;
      relationship: string; status: string; notes: string | null; created_at: Date; updated_at: Date;
    }>`
      UPDATE worker_references SET
        referee_name         = ${req.refereeName ?? existing.referee_name},
        referee_title        = ${req.refereeTitle ?? existing.referee_title},
        referee_organisation = ${req.refereeOrganisation ?? existing.referee_organisation},
        referee_email        = ${req.refereeEmail ?? existing.referee_email},
        referee_phone        = ${req.refereePhone ?? existing.referee_phone},
        relationship         = ${req.relationship ?? existing.relationship},
        notes                = ${req.notes !== undefined ? req.notes : existing.notes},
        updated_at           = NOW()
      WHERE id = ${req.referenceId}
      RETURNING id, worker_id, referee_name, referee_title, referee_organisation,
                referee_email, referee_phone, relationship, status, notes, created_at, updated_at
    `;

    if (!row) throw APIError.internal("failed to update reference");
    return mapRow(row);
  }
);

export interface ReferencesSummary {
  total: number;
  verified: number;
}

export interface WorkerReferenceFull extends WorkerReference {}

export interface GetReferencesForEmployerRequest {
  workerId: string;
}

export interface GetReferencesForEmployerResponse {
  summary: ReferencesSummary;
  references: WorkerReferenceFull[] | null;
}

export const getReferencesForEmployer = api<GetReferencesForEmployerRequest, GetReferencesForEmployerResponse>(
  { expose: true, auth: true, method: "GET", path: "/employers/workers/:workerId/references" },
  async ({ workerId }) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") throw APIError.permissionDenied("only employers can access this endpoint");

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE worker_id = ${workerId}
    `;
    if (!worker) throw APIError.notFound("worker not found");

    const summaryRow = await db.queryRow<{ total: number; verified: number }>`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Verified')::int AS verified
      FROM worker_references
      WHERE worker_id = ${workerId}
    `;

    const summary: ReferencesSummary = {
      total: summaryRow?.total ?? 0,
      verified: summaryRow?.verified ?? 0,
    };

    const acceptedOffer = await db.queryRow<{ offer_id: string }>`
      SELECT offer_id FROM offers
      WHERE employer_id = ${employer.employer_id}
        AND worker_id = ${workerId}
        AND status = 'Accepted'
      LIMIT 1
    `;

    if (!acceptedOffer) {
      return { summary, references: null };
    }

    const rows = await db.queryAll<{
      id: string; worker_id: string; referee_name: string; referee_title: string;
      referee_organisation: string; referee_email: string | null; referee_phone: string | null;
      relationship: string; status: string; notes: string | null; created_at: Date; updated_at: Date;
    }>`
      SELECT id, worker_id, referee_name, referee_title, referee_organisation,
             referee_email, referee_phone, relationship, status, notes, created_at, updated_at
      FROM worker_references WHERE worker_id = ${workerId}
      ORDER BY created_at ASC
    `;

    return { summary, references: rows.map(mapRow) };
  }
);

export const deleteWorkerReference = api<{ referenceId: string }, void>(
  { expose: true, auth: true, method: "DELETE", path: "/workers/references/:referenceId" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can access this endpoint");

    const workerId = await getWorkerIdForUser(auth.userID);

    const ref = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM worker_references WHERE id = ${req.referenceId}
    `;

    if (!ref) throw APIError.notFound("reference not found");
    if (ref.worker_id !== workerId) throw APIError.permissionDenied("access denied");

    await db.exec`DELETE FROM worker_references WHERE id = ${req.referenceId}`;
  }
);
