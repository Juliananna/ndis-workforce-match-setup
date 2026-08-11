import { secret } from "encore.dev/config";
import db from "../db";

const twilioAccountSid = secret("TwilioAccountSid");
const twilioAuthToken = secret("TwilioAuthToken");
const twilioSmsFrom = secret("TwilioSmsFrom");

const toE164 = (num: string): string => {
  const stripped = num.replace(/[\s\-().]/g, "");
  if (stripped.startsWith("+")) return stripped;
  if (stripped.startsWith("0")) return `+61${stripped.slice(1)}`;
  if (stripped.startsWith("61")) return `+${stripped}`;
  return `+${stripped}`;
};

export interface SMSOptions {
  recipientUserId?: string | null;
  sentByUserId?: string | null;
  isBulk?: boolean;
}

export async function sendSMS(to: string, body: string, opts?: SMSOptions): Promise<void> {
  const sid = twilioAccountSid();
  const token = twilioAuthToken();
  const from = twilioSmsFrom();

  const recipientUserId = opts?.recipientUserId ?? null;
  const sentByUserId = opts?.sentByUserId ?? null;
  const isBulk = opts?.isBulk ?? false;

  if (!sid || !token || !from) {
    await logSMS({ phone: to, message: body, recipientUserId, sentByUserId, status: "failed", errorMessage: "SMS not configured", isBulk });
    return;
  }

  const normalised = toE164(to);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const params = new URLSearchParams({
    From: from,
    To: normalised,
    Body: body,
  });

  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Twilio SMS error ${res.status}: ${text}`);
    }
  } catch (e: unknown) {
    status = "failed";
    errorMessage = e instanceof Error ? e.message : "unknown error";
    await logSMS({ phone: normalised, message: body, recipientUserId, sentByUserId, status, errorMessage, isBulk });
    throw e;
  }

  await logSMS({ phone: normalised, message: body, recipientUserId, sentByUserId, status, errorMessage, isBulk });
}

async function logSMS(opts: {
  phone: string;
  message: string;
  recipientUserId: string | null;
  sentByUserId: string | null;
  status: "sent" | "failed";
  errorMessage: string | null;
  isBulk: boolean;
}): Promise<void> {
  try {
    await db.exec`
      INSERT INTO sms_sent_log (sent_by, recipient_user_id, phone_number, message, status, error_message, is_bulk)
      VALUES (${opts.sentByUserId}, ${opts.recipientUserId}, ${opts.phone}, ${opts.message}, ${opts.status}, ${opts.errorMessage}, ${opts.isBulk})
    `;
  } catch {
  }
}
