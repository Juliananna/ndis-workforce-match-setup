import { secret } from "encore.dev/config";

const twilioAccountSid = secret("TwilioAccountSid");
const twilioAuthToken = secret("TwilioAuthToken");
const twilioWhatsAppFrom = secret("TwilioWhatsAppFrom");

const toE164 = (num: string): string => {
  const stripped = num.replace(/[\s\-().]/g, "");
  if (stripped.startsWith("+")) return stripped;
  if (stripped.startsWith("0")) return `+61${stripped.slice(1)}`;
  if (stripped.startsWith("61")) return `+${stripped}`;
  return `+${stripped}`;
};

const normaliseWA = (num: string) =>
  num.startsWith("whatsapp:") ? num : `whatsapp:${num}`;

function getCredentials() {
  return {
    sid: twilioAccountSid(),
    token: twilioAuthToken(),
    from: twilioWhatsAppFrom(),
  };
}

async function twilioPost(
  sid: string,
  token: string,
  params: URLSearchParams
): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
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
    throw new Error(`Twilio error ${res.status}: ${text}`);
  }
}

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  const { sid, token, from } = getCredentials();
  if (!sid || !token || !from) return;

  const params = new URLSearchParams({
    From: normaliseWA(from),
    To: normaliseWA(toE164(to)),
    Body: body,
  });

  await twilioPost(sid, token, params);
}

export async function sendWhatsAppTemplate(
  to: string,
  contentSid: string,
  variables?: Record<string, string>
): Promise<void> {
  const { sid, token, from } = getCredentials();
  if (!sid || !token || !from) return;

  const params = new URLSearchParams({
    From: normaliseWA(from),
    To: normaliseWA(toE164(to)),
    ContentSid: contentSid,
  });

  if (variables && Object.keys(variables).length > 0) {
    params.set("ContentVariables", JSON.stringify(variables));
  }

  await twilioPost(sid, token, params);
}
