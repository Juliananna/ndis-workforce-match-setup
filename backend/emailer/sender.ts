import { secret } from "encore.dev/config";

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
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const key = resendApiKey();
  if (!key) return;

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
  onEach?: (email: string, success: boolean, error?: string) => Promise<void>
): Promise<BulkSendResult> {
  const key = resendApiKey();
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

      if (onEach) {
        for (const p of chunk) {
          await onEach(p.to, !chunkError, chunkError);
        }
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
    try {
      await sendEmail(p);
      sent++;
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : "unknown error";
      failed++;
    }

    if (onEach) {
      await onEach(p.to, !errorMsg, errorMsg);
    }

    await sleep(250);
  }

  return { sent, failed };
}
