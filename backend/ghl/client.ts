import { secret } from "encore.dev/config";

const ghlAccessToken = secret("GHLAccessToken");
const ghlLocationId = secret("GHLLocationId");

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

export interface GHLContactPayload {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  companyName?: string;
  tags?: string[];
  source?: string;
  customFields?: { id: string; value: string }[];
}

export async function upsertContact(payload: GHLContactPayload): Promise<void> {
  const token = ghlAccessToken();
  const locationId = ghlLocationId();
  if (!token || !locationId) return;

  const body = {
    locationId,
    source: "API",
    ...payload,
  };

  const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Version: GHL_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL upsert failed (${res.status}): ${text}`);
  }
}
