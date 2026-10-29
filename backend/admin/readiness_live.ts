import db from "../db";
import { computeReadinessEligibility } from "./readiness_eligibility";
import { autoRevokeReadinessIfInvalid } from "./readiness_auto_revoke";

export interface LiveReadinessStatus {
  readyToHire: boolean;
  approvedAt: Date | null;
  approvedBy: string | null;
  eligibleNow: boolean;
  ineligibilityReasons: string[];
  revokedAt: Date | null;
  revokedBy: string | null;
  revokeReason: string | null;
}

/**
 * Returns the current readiness status for a worker by re-computing eligibility
 * from live compliance data, regardless of the stored ready_to_hire boolean.
 *
 * If the stored value is TRUE but the worker is no longer eligible (e.g. a mandatory
 * document has since expired), the readiness is automatically revoked and the returned
 * readyToHire value reflects the corrected state.
 *
 * This is the single authoritative source for readiness state in any context where
 * the value has compliance or hiring consequences.
 */
export async function getLiveReadinessStatus(
  workerId: string
): Promise<LiveReadinessStatus> {
  await autoRevokeReadinessIfInvalid(workerId);

  const row = await db.queryRow<{
    ready_to_hire: boolean;
    ready_to_hire_approved_at: Date | null;
    ready_to_hire_approved_by: string | null;
    ready_to_hire_revoked_at: Date | null;
    ready_to_hire_revoked_by: string | null;
    ready_to_hire_revoke_reason: string | null;
  }>`
    SELECT
      ready_to_hire, ready_to_hire_approved_at, ready_to_hire_approved_by,
      ready_to_hire_revoked_at, ready_to_hire_revoked_by, ready_to_hire_revoke_reason
    FROM workers
    WHERE worker_id = ${workerId}
  `;

  const snapshot = await computeReadinessEligibility(workerId);

  return {
    readyToHire: row?.ready_to_hire ?? false,
    approvedAt: row?.ready_to_hire_approved_at ?? null,
    approvedBy: row?.ready_to_hire_approved_by ?? null,
    eligibleNow: snapshot.eligible,
    ineligibilityReasons: snapshot.ineligibilityReasons,
    revokedAt: row?.ready_to_hire_revoked_at ?? null,
    revokedBy: row?.ready_to_hire_revoked_by ?? null,
    revokeReason: row?.ready_to_hire_revoke_reason ?? null,
  };
}
