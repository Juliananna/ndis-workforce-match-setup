import { secret } from "encore.dev/config";

const twilioAccountSid = secret("TwilioAccountSid");
const twilioAuthToken = secret("TwilioAuthToken");
const twilioWhatsAppFrom = secret("TwilioWhatsAppFrom");

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  const sid = twilioAccountSid();
  const token = twilioAuthToken();
  const from = twilioWhatsAppFrom();

  if (!sid || !token || !from) return;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const toE164 = (num: string): string => {
    const stripped = num.replace(/[\s\-().]/g, "");
    if (stripped.startsWith("+")) return stripped;
    if (stripped.startsWith("0")) return `+61${stripped.slice(1)}`;
    if (stripped.startsWith("61")) return `+${stripped}`;
    return `+${stripped}`;
  };

  const normaliseWA = (num: string) =>
    num.startsWith("whatsapp:") ? num : `whatsapp:${num}`;

  const params = new URLSearchParams({
    From: normaliseWA(from),
    To: normaliseWA(toE164(to)),
    Body: body,
  });

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
    throw new Error(`Twilio API error ${res.status}: ${text}`);
  }
}
