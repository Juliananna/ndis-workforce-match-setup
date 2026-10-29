import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertSysAdmin } from "../admin/guard";

export interface UniquePersonSummary {
  email: string;
  hasWorkerAccount: boolean;
  workerId: string | null;
  isEmailVerified: boolean;
  hasResumeSession: boolean;
  resumeSessionId: string | null;
  resumeSessionStatus: string | null;
  resumeConverted: boolean;
  ghlContactIdWorker: string | null;
  ghlContactIdSession: string | null;
  ghlLastSyncedAt: Date | null;
  ghlSyncFailed: boolean;
  ghlSyncErrorSnippet: string | null;
  lastSyncAttemptAt: Date | null;
  lastSyncAttemptSuccess: boolean | null;
  readyToHire: boolean;
  notes: string[];
}

export interface ReconciliationReport {
  generatedAt: Date;

  totalUniquePeople: number;
  totalWithWorkerAccount: number;
  totalWithResumeOnly: number;
  totalConverted: number;
  totalNeverSynced: number;
  totalSyncFailed: number;
  totalReadyToHire: number;

  people: UniquePersonSummary[];

  syncLog: {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    recentFailures: {
      email: string;
      entityType: string;
      entityId: string;
      operation: string;
      errorMessage: string | null;
      attemptedAt: Date;
    }[];
  };
}

export const adminGhlReconciliationReport = api<void, ReconciliationReport>(
  {
    expose: true,
    auth: true,
    method: "GET",
    path: "/admin/ghl/reconciliation-report",
  },
  async () => {
    const auth = getAuthData()!;
    await assertSysAdmin(auth.userID);

    const [workerRows, resumeOnlyRows, syncLogRow, recentFailureRows] =
      await Promise.all([
        db.queryAll<{
          email: string;
          worker_id: string;
          is_verified: boolean;
          has_resume_session: boolean;
          resume_session_id: string | null;
          resume_session_status: string | null;
          resume_converted: boolean;
          ghl_contact_id_worker: string | null;
          ghl_contact_id_session: string | null;
          ghl_last_synced_at: Date | null;
          ghl_sync_failed_at: Date | null;
          ghl_sync_error: string | null;
          ready_to_hire: boolean;
        }>`
          SELECT
            u.email,
            w.worker_id,
            u.is_verified,
            (rs.id IS NOT NULL)                              AS has_resume_session,
            rs.id                                            AS resume_session_id,
            rs.status                                        AS resume_session_status,
            (rs.converted_worker_id IS NOT NULL)             AS resume_converted,
            w.ghl_contact_id                                 AS ghl_contact_id_worker,
            rs.ghl_contact_id                                AS ghl_contact_id_session,
            GREATEST(w.ghl_last_synced_at, rs.ghl_last_synced_at) AS ghl_last_synced_at,
            w.ghl_sync_failed_at,
            w.ghl_sync_error,
            w.ready_to_hire
          FROM workers w
          JOIN users u ON u.user_id = w.user_id
          LEFT JOIN resume_sessions rs ON rs.converted_worker_id = w.worker_id
          WHERE u.is_demo = FALSE
          ORDER BY u.email ASC
        `,

        db.queryAll<{
          email: string;
          resume_session_id: string;
          resume_session_status: string;
          ghl_contact_id_session: string | null;
          ghl_last_synced_at: Date | null;
        }>`
          SELECT
            rs.email,
            rs.id                AS resume_session_id,
            rs.status            AS resume_session_status,
            rs.ghl_contact_id    AS ghl_contact_id_session,
            rs.ghl_last_synced_at
          FROM resume_sessions rs
          WHERE rs.email IS NOT NULL
            AND rs.converted_worker_id IS NULL
            AND rs.status NOT IN ('draft', 'archived')
          ORDER BY rs.email ASC
        `,

        db.queryRow<{
          total_attempts: number;
          successful_attempts: number;
          failed_attempts: number;
        }>`
          SELECT
            COUNT(*)::int                                      AS total_attempts,
            COUNT(*) FILTER (WHERE success = TRUE)::int        AS successful_attempts,
            COUNT(*) FILTER (WHERE success = FALSE)::int       AS failed_attempts
          FROM ghl_sync_log
        `,

        db.queryAll<{
          email: string;
          entity_type: string;
          entity_id: string;
          operation: string;
          error_message: string | null;
          attempted_at: Date;
        }>`
          SELECT email, entity_type, entity_id, operation, error_message, attempted_at
          FROM ghl_sync_log
          WHERE success = FALSE
          ORDER BY attempted_at DESC
          LIMIT 50
        `,
      ]);

    const seen = new Set<string>();
    const people: UniquePersonSummary[] = [];

    for (const r of workerRows) {
      if (seen.has(r.email)) continue;
      seen.add(r.email);

      const notes: string[] = [];
      if (!r.ghl_contact_id_worker && !r.ghl_contact_id_session) {
        notes.push("never synced to GHL");
      }
      if (r.ghl_sync_failed_at) {
        notes.push("last GHL sync attempt failed");
      }

      people.push({
        email: r.email,
        hasWorkerAccount: true,
        workerId: r.worker_id,
        isEmailVerified: r.is_verified,
        hasResumeSession: r.has_resume_session,
        resumeSessionId: r.resume_session_id,
        resumeSessionStatus: r.resume_session_status,
        resumeConverted: r.resume_converted,
        ghlContactIdWorker: r.ghl_contact_id_worker,
        ghlContactIdSession: r.ghl_contact_id_session,
        ghlLastSyncedAt: r.ghl_last_synced_at,
        ghlSyncFailed: !!r.ghl_sync_failed_at,
        ghlSyncErrorSnippet: r.ghl_sync_error?.slice(0, 200) ?? null,
        lastSyncAttemptAt: null,
        lastSyncAttemptSuccess: null,
        readyToHire: r.ready_to_hire,
        notes,
      });
    }

    for (const r of resumeOnlyRows) {
      if (seen.has(r.email)) continue;
      seen.add(r.email);

      const notes: string[] = ["resume lead — no worker account"];
      if (!r.ghl_contact_id_session) {
        notes.push("never synced to GHL");
      }

      people.push({
        email: r.email,
        hasWorkerAccount: false,
        workerId: null,
        isEmailVerified: false,
        hasResumeSession: true,
        resumeSessionId: r.resume_session_id,
        resumeSessionStatus: r.resume_session_status,
        resumeConverted: false,
        ghlContactIdWorker: null,
        ghlContactIdSession: r.ghl_contact_id_session,
        ghlLastSyncedAt: r.ghl_last_synced_at,
        ghlSyncFailed: false,
        ghlSyncErrorSnippet: null,
        lastSyncAttemptAt: null,
        lastSyncAttemptSuccess: null,
        readyToHire: false,
        notes,
      });
    }

    const totalUniquePeople = people.length;
    const totalWithWorkerAccount = people.filter((p) => p.hasWorkerAccount).length;
    const totalWithResumeOnly = people.filter(
      (p) => !p.hasWorkerAccount && p.hasResumeSession
    ).length;
    const totalConverted = people.filter((p) => p.resumeConverted).length;
    const totalNeverSynced = people.filter(
      (p) => !p.ghlContactIdWorker && !p.ghlContactIdSession
    ).length;
    const totalSyncFailed = people.filter((p) => p.ghlSyncFailed).length;
    const totalReadyToHire = people.filter((p) => p.readyToHire).length;

    return {
      generatedAt: new Date(),
      totalUniquePeople,
      totalWithWorkerAccount,
      totalWithResumeOnly,
      totalConverted,
      totalNeverSynced,
      totalSyncFailed,
      totalReadyToHire,
      people,
      syncLog: {
        totalAttempts: syncLogRow?.total_attempts ?? 0,
        successfulAttempts: syncLogRow?.successful_attempts ?? 0,
        failedAttempts: syncLogRow?.failed_attempts ?? 0,
        recentFailures: recentFailureRows.map((r) => ({
          email: r.email,
          entityType: r.entity_type,
          entityId: r.entity_id,
          operation: r.operation,
          errorMessage: r.error_message,
          attemptedAt: r.attempted_at,
        })),
      },
    };
  }
);
