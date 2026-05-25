import { api, APIError } from "encore.dev/api";
import db from "../db";
import type { RtoPartner } from "./types";

export interface GetRtoPartnerBySlugRequest {
  slug: string;
}

export const getRtoPartnerBySlug = api<GetRtoPartnerBySlugRequest, RtoPartner>(
  { expose: true, method: "GET", path: "/rto/partners/slug/:slug" },
  async (req) => {
    const row = await db.queryRow<{
      rto_partner_id: string;
      name: string;
      slug: string;
      contact_name: string;
      contact_email: string;
      phone: string | null;
      website: string | null;
      logo_url: string | null;
      referral_code: string;
      status: string;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT rto_partner_id, name, slug, contact_name, contact_email, phone,
             website, logo_url, referral_code, status, created_at, updated_at
      FROM rto_partners
      WHERE slug = ${req.slug} AND status = 'active'
    `;

    if (!row) throw APIError.notFound("RTO partner not found");

    return {
      rtoPartnerId: row.rto_partner_id,
      name: row.name,
      slug: row.slug,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      phone: row.phone,
      website: row.website,
      logoUrl: row.logo_url,
      referralCode: row.referral_code,
      status: row.status as "active" | "inactive",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);
