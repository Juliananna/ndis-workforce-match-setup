import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { rowToSession } from "./session_helpers";
import { verifySessionToken } from "./session_token";
import { convertSessionToProfile } from "./convert_helpers";
import { migrateResumeDocs, migrateResumePhoto, transferMarketingConsent, syncResumeLeadToGHL } from "./convert_helpers";
import { syncOnboardingStatus } from "../workers/compliance_status";
import { writeLifecycleEvent, deriveEventId } from "../lifecycle/writer";

interface ConvertToProfileRequest {
  id: string;
  sessionToken?: string;
}

interface ConvertToProfileResponse {
  workerId: string;
  userId: string;
  message: string;
  alreadyExists: boolean;
  pendingLink: boolean;
}

export const convertToProfile = api<ConvertToProfileRequest, ConvertToProfileResponse>(
  { expose: true, method: "POST", path: "/resume-sessions/:id/convert-to-profile" },
  async (req) => {
    await verifySessionToken(req.id, req.sessionToken);

    const row = await db.queryRow<{
      status: string;
      email: string | null;
      converted_worker_id: string | null;
      pending_link_worker_id: string | null;
    }>`
      SELECT status, email, converted_worker_id, pending_link_worker_id
      FROM resume_sessions WHERE id = ${req.id}
    `;
    if (!row) throw APIError.notFound("session not found");

    if (!row.email) {
      throw APIError.failedPrecondition("email must be captured before converting to a profile");
    }

    if (row.converted_worker_id) {
      const userRow = await db.queryRow<{ user_id: string }>`
        SELECT user_id FROM workers WHERE worker_id = ${row.converted_worker_id}
      `;
      return {
        workerId: row.converted_worker_id,
        userId: userRow?.user_id ?? "",
        message: "Already converted",
        alreadyExists: true,
        pendingLink: false,
      };
    }

    if (row.pending_link_worker_id) {
      return {
        workerId: row.pending_link_worker_id,
        userId: "",
        message: "An account with this email already exists. Please log in to link your resume to your profile.",
        alreadyExists: true,
        pendingLink: true,
      };
    }

    const sessionRow = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${req.id}`;
    const session = rowToSession(sessionRow!);

    const result = await convertSessionToProfile(req.id, session);

    return {
      workerId: result.workerId,
      userId: result.userId,
      message: result.alreadyExists
        ? "An account with this email already exists. Please log in to link your resume to your profile."
        : "KizaziHire worker profile created successfully",
      alreadyExists: result.alreadyExists,
      pendingLink: result.alreadyExists,
    };
  }
);

interface ConfirmAccountLinkResponse {
  workerId: string;
  message: string;
}

export const confirmAccountLink = api<void, ConfirmAccountLinkResponse>(
  { expose: true, auth: true, method: "POST", path: "/resume-sessions/confirm-link" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can confirm an account link");
    }

    const worker = await db.queryRow<{ worker_id: string; user_id: string }>`
      SELECT worker_id, user_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const session = await db.queryRow<{
      id: string;
      email: string | null;
      converted_worker_id: string | null;
    }>`
      SELECT id, email, converted_worker_id
      FROM resume_sessions
      WHERE pending_link_worker_id = ${worker.worker_id}
        AND converted_worker_id IS NULL
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    if (!session) {
      throw APIError.notFound("no pending resume link found for this account");
    }

    if (session.converted_worker_id) {
      return { workerId: session.converted_worker_id, message: "Already linked" };
    }

    const fullSessionRow = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${session.id}`;
    const fullSession = rowToSession(fullSessionRow!);

    await db.exec`
      UPDATE resume_sessions
      SET converted_worker_id = ${worker.worker_id},
          pending_link_worker_id = NULL,
          status = 'converted',
          updated_at = NOW()
      WHERE id = ${session.id}
    `;

    await db.exec`
      UPDATE workers SET resume_session_id = ${session.id}, updated_at = NOW()
      WHERE worker_id = ${worker.worker_id}
    `;

    await migrateResumeDocs(session.id, worker.worker_id);
    await migrateResumePhoto(session.id, worker.worker_id);
    await transferMarketingConsent(session.id, worker.worker_id);
    await syncOnboardingStatus(worker.worker_id);

    const fullName = [fullSession.firstName, fullSession.lastName].filter(Boolean).join(" ");
    const name = fullSession.firstName ?? (fullSession.email?.split("@")[0] ?? "");
    await syncResumeLeadToGHL(fullSession.email!, fullName || name, session.id, worker.worker_id);

    await writeLifecycleEvent({
      eventType: "worker_profile_linked",
      entityType: "worker",
      entityId: worker.worker_id,
      idempotencyKey: deriveEventId("resume_session", session.id, "worker_profile_linked"),
      payload: {
        eventType: "worker_profile_linked",
        occurredAt: new Date().toISOString(),
        workerId: worker.worker_id,
        userId: auth.userID,
        sessionId: session.id,
        email: fullSession.email!,
      },
      workerId: worker.worker_id,
      sessionId: session.id,
      userId: auth.userID,
    });

    return { workerId: worker.worker_id, message: "Resume linked to your KizaziHire profile" };
  }
);
