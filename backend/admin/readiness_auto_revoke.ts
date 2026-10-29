import db from "../db";
import {
  computeReadinessEligibility,
  MANDATORY_COMPLIANCE_DOC_TYPES,
} from "./readiness_eligibility";
import { writeLifecycleEvent, deriveEventId } from "../lifecycle/writer";

/**
 * Called after any compliance event that might invalidate a worker's readiness
 * (document flagged, document expired, document deleted, reference revoked).
 *
 * If the worker is currently marked ready_to_hire but no longer meets the
 * mandatory criteria, readiness is automatically revoked and an audit record
 * is written.
 *
 * The lifecycle event idempotency key is derived from the audit row UUID so
 * that the reconciler produces the exact same event ID for this decision.
 *
 * This function is intentionally silent on errors — it must not interrupt
 * the calling compliance action.
 */
export async function autoRevokeReadinessIfInvalid(
  workerId: string
): Promise<void> {
  try {
    const workerRow = await db.queryRow<{ ready_to_hire: boolean }>`
      SELECT ready_to_hire FROM workers WHERE worker_id = ${workerId}
    `;
    if (!workerRow?.ready_to_hire) return;

    const snapshot = await computeReadinessEligibility(workerId);
    if (snapshot.eligible) return;

    const reason =
      snapshot.mandatoryDocsExpiredOrFlagged.length > 0
        ? `Auto-revoked: mandatory document(s) expired or flagged: ${snapshot.mandatoryDocsExpiredOrFlagged.join(", ")}`
        : snapshot.mandatoryDocsMissing.length > 0
        ? `Auto-revoked: mandatory document(s) missing: ${snapshot.mandatoryDocsMissing.join(", ")}`
        : snapshot.verifiedRefCount < 2
        ? `Auto-revoked: verified reference count dropped below 2 (now ${snapshot.verifiedRefCount})`
        : `Auto-revoked: eligibility criteria no longer met`;

    await db.exec`
      UPDATE workers
      SET
        ready_to_hire               = FALSE,
        ready_to_hire_revoked_at    = NOW(),
        ready_to_hire_revoked_by    = 'system',
        ready_to_hire_revoke_reason = ${reason},
        updated_at                  = NOW()
      WHERE worker_id = ${workerId}
        AND ready_to_hire = TRUE
    `;

    // Write audit row first and capture its UUID. The lifecycle event
    // idempotency key is derived from this UUID so that the live writer
    // and the reconciler always produce identical event IDs for the same
    // auto-revocation decision.
    const auditRow = await db.queryRow<{ id: string }>`
      INSERT INTO ready_to_hire_audit
        (worker_id, action, acted_by_user_id, acted_by_email, reason,
         eligible_doc_count, verified_doc_count, verified_ref_count,
         mandatory_doc_types, eligibility_snapshot)
      VALUES
        (${workerId}, 'auto_revoked', NULL, 'system', ${reason},
         ${snapshot.eligibleDocCount}, ${snapshot.verifiedDocCount},
         ${snapshot.verifiedRefCount},
         ${JSON.stringify([...MANDATORY_COMPLIANCE_DOC_TYPES])},
         ${JSON.stringify(snapshot)}::jsonb)
      RETURNING id
    `;

    const workerEmailRow = await db.queryRow<{ email: string }>`
      SELECT u.email FROM workers w JOIN users u ON u.user_id = w.user_id
      WHERE w.worker_id = ${workerId}
    `;

    await writeLifecycleEvent({
      eventType: "ready_to_hire_auto_revoked",
      entityType: "worker",
      entityId: workerId,
      idempotencyKey: deriveEventId("worker", workerId, "ready_to_hire_auto_revoked", `audit:${auditRow!.id}`),
      payload: {
        eventType: "ready_to_hire_auto_revoked",
        occurredAt: new Date().toISOString(),
        workerId,
        email: workerEmailRow?.email ?? "",
        reason,
        mandatoryDocsExpiredOrFlagged: snapshot.mandatoryDocsExpiredOrFlagged,
      },
      workerId,
    });
  } catch (err) {
    console.error(
      "[readiness_auto_revoke] failed to auto-revoke readiness for worker",
      workerId,
      err
    );
  }
}
