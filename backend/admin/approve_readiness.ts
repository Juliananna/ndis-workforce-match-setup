import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdminOrCompliance } from "./guard";
import { writeAuditLog } from "./settings";
import {
  computeReadinessEligibility,
  type EligibilitySnapshot,
} from "./readiness_eligibility";
import { getLiveReadinessStatus, type LiveReadinessStatus } from "./readiness_live";
import { writeLifecycleEvent, deriveEventId } from "../lifecycle/writer";

export interface ReadinessEligibilityRequest {
  workerId: string;
}

export interface ReadinessEligibilityResponse {
  workerId: string;
  eligible: boolean;
  ineligibilityReasons: string[];
  snapshot: EligibilitySnapshot;
}

export const adminGetReadinessEligibility =
  api<ReadinessEligibilityRequest, ReadinessEligibilityResponse>(
    {
      expose: true,
      auth: true,
      method: "GET",
      path: "/admin/workers/:workerId/readiness-eligibility",
    },
    async (req) => {
      const auth = getAuthData()!;
      await assertAdminOrCompliance(auth.userID);

      const snapshot = await computeReadinessEligibility(req.workerId);
      return {
        workerId: req.workerId,
        eligible: snapshot.eligible,
        ineligibilityReasons: snapshot.ineligibilityReasons,
        snapshot,
      };
    }
  );

export interface GetLiveReadinessRequest {
  workerId: string;
}

export const adminGetLiveReadiness = api<GetLiveReadinessRequest, LiveReadinessStatus>(
  {
    expose: true,
    auth: true,
    method: "GET",
    path: "/admin/workers/:workerId/live-readiness",
  },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);
    return getLiveReadinessStatus(req.workerId);
  }
);

export interface ApproveReadinessRequest {
  workerId: string;
}

export interface ApproveReadinessResponse {
  workerId: string;
  readyToHire: boolean;
  approvedAt: Date;
  snapshot: EligibilitySnapshot;
}

export const adminApproveReadiness =
  api<ApproveReadinessRequest, ApproveReadinessResponse>(
    {
      expose: true,
      auth: true,
      method: "POST",
      path: "/admin/workers/:workerId/approve-readiness",
    },
    async (req) => {
      const auth = getAuthData()!;
      await assertAdminOrCompliance(auth.userID);

      const snapshot = await computeReadinessEligibility(req.workerId);

      if (!snapshot.eligible) {
        throw APIError.failedPrecondition(
          `Worker does not meet all readiness criteria: ${snapshot.ineligibilityReasons.join("; ")}`
        );
      }

      const adminRow = await db.queryRow<{ email: string }>`
        SELECT u.email FROM users u WHERE u.user_id = ${auth.userID}
      `;
      const adminEmail = adminRow?.email ?? auth.userID;

      const workerRow = await db.queryRow<{ worker_id: string }>`
        UPDATE workers
        SET
          ready_to_hire             = TRUE,
          ready_to_hire_approved_at = NOW(),
          ready_to_hire_approved_by = ${adminEmail},
          ready_to_hire_revoked_at  = NULL,
          ready_to_hire_revoked_by  = NULL,
          ready_to_hire_revoke_reason = NULL,
          updated_at                = NOW()
        WHERE worker_id = ${req.workerId}
        RETURNING worker_id
      `;
      if (!workerRow) throw APIError.notFound("worker not found");

      await db.exec`
        INSERT INTO ready_to_hire_audit
          (worker_id, action, acted_by_user_id, acted_by_email, reason,
           eligible_doc_count, verified_doc_count, verified_ref_count,
           mandatory_doc_types, eligibility_snapshot)
        VALUES
          (${req.workerId}, 'approved', ${auth.userID}, ${adminEmail}, NULL,
           ${snapshot.eligibleDocCount}, ${snapshot.verifiedDocCount},
           ${snapshot.verifiedRefCount},
           ${JSON.stringify(snapshot.mandatoryDocsPresent)},
           ${JSON.stringify(snapshot)}::jsonb)
      `;

      await writeAuditLog(
        auth.userID,
        adminEmail,
        "APPROVE_READINESS",
        "worker",
        req.workerId,
        {
          verifiedDocCount: snapshot.verifiedDocCount,
          verifiedRefCount: snapshot.verifiedRefCount,
          mandatoryDocsPresent: snapshot.mandatoryDocsPresent,
        }
      );

      const workerEmailRow = await db.queryRow<{ email: string }>`
        SELECT u.email FROM workers w JOIN users u ON u.user_id = w.user_id
        WHERE w.worker_id = ${req.workerId}
      `;

      await writeLifecycleEvent({
        eventType: "ready_to_hire_approved",
        entityType: "worker",
        entityId: req.workerId,
        idempotencyKey: deriveEventId("worker", req.workerId, "ready_to_hire_approved", new Date().toISOString().slice(0, 10)),
        payload: {
          eventType: "ready_to_hire_approved",
          occurredAt: new Date().toISOString(),
          workerId: req.workerId,
          email: workerEmailRow?.email ?? "",
          approvedByEmail: adminEmail,
          verifiedDocCount: snapshot.verifiedDocCount,
          verifiedRefCount: snapshot.verifiedRefCount,
          mandatoryDocsPresent: snapshot.mandatoryDocsPresent,
        },
        workerId: req.workerId,
      });

      const row = await db.queryRow<{ ready_to_hire_approved_at: Date }>`
        SELECT ready_to_hire_approved_at FROM workers WHERE worker_id = ${req.workerId}
      `;

      return {
        workerId: req.workerId,
        readyToHire: true,
        approvedAt: row!.ready_to_hire_approved_at,
        snapshot,
      };
    }
  );

export interface RevokeReadinessRequest {
  workerId: string;
  reason: string;
}

export interface RevokeReadinessResponse {
  workerId: string;
  readyToHire: boolean;
  revokedAt: Date;
}

export const adminRevokeReadiness =
  api<RevokeReadinessRequest, RevokeReadinessResponse>(
    {
      expose: true,
      auth: true,
      method: "POST",
      path: "/admin/workers/:workerId/revoke-readiness",
    },
    async (req) => {
      const auth = getAuthData()!;
      await assertAdminOrCompliance(auth.userID);

      if (!req.reason?.trim()) {
        throw APIError.invalidArgument("reason is required when revoking readiness");
      }

      const adminRow = await db.queryRow<{ email: string }>`
        SELECT u.email FROM users u WHERE u.user_id = ${auth.userID}
      `;
      const adminEmail = adminRow?.email ?? auth.userID;

      const workerRow = await db.queryRow<{ worker_id: string }>`
        UPDATE workers
        SET
          ready_to_hire               = FALSE,
          ready_to_hire_revoked_at    = NOW(),
          ready_to_hire_revoked_by    = ${adminEmail},
          ready_to_hire_revoke_reason = ${req.reason.trim()},
          updated_at                  = NOW()
        WHERE worker_id = ${req.workerId}
        RETURNING worker_id
      `;
      if (!workerRow) throw APIError.notFound("worker not found");

      const snapshot = await computeReadinessEligibility(req.workerId);

      await db.exec`
        INSERT INTO ready_to_hire_audit
          (worker_id, action, acted_by_user_id, acted_by_email, reason,
           eligible_doc_count, verified_doc_count, verified_ref_count,
           mandatory_doc_types, eligibility_snapshot)
        VALUES
          (${req.workerId}, 'revoked', ${auth.userID}, ${adminEmail}, ${req.reason.trim()},
           ${snapshot.eligibleDocCount}, ${snapshot.verifiedDocCount},
           ${snapshot.verifiedRefCount},
           ${JSON.stringify(snapshot.mandatoryDocsPresent)},
           ${JSON.stringify(snapshot)}::jsonb)
      `;

      await writeAuditLog(
        auth.userID,
        adminEmail,
        "REVOKE_READINESS",
        "worker",
        req.workerId,
        { reason: req.reason.trim() }
      );

      const revokeWorkerEmailRow = await db.queryRow<{ email: string }>`
        SELECT u.email FROM workers w JOIN users u ON u.user_id = w.user_id
        WHERE w.worker_id = ${req.workerId}
      `;

      await writeLifecycleEvent({
        eventType: "ready_to_hire_revoked",
        entityType: "worker",
        entityId: req.workerId,
        idempotencyKey: deriveEventId("worker", req.workerId, "ready_to_hire_revoked", new Date().toISOString().slice(0, 16)),
        payload: {
          eventType: "ready_to_hire_revoked",
          occurredAt: new Date().toISOString(),
          workerId: req.workerId,
          email: revokeWorkerEmailRow?.email ?? "",
          revokedByEmail: adminEmail,
          reason: req.reason.trim(),
        },
        workerId: req.workerId,
      });

      const row = await db.queryRow<{ ready_to_hire_revoked_at: Date }>`
        SELECT ready_to_hire_revoked_at FROM workers WHERE worker_id = ${req.workerId}
      `;

      return {
        workerId: req.workerId,
        readyToHire: false,
        revokedAt: row!.ready_to_hire_revoked_at,
      };
    }
  );

export interface ListReadinessAuditRequest {
  workerId: string;
}

export interface ReadinessAuditEntry {
  id: string;
  action: string;
  actedByEmail: string | null;
  reason: string | null;
  eligibleDocCount: number;
  verifiedDocCount: number;
  verifiedRefCount: number;
  mandatoryDocTypes: string[];
  createdAt: Date;
}

export interface ListReadinessAuditResponse {
  entries: ReadinessAuditEntry[];
}

export const adminListReadinessAudit =
  api<ListReadinessAuditRequest, ListReadinessAuditResponse>(
    {
      expose: true,
      auth: true,
      method: "GET",
      path: "/admin/workers/:workerId/readiness-audit",
    },
    async (req) => {
      const auth = getAuthData()!;
      await assertAdminOrCompliance(auth.userID);

      const rows = await db.queryAll<{
        id: string;
        action: string;
        acted_by_email: string | null;
        reason: string | null;
        eligible_doc_count: number;
        verified_doc_count: number;
        verified_ref_count: number;
        mandatory_doc_types: string[];
        created_at: Date;
      }>`
        SELECT id, action, acted_by_email, reason,
               eligible_doc_count, verified_doc_count, verified_ref_count,
               mandatory_doc_types, created_at
        FROM ready_to_hire_audit
        WHERE worker_id = ${req.workerId}
        ORDER BY created_at DESC
      `;

      return {
        entries: rows.map((r) => ({
          id: r.id,
          action: r.action,
          actedByEmail: r.acted_by_email,
          reason: r.reason,
          eligibleDocCount: r.eligible_doc_count,
          verifiedDocCount: r.verified_doc_count,
          verifiedRefCount: r.verified_ref_count,
          mandatoryDocTypes: r.mandatory_doc_types,
          createdAt: r.created_at,
        })),
      };
    }
  );
