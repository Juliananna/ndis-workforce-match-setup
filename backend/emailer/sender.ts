import { secret } from "encore.dev/config";
import db from "../db";

const resendApiKey = secret("ResendApiKey");

const FROM = "Kizazi Hire <noreply@kizazihire.com.au>";
const RESEND_URL = "https://api.resend.com/emails";
const BATCH_URL = "https://api.resend.com/emails/batch";
const BATCH_CHUNK_SIZE = 100;
const BULK_THRESHOLD = 500;

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  category?: string;
  recipientUserId?: string | null;
  sentByUserId?: string | null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logEmail(opts: {
  to: string;
  subject: string;
  category: string;
  recipientUserId: string | null;
  sentByUserId: string | null;
  status: "sent" | "failed";
  errorMessage: string | null;
  isBulk: boolean;
  bulkCount?: number | null;
  targetRole?: string | null;
}): Promise<void> {
  try {
    await db.exec`
      INSERT INTO email_sent_log
        (sent_by, recipient_user_id, recipient_email, subject, category, is_bulk, bulk_count, target_role, status, error_message)
      VALUES
        (${opts.sentByUserId}, ${opts.recipientUserId}, ${opts.to}, ${opts.subject},
         ${opts.category}, ${opts.isBulk}, ${opts.bulkCount ?? null}, ${opts.targetRole ?? null},
         ${opts.status}, ${opts.errorMessage})
    `;
  } catch {
  }
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const key = resendApiKey();
  const category = payload.category ?? "system";
  const recipientUserId = payload.recipientUserId ?? null;
  const sentByUserId = payload.sentByUserId ?? null;

  if (!key) {
    await logEmail({ to: payload.to, subject: payload.subject, category, recipientUserId, sentByUserId, status: "failed", errorMessage: "no API key configured", isBulk: false });
    return;
  }

  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend API error ${res.status}: ${text}`);
    }
  } catch (e: unknown) {
    status = "failed";
    errorMessage = e instanceof Error ? e.message : "unknown error";
    await logEmail({ to: payload.to, subject: payload.subject, category, recipientUserId, sentByUserId, status, errorMessage, isBulk: false });
    throw e;
  }

  await logEmail({ to: payload.to, subject: payload.subject, category, recipientUserId, sentByUserId, status, errorMessage, isBulk: false });
}

async function sendBatchChunk(key: string, chunk: EmailPayload[]): Promise<void> {
  const res = await fetch(BATCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      chunk.map((p) => ({
        from: FROM,
        to: p.to,
        subject: p.subject,
        html: p.html,
      }))
    ),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend batch API error ${res.status}: ${text}`);
  }
}

export interface BulkSendResult {
  sent: number;
  failed: number;
}

export async function sendEmailsBulk(
  payloads: EmailPayload[],
  onEach?: (email: string, success: boolean, error?: string) => Promise<void>,
  bulkMeta?: { category?: string; targetRole?: string; totalCount?: number; sentByUserId?: string | null }
): Promise<BulkSendResult> {
  const key = resendApiKey();
  const category = bulkMeta?.category ?? "bulk";
  const targetRole = bulkMeta?.targetRole ?? null;
  const sentByUserId = bulkMeta?.sentByUserId ?? null;
  const totalCount = bulkMeta?.totalCount ?? payloads.length;

  if (!key) return { sent: 0, failed: 0 };

  if (payloads.length >= BULK_THRESHOLD) {
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < payloads.length; i += BATCH_CHUNK_SIZE) {
      const chunk = payloads.slice(i, i + BATCH_CHUNK_SIZE);
      let chunkError: string | undefined;

      try {
        await sendBatchChunk(key, chunk);
        sent += chunk.length;
      } catch (e: unknown) {
        chunkError = e instanceof Error ? e.message : "unknown error";
        failed += chunk.length;
      }

      for (const p of chunk) {
        const success = !chunkError;
        await logEmail({
          to: p.to,
          subject: p.subject,
          category,
          recipientUserId: p.recipientUserId ?? null,
          sentByUserId,
          status: success ? "sent" : "failed",
          errorMessage: chunkError ?? null,
          isBulk: true,
          bulkCount: totalCount,
          targetRole,
        });
        if (onEach) await onEach(p.to, success, chunkError);
      }

      if (i + BATCH_CHUNK_SIZE < payloads.length) {
        await sleep(250);
      }
    }

    return { sent, failed };
  }

  let sent = 0;
  let failed = 0;

  for (const p of payloads) {
    let errorMsg: string | undefined;
    let success = true;
    try {
      const res = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: FROM, to: p.to, subject: p.subject, html: p.html }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Resend API error ${res.status}: ${text}`);
      }
      sent++;
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : "unknown error";
      success = false;
      failed++;
    }

    await logEmail({
      to: p.to,
      subject: p.subject,
      category,
      recipientUserId: p.recipientUserId ?? null,
      sentByUserId,
      status: success ? "sent" : "failed",
      errorMessage: errorMsg ?? null,
      isBulk: true,
      bulkCount: totalCount,
      targetRole,
    });

    if (onEach) await onEach(p.to, success, errorMsg);

    await sleep(250);
  }

  return { sent, failed };
}
