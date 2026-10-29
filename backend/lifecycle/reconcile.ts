import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertSysAdmin } from "../admin/guard";
import { writeLifecycleEvent, deriveEventId } from "./writer";

export interface LifecycleReconcileResponse {
  checked: number;
  inserted: number;
  alreadyPresent: number;
  errors: number;
  details: ReconcileDetail[];
}

interface ReconcileDetail {
  eventType: string;
  entityId: string;
  idempotencyKey: string;
  outcome: "inserted" | "already_present" | "error";
  errorMessage?: string;
}

async function eventExists(idempotencyKey: string): Promise<boolean> {
  const row = await db.queryRow<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM lifecycle_events WHERE event_id = ${idempotencyKey}
    ) AS exists
  `;
  return row?.exists ?? false;
}

async function tryWrite(
  opts: Parameters<typeof writeLifecycleEvent>[0],
  details: ReconcileDetail[],
  counters: { inserted: number; alreadyPresent: number; errors: number }
): Promise<void> {
  const key = opts.idempotencyKey ?? deriveEventId(opts.entityType, opts.entityId, opts.eventType);
  try {
    const exists = await eventExists(key);
    if (exists) {
      counters.alreadyPresent++;
      details.push({ eventType: opts.eventType, entityId: opts.entityId, idempotencyKey: key, outcome: "already_present" });
      return;
    }
    await writeLifecycleEvent(opts);
    counters.inserted++;
    details.push({ eventType: opts.eventType, entityId: opts.entityId, idempotencyKey: key, outcome: "inserted" });
  } catch (err) {
    counters.errors++;
    details.push({
      eventType: opts.eventType,
      entityId: opts.entityId,
      idempotencyKey: key,
      outcome: "error",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Idempotent reconciliation of lifecycle_events against authoritative database state.
 *
 * For each expected lifecycle event type, this function derives the same
 * deterministic idempotency key used by the original writer and inserts the
 * event row only if it is absent. Rows that already exist are skipped via
 * ON CONFLICT DO NOTHING — making the entire operation safe to run repeatedly.
 *
 * Covered event types (in the order they occur in the funnel):
 *   email_captured           — resume_sessions with email IS NOT NULL
 *   resume_completed         — resume_sessions with resume_completed_at IS NOT NULL
 *   worker_profile_created   — sessions with converted_worker_id, user is_new (created via resume builder)
 *   worker_profile_linked    — sessions with converted_worker_id, user pre-existed
 *   email_verified           — users.is_verified = TRUE (both paths)
 *   ready_to_hire_approved   — workers.ready_to_hire = TRUE (current approved state)
 *
 * NOT covered by this reconciler (revocation events):
 *   ready_to_hire_revoked / ready_to_hire_auto_revoked — these are point-in-time
 *   events tied to a specific admin action or auto-revoke run. They cannot be
 *   reconstructed from current DB state alone because the state has already
 *   transitioned back to ready_to_hire = FALSE. The ready_to_hire_audit table
 *   is the authoritative log for those events and should be consulted separately.
 *
 * GHL sync state is not modified by this function.
 */
export async function runLifecycleReconcile(): Promise<LifecycleReconcileResponse> {
  const details: ReconcileDetail[] = [];
  const counters = { inserted: 0, alreadyPresent: 0, errors: 0 };
  let checked = 0;

  // ------------------------------------------------------------------
  // 1. email_captured
  //    Source: resume_sessions where email IS NOT NULL and status != 'draft'
  //    Key: sha256("resume_session:<sessionId>:email_captured")
  // ------------------------------------------------------------------
  const emailCapturedSessions = await db.queryAll<{
    id: string;
    email: string;
    consent_marketing_emails: boolean | null;
    consent_profile_creation: boolean | null;
    consent_provider_visibility: boolean | null;
    created_at: Date;
  }>`
    SELECT
      rs.id,
      rs.email,
      (SELECT granted FROM resume_session_consents
       WHERE session_id = rs.id AND consent_type = 'marketing_emails' LIMIT 1) AS consent_marketing_emails,
      (SELECT granted FROM resume_session_consents
       WHERE session_id = rs.id AND consent_type = 'profile_creation' LIMIT 1) AS consent_profile_creation,
      (SELECT granted FROM resume_session_consents
       WHERE session_id = rs.id AND consent_type = 'provider_visibility' LIMIT 1) AS consent_provider_visibility,
      rs.created_at
    FROM resume_sessions rs
    WHERE rs.email IS NOT NULL
      AND rs.status != 'draft'
  `;

  for (const s of emailCapturedSessions) {
    checked++;
    const key = deriveEventId("resume_session", s.id, "email_captured");
    await tryWrite({
      eventType: "email_captured",
      entityType: "resume_session",
      entityId: s.id,
      idempotencyKey: key,
      payload: {
        eventType: "email_captured",
        occurredAt: s.created_at.toISOString(),
        sessionId: s.id,
        email: s.email,
        consentMarketingEmails: s.consent_marketing_emails ?? false,
        consentProfileCreation: s.consent_profile_creation ?? false,
        consentProviderVisibility: s.consent_provider_visibility ?? false,
        ipAddress: null,
        userAgent: null,
      },
      sessionId: s.id,
    }, details, counters);
  }

  // ------------------------------------------------------------------
  // 2. resume_completed
  //    Source: resume_sessions where resume_completed_at IS NOT NULL
  //    Key: sha256("resume_session:<sessionId>:resume_completed")
  // ------------------------------------------------------------------
  const completedSessions = await db.queryAll<{
    id: string;
    email: string | null;
    resume_completed_at: Date;
    resume_completed_step: number | null;
    resume_strength_score: number | null;
    converted_worker_id: string | null;
    utm_source: string | null;
    fbclid: string | null;
    meta_campaign_id: string | null;
  }>`
    SELECT id, email, resume_completed_at, resume_completed_step,
           resume_strength_score, converted_worker_id,
           utm_source, fbclid, meta_campaign_id
    FROM resume_sessions
    WHERE resume_completed_at IS NOT NULL
  `;

  for (const s of completedSessions) {
    checked++;
    const key = deriveEventId("resume_session", s.id, "resume_completed");
    await tryWrite({
      eventType: "resume_completed",
      entityType: "resume_session",
      entityId: s.id,
      idempotencyKey: key,
      payload: {
        eventType: "resume_completed",
        occurredAt: s.resume_completed_at.toISOString(),
        sessionId: s.id,
        email: s.email,
        stepCompleted: s.resume_completed_step ?? 8,
        resumeStrengthScore: s.resume_strength_score,
        convertedWorkerId: s.converted_worker_id,
        utmSource: s.utm_source,
        fbclid: s.fbclid,
        metaCampaignId: s.meta_campaign_id,
      },
      sessionId: s.id,
    }, details, counters);
  }

  // ------------------------------------------------------------------
  // 3. worker_profile_created and worker_profile_linked
  //    Source: resume_sessions with converted_worker_id IS NOT NULL
  //    Key for both: sha256("resume_session:<sessionId>:worker_profile_created|linked")
  //    Distinction: if the user was created IN THE SAME transaction (is_new),
  //    we look at whether the user's created_at is close to the session's
  //    conversion. The authoritative signal is resume_audit_log.
  //    Simpler and safer: check both event types, insert whichever is missing.
  //    The worker row always exists by the time we run; we use consent records
  //    to reconstruct marketing consent accurately.
  // ------------------------------------------------------------------
  const convertedSessions = await db.queryAll<{
    id: string;
    email: string;
    converted_worker_id: string;
    updated_at: Date;
    audit_event_type: string | null;
  }>`
    SELECT
      rs.id,
      rs.email,
      rs.converted_worker_id,
      rs.updated_at,
      (
        SELECT event_type FROM resume_audit_log
        WHERE session_id = rs.id
          AND event_type IN ('worker_profile_created_from_resume', 'converted_to_profile', 'worker_profile_linked')
        ORDER BY created_at ASC
        LIMIT 1
      ) AS audit_event_type
    FROM resume_sessions rs
    WHERE rs.converted_worker_id IS NOT NULL
      AND rs.email IS NOT NULL
  `;

  for (const s of convertedSessions) {
    const workerRow = await db.queryRow<{
      worker_id: string;
      user_id: string;
      marketing_consent: boolean | null;
    }>`
      SELECT w.worker_id, w.user_id, w.marketing_consent
      FROM workers w
      WHERE w.worker_id = ${s.converted_worker_id}
    `;
    if (!workerRow) continue;

    const isLinked = s.audit_event_type === "worker_profile_linked";
    const eventType = isLinked ? "worker_profile_linked" : "worker_profile_created";

    checked++;
    const key = deriveEventId("resume_session", s.id, eventType);
    await tryWrite({
      eventType,
      entityType: isLinked ? "worker" : "worker",
      entityId: workerRow.worker_id,
      idempotencyKey: key,
      payload: isLinked
        ? {
            eventType: "worker_profile_linked",
            occurredAt: s.updated_at.toISOString(),
            workerId: workerRow.worker_id,
            userId: workerRow.user_id,
            sessionId: s.id,
            email: s.email,
          }
        : {
            eventType: "worker_profile_created",
            occurredAt: s.updated_at.toISOString(),
            workerId: workerRow.worker_id,
            userId: workerRow.user_id,
            sessionId: s.id,
            email: s.email,
            consentMarketingEmails: workerRow.marketing_consent ?? false,
            marketingConsentTransferred: true,
            isNewUser: s.audit_event_type === "converted_to_profile",
          },
      workerId: workerRow.worker_id,
      sessionId: s.id,
      userId: workerRow.user_id,
    }, details, counters);
  }

  // ------------------------------------------------------------------
  // 4. email_verified — direct_registration path
  //    Source: users.is_verified = TRUE, verification_token IS NULL
  //    and no worker was created via resume builder for this user
  //    Key: sha256("user:<userId>:email_verified:direct_registration")
  // ------------------------------------------------------------------
  const directVerifiedUsers = await db.queryAll<{
    user_id: string;
    email: string;
    role: string;
    updated_at: Date;
  }>`
    SELECT u.user_id, u.email, u.role, u.updated_at
    FROM users u
    WHERE u.is_verified = TRUE
      AND u.verification_token IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM resume_sessions rs
        WHERE rs.converted_worker_id IN (
          SELECT worker_id FROM workers WHERE user_id = u.user_id
        )
      )
      AND u.is_demo = FALSE
  `;

  for (const u of directVerifiedUsers) {
    checked++;
    const key = deriveEventId("user", u.user_id, "email_verified", "direct_registration");
    await tryWrite({
      eventType: "email_verified",
      entityType: "user",
      entityId: u.user_id,
      idempotencyKey: key,
      payload: {
        eventType: "email_verified",
        occurredAt: u.updated_at.toISOString(),
        userId: u.user_id,
        email: u.email,
        role: u.role,
        verificationPath: "direct_registration",
      },
      userId: u.user_id,
    }, details, counters);
  }

  // ------------------------------------------------------------------
  // 5. email_verified — resume_builder_auto path
  //    Source: users created via resume builder (is_verified = TRUE at creation,
  //    linked to a resume session that was converted)
  //    Key: sha256("user:<userId>:email_verified:resume_builder_auto")
  // ------------------------------------------------------------------
  const resumeAutoVerifiedUsers = await db.queryAll<{
    user_id: string;
    email: string;
    role: string;
    worker_id: string;
    session_id: string;
    created_at: Date;
  }>`
    SELECT u.user_id, u.email, u.role, w.worker_id, rs.id AS session_id, u.created_at
    FROM users u
    JOIN workers w ON w.user_id = u.user_id
    JOIN resume_sessions rs ON rs.converted_worker_id = w.worker_id
    WHERE u.is_verified = TRUE
      AND u.is_demo = FALSE
  `;

  for (const u of resumeAutoVerifiedUsers) {
    checked++;
    const key = deriveEventId("user", u.user_id, "email_verified", "resume_builder_auto");
    await tryWrite({
      eventType: "email_verified",
      entityType: "user",
      entityId: u.user_id,
      idempotencyKey: key,
      payload: {
        eventType: "email_verified",
        occurredAt: u.created_at.toISOString(),
        userId: u.user_id,
        email: u.email,
        role: u.role,
        verificationPath: "resume_builder_auto",
      },
      userId: u.user_id,
      workerId: u.worker_id,
      sessionId: u.session_id,
    }, details, counters);
  }

  // ------------------------------------------------------------------
  // 6. ready_to_hire_approved (current approved state only)
  //    Source: workers.ready_to_hire = TRUE with approved_at set
  //    Key: sha256("worker:<workerId>:ready_to_hire_approved:<date>")
  //    Note: uses the date of approval as the suffix — same key as original.
  // ------------------------------------------------------------------
  const approvedWorkers = await db.queryAll<{
    worker_id: string;
    email: string;
    ready_to_hire_approved_at: Date;
    ready_to_hire_approved_by: string | null;
    verified_doc_count: number;
    verified_ref_count: number;
  }>`
    SELECT
      w.worker_id,
      u.email,
      w.ready_to_hire_approved_at,
      w.ready_to_hire_approved_by,
      (SELECT COUNT(*)::int FROM worker_documents
       WHERE worker_id = w.worker_id AND verification_status = 'Verified') AS verified_doc_count,
      (SELECT COUNT(*)::int FROM worker_references
       WHERE worker_id = w.worker_id AND status = 'verified') AS verified_ref_count
    FROM workers w
    JOIN users u ON u.user_id = w.user_id
    WHERE w.ready_to_hire = TRUE
      AND w.ready_to_hire_approved_at IS NOT NULL
  `;

  for (const w of approvedWorkers) {
    checked++;
    const dateKey = w.ready_to_hire_approved_at.toISOString().slice(0, 10);
    const key = deriveEventId("worker", w.worker_id, "ready_to_hire_approved", dateKey);
    await tryWrite({
      eventType: "ready_to_hire_approved",
      entityType: "worker",
      entityId: w.worker_id,
      idempotencyKey: key,
      payload: {
        eventType: "ready_to_hire_approved",
        occurredAt: w.ready_to_hire_approved_at.toISOString(),
        workerId: w.worker_id,
        email: w.email,
        approvedByEmail: w.ready_to_hire_approved_by ?? "unknown",
        verifiedDocCount: w.verified_doc_count,
        verifiedRefCount: w.verified_ref_count,
        mandatoryDocsPresent: [],
      },
      workerId: w.worker_id,
    }, details, counters);
  }

  return {
    checked,
    inserted: counters.inserted,
    alreadyPresent: counters.alreadyPresent,
    errors: counters.errors,
    details,
  };
}

// Admin-only manual trigger. GHL state is never modified.
export const adminLifecycleReconcile = api<void, LifecycleReconcileResponse>(
  {
    expose: true,
    auth: true,
    method: "POST",
    path: "/admin/lifecycle/reconcile",
  },
  async () => {
    const auth = getAuthData()!;
    await assertSysAdmin(auth.userID);
    return runLifecycleReconcile();
  }
);
