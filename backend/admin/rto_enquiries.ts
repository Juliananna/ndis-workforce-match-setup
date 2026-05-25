import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdmin } from "./guard";
import { sendEmail } from "../emailer/sender";

export type EnquiryStatus = "new" | "contacted" | "qualified" | "onboarding" | "partner" | "not_interested";

export interface RtoEnquiry {
  enquiryId: string;
  name: string;
  organisationName: string;
  email: string;
  phone: string | null;
  message: string;
  rtoSlug: string | null;
  status: EnquiryStatus;
  notes: string | null;
  assignedTo: string | null;
  lastContactedAt: Date | null;
  followUpAt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListRtoEnquiriesRequest {
  status?: EnquiryStatus | "all";
}

export interface ListRtoEnquiriesResponse {
  enquiries: RtoEnquiry[];
}

export const adminListRtoEnquiries = api<ListRtoEnquiriesRequest, ListRtoEnquiriesResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/rto-enquiries" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const statusFilter = req.status && req.status !== "all" ? req.status : null;

    const rows = await db.queryAll<{
      enquiry_id: string;
      name: string;
      organisation_name: string;
      email: string;
      phone: string | null;
      message: string;
      rto_slug: string | null;
      status: string;
      notes: string | null;
      assigned_to: string | null;
      last_contacted_at: Date | null;
      follow_up_at: string | null;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT enquiry_id, name, organisation_name, email, phone, message, rto_slug,
             status, notes, assigned_to, last_contacted_at,
             follow_up_at::text, created_at, updated_at
      FROM rto_enquiries
      WHERE (${statusFilter}::text IS NULL OR status = ${statusFilter}::text)
      ORDER BY
        CASE status
          WHEN 'new' THEN 0
          WHEN 'contacted' THEN 1
          WHEN 'qualified' THEN 2
          WHEN 'onboarding' THEN 3
          WHEN 'partner' THEN 4
          WHEN 'not_interested' THEN 5
        END,
        created_at DESC
    `;

    return {
      enquiries: rows.map((r) => ({
        enquiryId: r.enquiry_id,
        name: r.name,
        organisationName: r.organisation_name,
        email: r.email,
        phone: r.phone,
        message: r.message,
        rtoSlug: r.rto_slug,
        status: r.status as EnquiryStatus,
        notes: r.notes,
        assignedTo: r.assigned_to,
        lastContactedAt: r.last_contacted_at,
        followUpAt: r.follow_up_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    };
  }
);

export interface UpdateRtoEnquiryRequest {
  enquiryId: string;
  status?: EnquiryStatus;
  notes?: string;
  assignedTo?: string;
  followUpAt?: string;
}

export const adminUpdateRtoEnquiry = api<UpdateRtoEnquiryRequest, RtoEnquiry>(
  { expose: true, auth: true, method: "PUT", path: "/admin/rto-enquiries/:enquiryId" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const row = await db.queryRow<{
      enquiry_id: string;
      name: string;
      organisation_name: string;
      email: string;
      phone: string | null;
      message: string;
      rto_slug: string | null;
      status: string;
      notes: string | null;
      assigned_to: string | null;
      last_contacted_at: Date | null;
      follow_up_at: string | null;
      created_at: Date;
      updated_at: Date;
    }>`
      UPDATE rto_enquiries
      SET
        status       = COALESCE(${req.status ?? null}::text, status),
        notes        = COALESCE(${req.notes ?? null}::text, notes),
        assigned_to  = COALESCE(${req.assignedTo ?? null}::text, assigned_to),
        follow_up_at = COALESCE(${req.followUpAt ?? null}::date, follow_up_at),
        updated_at   = NOW()
      WHERE enquiry_id = ${req.enquiryId}
      RETURNING enquiry_id, name, organisation_name, email, phone, message, rto_slug,
                status, notes, assigned_to, last_contacted_at,
                follow_up_at::text, created_at, updated_at
    `;

    if (!row) throw APIError.notFound("enquiry not found");

    return {
      enquiryId: row.enquiry_id,
      name: row.name,
      organisationName: row.organisation_name,
      email: row.email,
      phone: row.phone,
      message: row.message,
      rtoSlug: row.rto_slug,
      status: row.status as EnquiryStatus,
      notes: row.notes,
      assignedTo: row.assigned_to,
      lastContactedAt: row.last_contacted_at,
      followUpAt: row.follow_up_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);

export interface SendRtoEnquiryEmailRequest {
  enquiryId: string;
  subject: string;
  htmlBody: string;
}

export interface SendRtoEnquiryEmailResponse {
  ok: boolean;
}

export const adminSendRtoEnquiryEmail = api<SendRtoEnquiryEmailRequest, SendRtoEnquiryEmailResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/rto-enquiries/:enquiryId/email" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    if (!req.subject?.trim()) throw APIError.invalidArgument("subject is required");
    if (!req.htmlBody?.trim()) throw APIError.invalidArgument("htmlBody is required");

    const row = await db.queryRow<{
      enquiry_id: string;
      name: string;
      email: string;
      organisation_name: string;
      status: string;
    }>`
      SELECT enquiry_id, name, email, organisation_name, status
      FROM rto_enquiries
      WHERE enquiry_id = ${req.enquiryId}
    `;
    if (!row) throw APIError.notFound("enquiry not found");

    const firstName = row.name.split(" ")[0];
    const body = req.htmlBody
      .replace(/\{FirstName\}/g, firstName)
      .replace(/\{OrgName\}/g, row.organisation_name);

    await sendEmail({
      to: row.email,
      subject: req.subject.trim(),
      html: body,
    });

    await db.exec`
      UPDATE rto_enquiries
      SET last_contacted_at = NOW(),
          status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END,
          updated_at = NOW()
      WHERE enquiry_id = ${req.enquiryId}
    `;

    return { ok: true };
  }
);
