import { api } from "encore.dev/api";
import db from "../db";
import type { ResumeSession } from "./types";
import { rowToSession } from "./session_helpers";
import { generateSessionToken, hashToken } from "./session_token";

export interface AttributionParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  metaCampaignId?: string;
  metaAdsetId?: string;
  metaAdId?: string;
  metaLeadId?: string;
  fbclid?: string;
  landingPage?: string;
}

interface CreateSessionRequest {
  firstName?: string;
  lastName?: string;
  targetRole?: string;
  attribution?: AttributionParams;
}

interface CreateSessionResponse {
  session: ResumeSession;
  sessionToken: string;
}

export const createSession = api<CreateSessionRequest, CreateSessionResponse>(
  { expose: true, method: "POST", path: "/resume-sessions" },
  async (req) => {
    const a = req.attribution ?? {};
    const token = generateSessionToken();
    const tokenHash = hashToken(token);

    const row = await db.queryRow<{ id: string }>`
      INSERT INTO resume_sessions (
        first_name, last_name, target_role,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        meta_campaign_id, meta_adset_id, meta_ad_id, meta_lead_id,
        fbclid, landing_page, session_token_hash
      )
      VALUES (
        ${req.firstName ?? null}, ${req.lastName ?? null}, ${req.targetRole ?? null},
        ${a.utmSource ?? null}, ${a.utmMedium ?? null}, ${a.utmCampaign ?? null},
        ${a.utmContent ?? null}, ${a.utmTerm ?? null},
        ${a.metaCampaignId ?? null}, ${a.metaAdsetId ?? null}, ${a.metaAdId ?? null},
        ${a.metaLeadId ?? null}, ${a.fbclid ?? null}, ${a.landingPage ?? null},
        ${tokenHash}
      )
      RETURNING id
    `;

    const session = await db.queryRow`
      SELECT * FROM resume_sessions WHERE id = ${row!.id}
    `;

    await db.exec`
      INSERT INTO resume_audit_log (session_id, event_type, event_data)
      VALUES (${row!.id}, 'session_created', ${JSON.stringify({
        hasAttribution: !!(a.utmSource || a.fbclid || a.metaCampaignId),
        utmSource: a.utmSource ?? null,
      })}::jsonb)
    `;

    return { session: rowToSession(session!), sessionToken: token };
  }
);
