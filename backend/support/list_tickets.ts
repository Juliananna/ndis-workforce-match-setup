import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdmin } from "../admin/guard";

export interface SupportTicketDetail {
  id: string;
  userId: string | null;
  userEmail: string;
  userName: string | null;
  userRole: string | null;
  subject: string;
  message: string;
  category: string;
  status: string;
  adminNotes: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListTicketsRequest {
  status?: "open" | "resolved" | "all";
  limit?: number;
  offset?: number;
}

export interface ListTicketsResponse {
  tickets: SupportTicketDetail[];
  total: number;
}

export const adminListSupportTickets = api<ListTicketsRequest, ListTicketsResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/support/tickets" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const statusFilter = (!req.status || req.status === "all") ? null : req.status;
    const limit = Math.min(req.limit ?? 50, 200);
    const offset = req.offset ?? 0;

    const [rows, countRow] = await Promise.all([
      db.queryAll<{
        id: string;
        user_id: string | null;
        user_email: string;
        user_name: string | null;
        user_role: string | null;
        subject: string;
        message: string;
        category: string;
        status: string;
        admin_notes: string | null;
        resolved_at: Date | null;
        created_at: Date;
        updated_at: Date;
      }>`
        SELECT id, user_id, user_email, user_name, user_role,
               subject, message, category, status, admin_notes,
               resolved_at, created_at, updated_at
        FROM support_tickets
        WHERE (${statusFilter}::text IS NULL OR status = ${statusFilter}::text)
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM support_tickets
        WHERE (${statusFilter}::text IS NULL OR status = ${statusFilter}::text)
      `,
    ]);

    return {
      tickets: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        userEmail: r.user_email,
        userName: r.user_name,
        userRole: r.user_role,
        subject: r.subject,
        message: r.message,
        category: r.category,
        status: r.status,
        adminNotes: r.admin_notes,
        resolvedAt: r.resolved_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      total: countRow?.count ?? 0,
    };
  }
);

export interface ResolveTicketRequest {
  id: string;
  adminNotes?: string;
  status: "open" | "resolved";
}

export const adminUpdateSupportTicket = api<ResolveTicketRequest, SupportTicketDetail>(
  { expose: true, auth: true, method: "PUT", path: "/admin/support/tickets/:id" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const row = await db.queryRow<{
      id: string;
      user_id: string | null;
      user_email: string;
      user_name: string | null;
      user_role: string | null;
      subject: string;
      message: string;
      category: string;
      status: string;
      admin_notes: string | null;
      resolved_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>`
      UPDATE support_tickets
      SET status = ${req.status},
          admin_notes = ${req.adminNotes ?? null},
          resolved_by = ${req.status === "resolved" ? auth.userID : null},
          resolved_at = ${req.status === "resolved" ? new Date() : null},
          updated_at = NOW()
      WHERE id = ${req.id}
      RETURNING id, user_id, user_email, user_name, user_role,
                subject, message, category, status, admin_notes,
                resolved_at, created_at, updated_at
    `;

    if (!row) throw APIError.notFound("ticket not found");

    return {
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: row.user_name,
      userRole: row.user_role,
      subject: row.subject,
      message: row.message,
      category: row.category,
      status: row.status,
      adminNotes: row.admin_notes,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);
