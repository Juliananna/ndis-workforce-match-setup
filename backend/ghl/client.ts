import { secret } from "encore.dev/config";
import db from "../db";

const ghlAccessToken = secret("GHLAccessToken");
const ghlLocationId = secret("GHLLocationId");

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

const RETRY_DELAYS_MS = [1_000, 3_000, 9_000];

export interface GHLContactPayload {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  companyName?: string;
  tags?: string[];
  source?: string;
  website?: string;
  customFields?: { id: string; value: string }[];
}

export interface GHLUpsertResult {
  contactId: string | null;
}

// ─────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────

function isRetryable(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface FetchResult {
  ok: boolean;
  status: number;
  body: string;
}

async function ghlFetch(
  path: string,
  init: RequestInit,
  token: string
): Promise<FetchResult> {
  const url = `${GHL_BASE}${path}`;
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Version: GHL_VERSION,
        ...(init.headers as Record<string, string> | undefined),
      },
    });

    lastStatus = res.status;
    lastBody = await res.text();

    if (res.ok) {
      return { ok: true, status: res.status, body: lastBody };
    }

    if (!isRetryable(res.status) || attempt === RETRY_DELAYS_MS.length) {
      return { ok: false, status: res.status, body: lastBody };
    }

    await sleep(RETRY_DELAYS_MS[attempt]!);
  }

  return { ok: false, status: lastStatus, body: lastBody };
}

// ─────────────────────────────────────────────────
// Sync log helper
// ─────────────────────────────────────────────────

interface SyncLogEntry {
  email: string;
  entityType: "resume_session" | "worker" | "user";
  entityId: string;
  operation: string;
  success: boolean;
  ghlContactId?: string | null;
  errorMessage?: string | null;
  httpStatus?: number | null;
}

export async function writeSyncLog(entry: SyncLogEntry): Promise<void> {
  try {
    await db.exec`
      INSERT INTO ghl_sync_log
        (email, entity_type, entity_id, operation, success, ghl_contact_id, error_message, http_status)
      VALUES
        (${entry.email}, ${entry.entityType}, ${entry.entityId}, ${entry.operation},
         ${entry.success}, ${entry.ghlContactId ?? null}, ${entry.errorMessage ?? null},
         ${entry.httpStatus ?? null})
    `;
  } catch (logErr) {
    console.error("[ghl] failed to write sync log", logErr);
  }
}

// ─────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────

/**
 * Upserts a GHL contact and returns the resulting contact ID.
 *
 * PHASE 1 SCOPE: This function writes to GHL only for NEW contacts generated
 * by new registration / resume-builder flows. It does NOT alter existing contact
 * tags or lifecycle fields. Those changes are scoped to Phase 2 after workflow
 * assessment.
 *
 * Retry policy: up to 3 retries on 429 / 5xx with exponential backoff (1 s, 3 s, 9 s).
 * If all retries fail the error is re-thrown so callers can log it via writeSyncLog.
 */
export async function upsertContact(
  payload: GHLContactPayload
): Promise<GHLUpsertResult> {
  const token = ghlAccessToken();
  const locationId = ghlLocationId();
  if (!token || !locationId) {
    return { contactId: null };
  }

  const body = { locationId, source: "API", ...payload };

  const result = await ghlFetch(
    "/contacts/upsert",
    { method: "POST", body: JSON.stringify(body) },
    token
  );

  if (!result.ok) {
    throw new Error(
      `GHL upsert failed (HTTP ${result.status}): ${result.body.slice(0, 300)}`
    );
  }

  let contactId: string | null = null;
  try {
    const parsed = JSON.parse(result.body) as { contact?: { id?: string } };
    contactId = parsed.contact?.id ?? null;
  } catch {
    // contactId stays null; not fatal
  }

  return { contactId };
}

/**
 * STUB — Phase 2 only.
 *
 * Removing tags from existing contacts requires a confirmed GHL workflow audit
 * to ensure no active automations depend on the tag being present.
 * This function is intentionally a no-op in Phase 1 and throws if called in
 * a context that would reach live GHL.
 */
export async function removeContactTags(
  _contactId: string,
  _tags: string[]
): Promise<void> {
  throw new Error(
    "removeContactTags is not enabled in Phase 1. " +
      "Complete the GHL workflow audit before enabling tag removal."
  );
}
