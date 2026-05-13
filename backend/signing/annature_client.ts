import { secret } from "encore.dev/config";

const annaturePublicKey = secret("AnnaturePublicKey");
const annaturePrivateKey = secret("AnnaturePrivateKey");
export const annatureAccountId = secret("AnnatureAccountId");

const BASE_URL = "https://api.annature.com.au/v1";

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Annature-Id": annaturePublicKey(),
    "X-Annature-Key": annaturePrivateKey(),
  };
}

export interface AnnatureRecipient {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface AnnatureEnvelopeResponse {
  id: string;
  status: string;
  recipients: AnnatureRecipient[];
}

export async function createAndSendEnvelope(params: {
  name: string;
  workerName: string;
  workerEmail: string;
  documentBase64: string;
  redirectUrl: string;
}): Promise<{ envelopeId: string; recipientId: string }> {
  const body = {
    name: params.name,
    account_id: annatureAccountId(),
    documents: [
      {
        base: params.documentBase64,
        type: "application/pdf",
        name: "NDIS Code of Conduct",
      },
    ],
    recipients: [
      {
        name: params.workerName,
        email: params.workerEmail,
        type: "signer",
        muted: true,
        redirects: {
          session_completed: params.redirectUrl,
          session_declined: params.redirectUrl,
        },
        fields: [
          {
            type: "signature",
            anchor: "{{signature}}",
            x_offset: 0,
            y_offset: 0,
          },
          {
            type: "date",
            anchor: "{{date}}",
            x_offset: 0,
            y_offset: 0,
          },
        ],
      },
    ],
  };

  const res = await fetch(`${BASE_URL}/envelopes`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Annature create envelope failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as AnnatureEnvelopeResponse;
  const recipient = data.recipients?.[0];
  if (!recipient) throw new Error("No recipient returned from Annature");

  await fetch(`${BASE_URL}/envelopes/${data.id}/send`, {
    method: "POST",
    headers: headers(),
  });

  return { envelopeId: data.id, recipientId: recipient.id };
}

export async function getSigningUrl(recipientId: string): Promise<{ url: string; expiration: string }> {
  const res = await fetch(`${BASE_URL}/recipients/${recipientId}/token?token_duration=7`, {
    method: "GET",
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Annature get signing token failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { endpoint: string; expiration: string };
  return { url: data.endpoint, expiration: data.expiration };
}

export async function getEnvelope(envelopeId: string): Promise<AnnatureEnvelopeResponse> {
  const res = await fetch(`${BASE_URL}/envelopes/${envelopeId}`, {
    method: "GET",
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Annature get envelope failed (${res.status}): ${text}`);
  }

  return (await res.json()) as AnnatureEnvelopeResponse;
}
