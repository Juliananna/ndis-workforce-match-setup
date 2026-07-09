import { api, APIError } from "encore.dev/api";
import db from "../db";
import { rowToSession } from "./session_helpers";
import { convertSessionToProfile } from "./convert_helpers";
import { upsertContact } from "../ghl/client";
import type { ResumeSession } from "./types";

interface EmailCaptureRequest {
  id: string;
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
}

export const emailCapture = api<EmailCaptureRequest, EmailCaptureResponse>(
  { expose: true, method: "POST", path: "/resume-sessions/:id/email-capture" },
  async (req) => {
    const existing = await db.queryRow`SELECT id FROM resume_sessions WHERE id = ${req.id}`;
    if (!existing) throw APIError.notFound("session not found");

    if (!req.email || !req.email.includes("@")) {
      throw APIError.invalidArgument("a valid email address is required");
    }

    await db.exec`
      UPDATE resume_sessions
      SET email = ${req.email}, status = 'email_captured', updated_at = NOW()
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

    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${req.id}`;
    const session = rowToSession(row!);

    let profileCreated = false;
    let workerId: string | null = null;

    if (req.consentProfileCreation) {
      try {
        const result = await convertSessionToProfile(req.id, session);
        profileCreated = !result.alreadyExists;
        workerId = result.workerId;
      } catch (err) {
        console.error("[email_capture] profile conversion failed for session", req.id, err);
      }
    }

    try {
      const nameParts = req.email.split("@")[0].split(/[.\-_]/);
      const firstName = nameParts[0] ?? req.email;
      const tags = ["resume-lead", "worker"];
      if (profileCreated || (req.consentProfileCreation && workerId)) {
        tags.push("resume-converted");
      } else {
        tags.push("profile-not-created");
      }
      const resumeUrl = `https://kizazihire.com.au/resume-builder/preview/${req.id}`;
      await upsertContact({
        email: req.email,
        firstName,
        tags,
        source: "resume-builder",
        website: resumeUrl,
      });
    } catch {
    }

    if (profileCreated || workerId) {
      const updatedRow = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${req.id}`;
      return { session: rowToSession(updatedRow!), profileCreated, workerId };
    }

    return { session, profileCreated, workerId };
  }
);
