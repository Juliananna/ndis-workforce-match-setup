import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export const REQUESTABLE_DOCUMENT_TYPES = [
  "Resume",
  "Video Presentation",
  "Cover Letter",
  "Driver's Licence",
  "Passport / ID",
  "Working With Children Check",
  "Police Clearance",
  "NDIS Worker Screening Check",
  "NDIS Worker Orientation Module",
  "NDIS Code of Conduct acknowledgement",
  "Infection Control Certificate",
  "First Aid Certificate",
  "CPR Certificate",
  "Certificate III / IV Disability",
  "Nursing qualifications",
  "Other relevant training",
  "Other",
] as const;

export type RequestableDocumentType = (typeof REQUESTABLE_DOCUMENT_TYPES)[number];

export interface OfferDocumentRequest {
  id: string;
  offerId: string;
  employerId: string;
  workerId: string;
  documentType: string;
  note: string | null;
  status: "Pending" | "Fulfilled" | "Cancelled";
  fulfilledUrl: string | null;
  fulfilledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentRequestParams {
  offerId: string;
  documentType: string;
  note?: string;
}

export interface ListDocumentRequestsParams {
  offerId: string;
}

export interface ListDocumentRequestsResponse {
  requests: OfferDocumentRequest[];
}

export interface CancelDocumentRequestParams {
  offerId: string;
  requestId: string;
}

export interface FulfillDocumentRequestParams {
  offerId: string;
  requestId: string;
  fulfilledUrl: string;
}

export interface GetRequestableTypesResponse {
  types: readonly string[];
}

function mapRow(row: {
  id: string;
  offer_id: string;
  employer_id: string;
  worker_id: string;
  document_type: string;
  note: string | null;
  status: string;
  fulfilled_url: string | null;
  fulfilled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}): OfferDocumentRequest {
  return {
    id: row.id,
    offerId: row.offer_id,
    employerId: row.employer_id,
    workerId: row.worker_id,
    documentType: row.document_type,
    note: row.note,
    status: row.status as OfferDocumentRequest["status"],
    fulfilledUrl: row.fulfilled_url,
    fulfilledAt: row.fulfilled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assertOfferEmployerAccess(offerId: string, userId: string): Promise<{ employer_id: string; worker_id: string; status: string }> {
  const employer = await db.queryRow<{ employer_id: string }>`
    SELECT employer_id FROM employers WHERE user_id = ${userId}
  `;
  if (!employer) throw APIError.notFound("employer profile not found");

  const offer = await db.queryRow<{ employer_id: string; worker_id: string; status: string }>`
    SELECT employer_id, worker_id, status FROM offers WHERE offer_id = ${offerId}
  `;
  if (!offer) throw APIError.notFound("offer not found");
  if (offer.employer_id !== employer.employer_id) {
    throw APIError.permissionDenied("not authorized to manage this offer");
  }
  return { employer_id: employer.employer_id, worker_id: offer.worker_id, status: offer.status };
}

async function assertOfferWorkerAccess(offerId: string, userId: string): Promise<{ worker_id: string; employer_id: string }> {
  const worker = await db.queryRow<{ worker_id: string }>`
    SELECT worker_id FROM workers WHERE user_id = ${userId}
  `;
  if (!worker) throw APIError.notFound("worker profile not found");

  const offer = await db.queryRow<{ worker_id: string; employer_id: string }>`
    SELECT worker_id, employer_id FROM offers WHERE offer_id = ${offerId}
  `;
  if (!offer) throw APIError.notFound("offer not found");
  if (offer.worker_id !== worker.worker_id) {
    throw APIError.permissionDenied("not authorized");
  }
  return { worker_id: worker.worker_id, employer_id: offer.employer_id };
}

export const getRequestableDocumentTypes = api<void, GetRequestableTypesResponse>(
  { expose: true, auth: true, method: "GET", path: "/offers/document-request-types" },
  async () => {
    return { types: REQUESTABLE_DOCUMENT_TYPES };
  }
);

export const createDocumentRequest = api<CreateDocumentRequestParams, OfferDocumentRequest>(
  { expose: true, auth: true, method: "POST", path: "/offers/:offerId/document-requests" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") throw APIError.permissionDenied("only employers can request documents");

    const offer = await assertOfferEmployerAccess(req.offerId, auth.userID);
    if (!["Pending", "Negotiating", "Accepted"].includes(offer.status)) {
      throw APIError.failedPrecondition("can only request documents on active offers");
    }

    if (!req.documentType || req.documentType.trim() === "") {
      throw APIError.invalidArgument("document type is required");
    }

    const row = await db.queryRow<{
      id: string; offer_id: string; employer_id: string; worker_id: string;
      document_type: string; note: string | null; status: string;
      fulfilled_url: string | null; fulfilled_at: Date | null;
      created_at: Date; updated_at: Date;
    }>`
      INSERT INTO offer_document_requests (offer_id, employer_id, worker_id, document_type, note)
      VALUES (${req.offerId}, ${offer.employer_id}, ${offer.worker_id}, ${req.documentType}, ${req.note ?? null})
      RETURNING id, offer_id, employer_id, worker_id, document_type, note, status, fulfilled_url, fulfilled_at, created_at, updated_at
    `;
    if (!row) throw APIError.internal("failed to create document request");

    return mapRow(row);
  }
);

export const listDocumentRequests = api<ListDocumentRequestsParams, ListDocumentRequestsResponse>(
  { expose: true, auth: true, method: "GET", path: "/offers/:offerId/document-requests" },
  async ({ offerId }) => {
    const auth = getAuthData()!;

    if (auth.role === "EMPLOYER") {
      await assertOfferEmployerAccess(offerId, auth.userID);
    } else if (auth.role === "WORKER") {
      await assertOfferWorkerAccess(offerId, auth.userID);
    } else {
      throw APIError.permissionDenied("not authorized");
    }

    const rows = await db.queryAll<{
      id: string; offer_id: string; employer_id: string; worker_id: string;
      document_type: string; note: string | null; status: string;
      fulfilled_url: string | null; fulfilled_at: Date | null;
      created_at: Date; updated_at: Date;
    }>`
      SELECT id, offer_id, employer_id, worker_id, document_type, note, status, fulfilled_url, fulfilled_at, created_at, updated_at
      FROM offer_document_requests
      WHERE offer_id = ${offerId}
      ORDER BY created_at ASC
    `;

    return { requests: rows.map(mapRow) };
  }
);

export const cancelDocumentRequest = api<CancelDocumentRequestParams, OfferDocumentRequest>(
  { expose: true, auth: true, method: "POST", path: "/offers/:offerId/document-requests/:requestId/cancel" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") throw APIError.permissionDenied("only employers can cancel document requests");

    await assertOfferEmployerAccess(req.offerId, auth.userID);

    const row = await db.queryRow<{
      id: string; offer_id: string; employer_id: string; worker_id: string;
      document_type: string; note: string | null; status: string;
      fulfilled_url: string | null; fulfilled_at: Date | null;
      created_at: Date; updated_at: Date;
    }>`
      UPDATE offer_document_requests
      SET status = 'Cancelled', updated_at = NOW()
      WHERE id = ${req.requestId} AND offer_id = ${req.offerId} AND status = 'Pending'
      RETURNING id, offer_id, employer_id, worker_id, document_type, note, status, fulfilled_url, fulfilled_at, created_at, updated_at
    `;
    if (!row) throw APIError.notFound("document request not found or already processed");

    return mapRow(row);
  }
);

export const fulfillDocumentRequest = api<FulfillDocumentRequestParams, OfferDocumentRequest>(
  { expose: true, auth: true, method: "POST", path: "/offers/:offerId/document-requests/:requestId/fulfill" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") throw APIError.permissionDenied("only workers can fulfill document requests");

    await assertOfferWorkerAccess(req.offerId, auth.userID);

    if (!req.fulfilledUrl || req.fulfilledUrl.trim() === "") {
      throw APIError.invalidArgument("a document URL is required");
    }

    const row = await db.queryRow<{
      id: string; offer_id: string; employer_id: string; worker_id: string;
      document_type: string; note: string | null; status: string;
      fulfilled_url: string | null; fulfilled_at: Date | null;
      created_at: Date; updated_at: Date;
    }>`
      UPDATE offer_document_requests
      SET status = 'Fulfilled', fulfilled_url = ${req.fulfilledUrl}, fulfilled_at = NOW(), updated_at = NOW()
      WHERE id = ${req.requestId} AND offer_id = ${req.offerId} AND status = 'Pending'
      RETURNING id, offer_id, employer_id, worker_id, document_type, note, status, fulfilled_url, fulfilled_at, created_at, updated_at
    `;
    if (!row) throw APIError.notFound("document request not found or already processed");

    return mapRow(row);
  }
);
