import { api } from "encore.dev/api";
import db from "../db";

export interface TrackRtoReferralRequest {
  referralCode: string;
  sourceUrl?: string;
}

export interface TrackRtoReferralResponse {
  referralId: string;
  rtoPartnerId: string;
  rtoName: string;
  slug: string;
}

export const trackRtoReferral = api<TrackRtoReferralRequest, TrackRtoReferralResponse>(
  { expose: true, method: "POST", path: "/rto/referrals/track" },
  async (req) => {
    const partner = await db.queryRow<{ rto_partner_id: string; name: string; slug: string }>`
      SELECT rto_partner_id, name, slug
      FROM rto_partners
      WHERE referral_code = ${req.referralCode} AND status = 'active'
    `;

    if (!partner) {
      const fallback = { referralId: "", rtoPartnerId: "", rtoName: "", slug: "" };
      return fallback;
    }

    const row = await db.queryRow<{ referral_id: string }>`
      INSERT INTO rto_referrals (rto_partner_id, referral_code, source_url)
      VALUES (${partner.rto_partner_id}, ${req.referralCode}, ${req.sourceUrl ?? null})
      RETURNING referral_id
    `;

    return {
      referralId: row?.referral_id ?? "",
      rtoPartnerId: partner.rto_partner_id,
      rtoName: partner.name,
      slug: partner.slug,
    };
  }
);

export interface LinkRtoReferralRequest {
  referralCode: string;
  userId: string;
  workerId?: string;
}

export interface LinkRtoReferralResponse {
  ok: boolean;
}

export const linkRtoReferral = api<LinkRtoReferralRequest, LinkRtoReferralResponse>(
  { expose: true, method: "POST", path: "/rto/referrals/link" },
  async (req) => {
    await db.exec`
      UPDATE rto_referrals
      SET user_id = ${req.userId},
          worker_id = ${req.workerId ?? null}
      WHERE referral_id = (
        SELECT referral_id FROM rto_referrals
        WHERE referral_code = ${req.referralCode}
          AND user_id IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      )
    `;
    return { ok: true };
  }
);
