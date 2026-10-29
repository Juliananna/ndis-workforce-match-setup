import { api, APIError } from "encore.dev/api";
import db from "../db";
import { rowToSession } from "./session_helpers";
import { verifySessionToken } from "./session_token";
import { convertSessionToProfile } from "./convert_helpers";
import { upsertContact, writeSyncLog } from "../ghl/client";
import { writeLifecycleEvent, deriveEventId } from "../lifecycle/writer";
import type { ResumeSession } from "./types";

interface EmailCaptureRequest {
  id: string;
  sessionToken?: string;
  email: string;
  consentResumeGeneration: boolean;
  consentProfileCreation: boolean;
  consentProviderVisibility: boolean;
  consentMarketingEmails: boolean;
  ipAddress?: string;
  userAgent?: string;
}

interface EmailCaptureResponse {
  session: ResumeSession;
  profileCreated: boolean;
  workerId: string | null;
  profileError: string | null;
}

export const emailCapture = api<EmailCaptureRequest, EmailCaptureResponse>(
  { expose: true, method: "POST", path: "/resume-sessions/:id/email-capture" },
  async (req) => {
    await verifySessionToken(req.id, req.sessionToken);

    const existing = await db.queryRow<{ id: string; status: string; converted_worker_id: string | null }>`
      SELECT id, status, converted_worker_id FROM resume_sessions WHERE id = ${req.id}
    `;
    if (!existing) throw APIError.notFound("session not found");

    if (!req.email || !req.email.includes("@")) {
      throw APIError.invalidArgument("a valid email address is required");
    }

    const alreadyConverted = existing.status === "converted" && existing.converted_worker_id !== null;

    await db.exec`
      UPDATE resume_sessions
      SET email = ${req.email},
          status = CASE
            WHEN status IN ('draft') THEN 'email_captured'
            ELSE status
          END,
          updated_at = NOW()
      WHERE id = ${req.id}
    `;

    const consentTypes: { type: string; granted: boolean }[] = [
      { type: "resume_generation", granted: req.consentResumeGeneration },
      { type: "profile_creation", granted: req.consentProfileCreation },
      { type: "provider_visibility", granted: req.consentProviderVisibility },
      { type: "marketing_emails", granted: req.consentMarketingEmails },
    ];

    for (const consent of consentTypes) {
      await db.exec`
        INSERT INTO resume_session_consents (session_id, consent_type, granted, granted_at, ip_address, user_agent)
        VALUES (
          ${req.id}, ${consent.type}, ${consent.granted},
          ${consent.granted ? new Date() : null},
          ${req.ipAddress ?? null}, ${req.userAgent ?? null}
        )
        ON CONFLICT (session_id, consent_type)
        DO UPDATE SET granted = EXCLUDED.granted, granted_at = EXCLUDED.granted_at
      `;
    }

    await db.exec`
      INSERT INTO resume_audit_log (session_id, event_type, event_data)
      VALUES (${req.id}, 'email_captured', ${JSON.stringify({ email: req.email })}::jsonb)
    `;

    await writeLifecycleEvent({
      eventType: "email_captured",
      entityType: "resume_session",
      entityId: req.id,
      idempotencyKey: deriveEventId("resume_session", req.id, "email_captured"),
      payload: {
        eventType: "email_captured",
        occurredAt: new Date().toISOString(),
        sessionId: req.id,
        email: req.email,
        consentMarketingEmails: req.consentMarketingEmails,
        consentProfileCreation: req.consentProfileCreation,
        consentProviderVisibility: req.consentProviderVisibility,
        ipAddress: req.ipAddress ?? null,
        userAgent: req.userAgent ?? null,
      },
      sessionId: req.id,
    });

    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${req.id}`;
    const session = rowToSession(row!);

    let profileCreated = false;
    let workerId: string | null = existing.converted_worker_id;
    let profileError: string | null = null;

    if (alreadyConverted) {
      profileCreated = false;
    } else if (req.consentProfileCreation) {
      try {
        const result = await convertSessionToProfile(req.id, session);
        profileCreated = !result.alreadyExists;
        workerId = result.workerId;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[email_capture] profile conversion failed for session", req.id, err);
        profileError = "We saved your email but could not create your profile automatically. Please try again or contact support.";
      }
    }

    try {
      const firstName = session.firstName ?? req.email.split("@")[0].split(/[.\-_]/)[0] ?? req.email;
      const lastName = session.lastName ?? undefined;
      const fullName = [session.firstName, session.lastName].filter(Boolean).join(" ") || undefined;
      const tags = ["resume-lead", "worker"];
      if (profileCreated || (req.consentProfileCreation && workerId)) {
        tags.push("resume-converted");
      } else {
        tags.push("profile-not-created");
      }
      const resumeUrl = `https://kizazihire.com.au/resume-builder/preview/${req.id}`;
      const upsertResult = await upsertContact({
        email: req.email,
        firstName,
        lastName,
        name: fullName,
        tags,
        source: "resume-builder",
        website: resumeUrl,
      });

      if (upsertResult.contactId) {
        await db.exec`
          UPDATE resume_sessions
          SET ghl_contact_id = ${upsertResult.contactId}, ghl_last_synced_at = NOW()
          WHERE id = ${req.id}
        `;
      }

      await writeSyncLog({
        email: req.email,
        entityType: "resume_session",
        entityId: req.id,
        operation: "email_capture_upsert",
        success: true,
        ghlContactId: upsertResult.contactId,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await writeSyncLog({
        email: req.email,
        entityType: "resume_session",
        entityId: req.id,
        operation: "email_capture_upsert",
        success: false,
        errorMessage: errMsg,
      });
    }

    if (profileCreated || workerId) {
      const updatedRow = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${req.id}`;
      return { session: rowToSession(updatedRow!), profileCreated, workerId, profileError };
    }

    return { session, profileCreated, workerId, profileError };
  }
);
