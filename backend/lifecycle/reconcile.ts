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

/**
 * Attempts to write a lifecycle event and verifies it was actually persisted
 * before counting it as a successful repair.
 *
 * writeLifecycleEvent() catches all errors internally and never throws, so a
 * failed write is indistinguishable from a no-op at the call site. This
 * function performs an explicit post-write existence check to confirm the row
 * landed before reporting "inserted". A write that fails silently will appear
 * as "error" in the output, not "inserted".
 */
async function tryWrite(
  opts: Parameters<typeof writeLifecycleEvent>[0],
  details: ReconcileDetail[],
  counters: { inserted: number; alreadyPresent: number; errors: number }
): Promise<void> {
  const key = opts.idempotencyKey ?? deriveEventId(opts.entityType, opts.entityId, opts.eventType);

  try {
    const existsBefore = await eventExists(key);
    if (existsBefore) {
      counters.alreadyPresent++;
      details.push({
        eventType: opts.eventType,
        entityId: opts.entityId,
        idempotencyKey: key,
        outcome: "already_present",
      });
      return;
    }

    await writeLifecycleEvent(opts);

    const existsAfter = await eventExists(key);
    if (existsAfter) {
      counters.inserted++;
      details.push({
        eventType: opts.eventType,
        entityId: opts.entityId,
        idempotencyKey: key,
        outcome: "inserted",
      });
    } else {
      counters.errors++;
      details.push({
        eventType: opts.eventType,
        entityId: opts.entityId,
        idempotencyKey: key,
        outcome: "error",
        errorMessage: "write appeared to succeed but row not found in post-write verification",
      });
    }
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
 * For each expected lifecycle event, derives the same deterministic idempotency
 * key used by the original writer and inserts the row only if it is absent.
 * The post-write existence check ensures a silently-failed write is reported as
 * an error, not a success.
 *
 * Key anchoring strategy:
 *
 *   email_captured / resume_completed / worker_profile_created /
 *   worker_profile_linked / email_verified
 *     — keyed by (entity_type, entity_id, event_type[, suffix]).
 *       These events are one-per-entity so the entity ID is sufficient.
 *
 *   ready_to_hire_approved / ready_to_hire_revoked / ready_to_hire_auto_revoked
 *     — ALL sourced from ready_to_hire_audit using the audit row UUID as suffix.
 *       The live writers (approve_readiness.ts, readiness_auto_revoke.ts) use the
 *       same "audit:<uuid>" suffix, so live and reconciler keys are identical for
 *       any decision made after this change was deployed. Each audit row represents
 *       one distinct decision and produces one distinct stable lifecycle event ID.
 *
 * Events not modified: GHL contact IDs, tags, sync logs, or any other state.
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
       WHERE session_id = rs.id AND consent_type = 'marketing_emails' LIMIT 1)
        AS consent_marketing_emails,
      (SELECT granted FROM resume_session_consents
       WHERE session_id = rs.id AND consent_type = 'profile_creation' LIMIT 1)
        AS consent_profile_creation,
      (SELECT granted FROM resume_session_consents
       WHERE session_id = rs.id AND consent_type = 'provider_visibility' LIMIT 1)
        AS consent_provider_visibility,
      rs.created_at
    FROM resume_sessions rs
    WHERE rs.email IS NOT NULL
      AND rs.status != 'draft'
  `;

  for (const s of emailCapturedSessions) {
    checked++;
    await tryWrite({
      eventType: "email_captured",
      entityType: "resume_session",
      entityId: s.id,
      idempotencyKey: deriveEventId("resume_session", s.id, "email_captured"),
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
    await tryWrite({
      eventType: "resume_completed",
      entityType: "resume_session",
      entityId: s.id,
      idempotencyKey: deriveEventId("resume_session", s.id, "resume_completed"),
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
  // 3. worker_profile_created / worker_profile_linked
  //    Source: resume_sessions with converted_worker_id IS NOT NULL.
  //    The audit log distinguishes linked (pre-existing user) from created.
  //    Key: sha256("resume_session:<sessionId>:worker_profile_created|linked")
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
          AND event_type IN (
            'worker_profile_created_from_resume',
            'converted_to_profile',
            'worker_profile_linked'
          )
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
    await tryWrite({
      eventType,
      entityType: "worker",
      entityId: workerRow.worker_id,
      idempotencyKey: deriveEventId("resume_session", s.id, eventType),
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
  //    Users who verified via link click and have no resume-builder session.
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
      AND u.is_demo = FALSE
      AND NOT EXISTS (
        SELECT 1 FROM resume_sessions rs
        JOIN workers w ON w.worker_id = rs.converted_worker_id
        WHERE w.user_id = u.user_id
      )
  `;

  for (const u of directVerifiedUsers) {
    checked++;
    await tryWrite({
      eventType: "email_verified",
      entityType: "user",
      entityId: u.user_id,
      idempotencyKey: deriveEventId("user", u.user_id, "email_verified", "direct_registration"),
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
  //    Users created via resume builder (is_verified = TRUE at creation).
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
    await tryWrite({
      eventType: "email_verified",
      entityType: "user",
      entityId: u.user_id,
      idempotencyKey: deriveEventId("user", u.user_id, "email_verified", "resume_builder_auto"),
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
  // 6. ready_to_hire_approved / ready_to_hire_revoked / ready_to_hire_auto_revoked
  //
  //    ALL sourced from ready_to_hire_audit — the authoritative decision log.
  //
  //    Key formula (live writers and reconciler are identical):
  //      sha256("worker:<workerId>:<eventType>:audit:<auditRowUUID>")
  //
  //    Properties:
  //      - Each audit row has a unique UUID (gen_random_uuid()), so each
  //        distinct decision produces a distinct lifecycle event — even when
  //        a worker is approved, revoked, and re-approved on the same day.
  //      - The live writers (approve_readiness.ts, readiness_auto_revoke.ts)
  //        INSERT the audit row first, capture RETURNING id, and pass
  //        "audit:<id>" as the suffix. This reconciler does the same.
  //        The two code paths therefore produce identical event_id values for
  //        the same decision, making reconciliation a provable no-op for any
  //        event that was successfully written at action time.
  //      - Repeated reconciliation runs are always safe: the pre-write
  //        existence check and ON CONFLICT DO NOTHING guarantee no duplicates.
  //
  //    Transition note — historical events written before this change:
  //      Prior to this change the live writers used time-scoped suffixes
  //      (YYYY-MM-DD for approve, YYYY-MM-DDTHH:MM for revoke, YYYY-MM-DDTHH
  //      for auto_revoke). Those event rows still exist in lifecycle_events and
  //      are NOT deleted or rewritten — requirement 5 is preserved.
  //      When the reconciler encounters an audit row whose old time-scoped event
  //      is already present under a different key, the audit-UUID-keyed INSERT
  //      will succeed and add a second event row for the same decision. This is
  //      a one-time consequence of the key-scheme migration; the event log is
  //      append-only and consumers must tolerate multiple events of the same
  //      type for the same entity. The GHL sync pipeline is not affected.
  //      Going forward, all new decisions produce exactly one event row anchored
  //      to the audit UUID, and reconciliation is always a no-op for those rows.
  //
  //    Original timestamps (created_at from audit) are preserved exactly.
  //    No data is invented: every field comes directly from the audit row or
  //    the associated workers/users join.
  // ------------------------------------------------------------------
  const auditRows = await db.queryAll<{
    id: string;
    worker_id: string;
    action: string;
    acted_by_email: string | null;
    reason: string | null;
    verified_doc_count: number;
    verified_ref_count: number;
    mandatory_doc_types: string[];
    eligibility_snapshot: unknown;
    created_at: Date;
    worker_email: string;
  }>`
    SELECT
      a.id,
      a.worker_id,
      a.action,
      a.acted_by_email,
      a.reason,
      a.verified_doc_count,
      a.verified_ref_count,
      a.mandatory_doc_types,
      a.eligibility_snapshot,
      a.created_at,
      u.email AS worker_email
    FROM ready_to_hire_audit a
    JOIN workers w ON w.worker_id = a.worker_id
    JOIN users u ON u.user_id = w.user_id
    ORDER BY a.created_at ASC
  `;

  for (const a of auditRows) {
    checked++;

    const snapshot = a.eligibility_snapshot != null
      ? (typeof a.eligibility_snapshot === "string"
          ? JSON.parse(a.eligibility_snapshot)
          : a.eligibility_snapshot) as Record<string, unknown>
      : null;

    const mandatoryDocsPresent: string[] =
      Array.isArray(snapshot?.mandatoryDocsPresent)
        ? (snapshot!.mandatoryDocsPresent as string[])
        : a.mandatory_doc_types;

    if (a.action === "approved") {
      await tryWrite({
        eventType: "ready_to_hire_approved",
        entityType: "worker",
        entityId: a.worker_id,
        idempotencyKey: deriveEventId("worker", a.worker_id, "ready_to_hire_approved", `audit:${a.id}`),
        payload: {
          eventType: "ready_to_hire_approved",
          occurredAt: a.created_at.toISOString(),
          workerId: a.worker_id,
          email: a.worker_email,
          approvedByEmail: a.acted_by_email ?? "unknown",
          verifiedDocCount: a.verified_doc_count,
          verifiedRefCount: a.verified_ref_count,
          mandatoryDocsPresent,
        },
        workerId: a.worker_id,
      }, details, counters);

    } else if (a.action === "revoked") {
      await tryWrite({
        eventType: "ready_to_hire_revoked",
        entityType: "worker",
        entityId: a.worker_id,
        idempotencyKey: deriveEventId("worker", a.worker_id, "ready_to_hire_revoked", `audit:${a.id}`),
        payload: {
          eventType: "ready_to_hire_revoked",
          occurredAt: a.created_at.toISOString(),
          workerId: a.worker_id,
          email: a.worker_email,
          revokedByEmail: a.acted_by_email ?? "unknown",
          reason: a.reason ?? "",
        },
        workerId: a.worker_id,
      }, details, counters);

    } else if (a.action === "auto_revoked") {
      const mandatoryDocsExpiredOrFlagged: string[] =
        Array.isArray(snapshot?.mandatoryDocsExpiredOrFlagged)
          ? (snapshot!.mandatoryDocsExpiredOrFlagged as string[])
          : [];

      await tryWrite({
        eventType: "ready_to_hire_auto_revoked",
        entityType: "worker",
        entityId: a.worker_id,
        idempotencyKey: deriveEventId("worker", a.worker_id, "ready_to_hire_auto_revoked", `audit:${a.id}`),
        payload: {
          eventType: "ready_to_hire_auto_revoked",
          occurredAt: a.created_at.toISOString(),
          workerId: a.worker_id,
          email: a.worker_email,
          reason: a.reason ?? "",
          mandatoryDocsExpiredOrFlagged,
        },
        workerId: a.worker_id,
      }, details, counters);
    }
  }

  return {
    checked,
    inserted: counters.inserted,
    alreadyPresent: counters.alreadyPresent,
    errors: counters.errors,
    details,
  };
}

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
