import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import db from "../db";
import { autoRevokeReadinessIfInvalid } from "./readiness_auto_revoke";

export interface ReadinessReconcileResponse {
  checkedCount: number;
  revokedCount: number;
  stillEligibleCount: number;
}

/**
 * Scans all workers currently marked ready_to_hire = TRUE and revokes any that
 * no longer meet the mandatory compliance criteria (e.g. documents have since expired).
 *
 * This covers the time-based expiry gap: a document may expire due to the passage of time
 * without any admin or worker action triggering an event, so a periodic check is needed.
 */
export async function runReadinessReconcile(): Promise<ReadinessReconcileResponse> {
  const readyWorkers = await db.queryAll<{ worker_id: string }>`
    SELECT worker_id FROM workers WHERE ready_to_hire = TRUE
  `;

  let revokedCount = 0;
  let stillEligibleCount = 0;

  for (const { worker_id } of readyWorkers) {
    try {
      const before = await db.queryRow<{ ready_to_hire: boolean }>`
        SELECT ready_to_hire FROM workers WHERE worker_id = ${worker_id}
      `;
      await autoRevokeReadinessIfInvalid(worker_id);
      const after = await db.queryRow<{ ready_to_hire: boolean }>`
        SELECT ready_to_hire FROM workers WHERE worker_id = ${worker_id}
      `;

      if (before?.ready_to_hire && !after?.ready_to_hire) {
        revokedCount++;
      } else {
        stillEligibleCount++;
      }
    } catch (err) {
      console.error("[readiness_reconcile] error checking worker", worker_id, err);
    }
  }

  return {
    checkedCount: readyWorkers.length,
    revokedCount,
    stillEligibleCount,
  };
}

export const adminReadinessReconcile = api<void, ReadinessReconcileResponse>(
  {
    expose: true,
    auth: false,
    method: "POST",
    path: "/admin/readiness/reconcile",
  },
  async () => runReadinessReconcile()
);

const _ = new CronJob("readiness-expiry-check", {
  title: "Ready-to-Hire Expiry Reconciliation",
  schedule: "0 2 * * *",
  endpoint: adminReadinessReconcile,
});
