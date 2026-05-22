import { APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { randomUUID } from "crypto";
import db from "../db";
import { sendEmail } from "../emailer/sender";
import type { ResumeSession } from "./types";

const appBaseUrl = secret("AppBaseUrl");

export async function issueSetPasswordEmail(userId: string, email: string): Promise<void> {
  await db.exec`
    UPDATE password_reset_tokens SET used_at = NOW()
    WHERE user_id = ${userId} AND used_at IS NULL
  `;

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.exec`
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
  `;

  const baseUrl = appBaseUrl();
  const setPasswordUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&welcome=1&onboarding=compliance`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${baseUrl}/kizazi-hire-logo.png" alt="KizaziHire" style="height: 40px; width: auto;" />
      </div>
      <div style="background: linear-gradient(135deg, #0d9488, #059669); border-radius: 16px; padding: 32px; text-align: center; color: white; margin-bottom: 24px;">
        <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700;">Your resume is ready!</h1>
        <p style="margin: 0; font-size: 15px; opacity: 0.9;">One last step — upload your first compliance document to activate your KizaziHire profile and get matched with providers.</p>
      </div>

      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="color: #475569; font-size: 14px; margin: 0 0 20px;">Set your password to log in, then upload your first compliance document to activate your profile. This link is valid for 7 days.</p>
        <a href="${setPasswordUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #0d9488, #059669); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600;">
          Activate my profile &rarr;
        </a>
      </div>

      <div style="border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 24px;">
        <p style="color: #64748b; font-size: 13px; margin: 0 0 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">What happens next</p>
        <div style="display: grid; gap: 8px;">
          <div style="color: #334155; font-size: 14px;">
            <span style="color: #0d9488;">1.</span> Set your password using the button above
          </div>
          <div style="color: #334155; font-size: 14px;">
            <span style="color: #0d9488;">2.</span> Upload your first compliance document (Police Clearance, NDIS Screening, etc.)
          </div>
          <div style="color: #334155; font-size: 14px;">
            <span style="color: #0d9488;">3.</span> Your profile goes live and you start appearing in provider searches
          </div>
          <div style="color: #334155; font-size: 14px;">
            <span style="color: #0d9488;">✓</span> Your resume data pre-fills your profile — no re-entering anything
          </div>
        </div>
      </div>

      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        Your account email is: ${email}<br />
        If you didn't create this account, you can safely ignore this email.
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        KizaziHire &mdash; Connecting disability support workers with providers.
      </p>
    </div>
  `;

  try {
    await sendEmail({ to: email, subject: "Activate your KizaziHire profile — upload your first compliance document", html });
  } catch {
  }
}

const RESUME_DOC_TYPE_MAP: Record<string, string> = {
  "Police Check": "Police Clearance",
  "Working with Children Check": "Working With Children Check",
  "NDIS Worker Screening Card": "NDIS Worker Screening Check",
  "Qualification Certificate": "Certificate III / IV Disability",
  "Manual Handling Certificate": "Other relevant training",
  "Medication Administration Certificate": "Other relevant training",
  "First Aid Certificate": "First Aid Certificate",
  "CPR Certificate": "CPR Certificate",
  "Other": "Other relevant training",
};

const VALID_WORKER_DOC_TYPES = new Set([
  "Driver's Licence",
  "Passport / ID",
  "Working With Children Check",
  "Police Clearance",
  "NDIS Worker Screening Check",
  "NDIS Worker Orientation Module",
  "NDIS Code of Conduct acknowledgement",
  "Infection Control Certificate",
  "First Aid Certificate",
  "CPR Certificate",
  "Certificate III / IV Disability",
  "Nursing qualifications",
  "Other relevant training",
]);

function normaliseDocType(resumeDocType: string): string | null {
  if (VALID_WORKER_DOC_TYPES.has(resumeDocType)) return resumeDocType;
  return RESUME_DOC_TYPE_MAP[resumeDocType] ?? null;
}

function isInternalFileKey(fileUrl: string): boolean {
  if (!fileUrl || fileUrl.trim() === "") return false;
  try {
    const u = new URL(fileUrl);
    const host = u.hostname.toLowerCase();
    return (
      host.includes("amazonaws.com") ||
      host.includes("storage.googleapis.com") ||
      host.includes("blob.core.windows.net") ||
      host.includes("lp.dev")
    );
  } catch {
    return false;
  }
}

export async function convertSessionToProfile(
  sessionId: string,
  session: ResumeSession
): Promise<{ workerId: string; userId: string; alreadyExists: boolean }> {
  const existingUser = await db.queryRow<{ user_id: string }>`
    SELECT user_id FROM users WHERE email = ${session.email}
  `;

  if (existingUser) {
    const existingWorker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${existingUser.user_id}
    `;
    if (existingWorker) {
      await db.exec`
        UPDATE resume_sessions SET converted_worker_id = ${existingWorker.worker_id}, status = 'converted', updated_at = NOW()
        WHERE id = ${sessionId}
      `;
      return { workerId: existingWorker.worker_id, userId: existingUser.user_id, alreadyExists: true };
    }
  }

  const verificationToken = randomUUID();
  const fullName = [session.firstName, session.lastName].filter(Boolean).join(" ");
  const name = session.firstName ?? session.email!.split("@")[0];
  const location = [session.suburb, session.state].filter(Boolean).join(", ");

  const user = await db.queryRow<{ user_id: string }>`
    INSERT INTO users (email, password_hash, role, is_verified, verification_token)
    VALUES (${session.email}, NULL, 'WORKER', TRUE, ${verificationToken})
    RETURNING user_id
  `;

  if (!user) throw APIError.internal("failed to create user account");

  const worker = await db.queryRow<{ worker_id: string }>`
    INSERT INTO workers (
      user_id, name, phone, full_name, location,
      bio, experience_years, qualifications,
      drivers_license, vehicle_access, ndis_screening_number,
      onboarding_status
    )
    VALUES (
      ${user.user_id},
      ${name},
      ${session.phone ?? ""},
      ${fullName || name},
      ${location || null},
      ${session.aiBio ?? session.aiSummary ?? null},
      ${session.experienceYears ?? null},
      ${session.qualifications.map((q) => q.name).join(", ") || null},
      ${session.driversLicence},
      ${session.ownVehicle},
      ${session.ndisScreeningNumber ?? null},
      'compliance_required'
    )
    RETURNING worker_id
  `;

  if (!worker) throw APIError.internal("failed to create worker profile");

  for (const skill of session.supportTasks) {
    await db.exec`
      INSERT INTO worker_skills (worker_id, skill) VALUES (${worker.worker_id}, ${skill})
      ON CONFLICT DO NOTHING
    `;
  }

  if (session.availability.length > 0) {
    const days = session.availability.map((a) => a.day);
    const shifts = [...new Set(session.availability.flatMap((a) => a.shifts))];
    await db.exec`
      INSERT INTO worker_availability (worker_id, available_days, preferred_shift_types, max_travel_distance_km)
      VALUES (${worker.worker_id}, ${JSON.stringify(days)}, ${JSON.stringify(shifts)}, ${session.travelRadiusKm ?? 20})
      ON CONFLICT (worker_id) DO NOTHING
    `;
  }

  await db.exec`
    UPDATE resume_sessions
    SET converted_worker_id = ${worker.worker_id}, status = 'converted', updated_at = NOW()
    WHERE id = ${sessionId}
  `;

  await db.exec`
    INSERT INTO resume_audit_log (session_id, event_type, event_data)
    VALUES (${sessionId}, 'converted_to_profile', ${JSON.stringify({ workerId: worker.worker_id, source: 'resume_builder' })}::jsonb)
  `;

  const resumeDocs = await db.queryAll<{
    document_type: string;
    document_title: string;
    file_url: string;
    expiry_date: string | null;
  }>`
    SELECT document_type, document_title, file_url, expiry_date
    FROM resume_session_documents
    WHERE session_id = ${sessionId}
  `;

  let migratedCount = 0;
  for (const doc of resumeDocs) {
    if (!isInternalFileKey(doc.file_url)) continue;

    const canonicalType = normaliseDocType(doc.document_type);
    if (!canonicalType) continue;

    const alreadyExists = await db.queryRow<{ id: string }>`
      SELECT id FROM worker_documents
      WHERE worker_id = ${worker.worker_id}
        AND document_type = ${canonicalType}
        AND file_key = ${doc.file_url}
    `;
    if (alreadyExists) continue;

    const expiryDate = doc.expiry_date ? new Date(doc.expiry_date) : null;

    await db.exec`
      INSERT INTO worker_documents (worker_id, document_type, title, file_key, expiry_date, verification_status)
      VALUES (${worker.worker_id}, ${canonicalType}, ${doc.document_title}, ${doc.file_url}, ${expiryDate}, 'Pending')
    `;
    migratedCount++;
  }

  if (migratedCount > 0) {
    await db.exec`
      UPDATE workers SET onboarding_status = 'active' WHERE worker_id = ${worker.worker_id}
    `;
  }

  await db.exec`
    INSERT INTO resume_audit_log (session_id, event_type, event_data)
    VALUES (${sessionId}, 'worker_profile_created_from_resume', ${JSON.stringify({
      workerId: worker.worker_id,
      source: 'resume_builder',
      migratedDocuments: migratedCount,
    })}::jsonb)
  `;

  await issueSetPasswordEmail(user.user_id, session.email!);

  return { workerId: worker.worker_id, userId: user.user_id, alreadyExists: false };
}
