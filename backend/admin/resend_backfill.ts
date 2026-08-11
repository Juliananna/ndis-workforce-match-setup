import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { secret } from "encore.dev/config";
import db from "../db";
import { assertAdmin } from "./guard";

const resendApiKey = secret("ResendApiKey");
const RESEND_LIST_URL = "https://api.resend.com/emails";

interface ResendEmail {
  id: string;
  to: string[];
  from: string;
  subject: string;
  created_at: string;
  last_event: string | null;
}

interface ResendListResponse {
  object: string;
  has_more: boolean;
  data: ResendEmail[];
}

export interface BackfillResendLogsResponse {
  fetched: number;
  inserted: number;
  skipped: number;
}

export const adminBackfillResendLogs = api<void, BackfillResendLogsResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/email-comms/backfill-resend" },
  async () => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const key = resendApiKey();
    if (!key) throw APIError.failedPrecondition("ResendApiKey secret not configured");

    let fetched = 0;
    let inserted = 0;
    let skipped = 0;
    let cursor: string | undefined;

    while (true) {
      const url = new URL(RESEND_LIST_URL);
      if (cursor) url.searchParams.set("after", cursor);
      url.searchParams.set("limit", "100");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${key}` },
      });

      if (!res.ok) {
        const text = await res.text();
        throw APIError.internal(`Resend API error ${res.status}: ${text}`);
      }

      const body = (await res.json()) as ResendListResponse;
      const emails = body.data ?? [];
      fetched += emails.length;

      for (const email of emails) {
        const to = Array.isArray(email.to) ? email.to[0] : email.to;
        const sentAt = email.created_at ? new Date(email.created_at) : new Date();
        const status = email.last_event === "bounced" || email.last_event === "complained" ? "failed" : "sent";

        try {
          const result = await db.queryRow<{ id: string }>`
            INSERT INTO email_sent_log
              (resend_id, sent_by, recipient_user_id, recipient_email, subject, category, is_bulk, bulk_count, target_role, status, error_message, sent_at)
            VALUES
              (${email.id}, NULL, NULL, ${to}, ${email.subject ?? ""}, 'backfill', false, NULL, NULL, ${status}, NULL, ${sentAt})
            ON CONFLICT (resend_id) DO NOTHING
            RETURNING id
          `;
          if (result) {
            inserted++;
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
      }

      if (!body.has_more || emails.length === 0) break;
      cursor = emails[emails.length - 1].id;
    }

    return { fetched, inserted, skipped };
  }
);
