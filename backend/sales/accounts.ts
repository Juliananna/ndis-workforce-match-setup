import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertSalesOrAdmin } from "./guard";

export interface AccountSummary {
  userId: string;
  email: string;
  role: string;
  name: string;
  isVerified: boolean;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  subscriptionPeriodEnd: Date | null;
  createdAt: Date;
  notes: AccountNote[];
}

export interface AccountNote {
  id: string;
  note: string;
  createdBy: string;
  createdAt: Date;
}

export interface ListAccountsResponse {
  accounts: AccountSummary[];
}

export const listAccounts = api<void, ListAccountsResponse>(
  { expose: true, auth: true, method: "GET", path: "/sales/accounts" },
  async () => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const rows = await db.queryAll<{
      user_id: string;
      email: string;
      role: string;
      name: string;
      is_verified: boolean;
      subscription_status: string | null;
      subscription_plan: string | null;
      subscription_period_end: Date | null;
      created_at: Date;
    }>`
      SELECT
        u.user_id,
        u.email,
        u.role,
        COALESCE(w.name, e.organisation_name, u.email) AS name,
        u.is_verified,
        e.subscription_status,
        e.subscription_plan,
        e.subscription_period_end,
        u.created_at
      FROM users u
      LEFT JOIN workers w ON w.user_id = u.user_id
      LEFT JOIN employers e ON e.user_id = u.user_id
      WHERE u.role IN ('WORKER', 'EMPLOYER')
      ORDER BY u.created_at DESC
    `;

    const noteRows = await db.queryAll<{
      id: string;
      target_user_id: string;
      note: string;
      created_by_email: string;
      created_at: Date;
    }>`
      SELECT n.id, n.target_user_id, n.note, u.email AS created_by_email, n.created_at
      FROM sales_account_notes n
      JOIN users u ON u.user_id = n.created_by
      ORDER BY n.created_at DESC
    `;

    const notesByUser: Record<string, AccountNote[]> = {};
    for (const n of noteRows) {
      if (!notesByUser[n.target_user_id]) notesByUser[n.target_user_id] = [];
      notesByUser[n.target_user_id].push({
        id: n.id,
        note: n.note,
        createdBy: n.created_by_email,
        createdAt: n.created_at,
      });
    }

    return {
      accounts: rows.map((r) => ({
        userId: r.user_id,
        email: r.email,
        role: r.role,
        name: r.name,
        isVerified: r.is_verified,
        subscriptionStatus: r.subscription_status,
        subscriptionPlan: r.subscription_plan,
        subscriptionPeriodEnd: r.subscription_period_end,
        createdAt: r.created_at,
        notes: notesByUser[r.user_id] ?? [],
      })),
    };
  }
);

export interface AddAccountNoteRequest {
  userId: string;
  note: string;
}

export interface AddAccountNoteResponse {
  id: string;
}

export const addAccountNote = api<AddAccountNoteRequest, AddAccountNoteResponse>(
  { expose: true, auth: true, method: "POST", path: "/sales/accounts/:userId/notes" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    if (!req.note.trim()) throw APIError.invalidArgument("note cannot be empty");

    const row = await db.queryRow<{ id: string }>`
      INSERT INTO sales_account_notes (target_user_id, note, created_by)
      VALUES (${req.userId}, ${req.note.trim()}, ${auth.userID})
      RETURNING id
    `;

    return { id: row!.id };
  }
);

export interface DeleteAccountNoteRequest {
  noteId: string;
}

export const deleteAccountNote = api<DeleteAccountNoteRequest, void>(
  { expose: true, auth: true, method: "DELETE", path: "/sales/notes/:noteId" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    await db.exec`
      DELETE FROM sales_account_notes WHERE id = ${req.noteId}
    `;
  }
);
