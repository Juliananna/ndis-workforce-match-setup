import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { randomUUID } from "crypto";
import db from "../db";
import { assertAdminOrCompliance } from "./guard";
import type { RtoPartner } from "../rto/types";

export interface CreateRtoPartnerRequest {
  name: string;
  slug: string;
  contactName: string;
  contactEmail: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
}

export const adminCreateRtoPartner = api<CreateRtoPartnerRequest, RtoPartner>(
  { expose: true, auth: true, method: "POST", path: "/admin/rto-partners" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    if (!req.name?.trim()) throw APIError.invalidArgument("name is required");
    if (!req.slug?.trim()) throw APIError.invalidArgument("slug is required");
    if (!/^[a-z0-9-]+$/.test(req.slug)) throw APIError.invalidArgument("slug must be lowercase letters, numbers and hyphens only");
    if (!req.contactName?.trim()) throw APIError.invalidArgument("contactName is required");
    if (!req.contactEmail?.trim()) throw APIError.invalidArgument("contactEmail is required");

    const referralCode = req.slug.toUpperCase().replace(/-/g, "") + randomUUID().split("-")[0]!.toUpperCase();

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
      INSERT INTO rto_partners (name, slug, contact_name, contact_email, phone, website, logo_url, referral_code)
      VALUES (${req.name.trim()}, ${req.slug.trim()}, ${req.contactName.trim()}, ${req.contactEmail.trim()},
              ${req.phone ?? null}, ${req.website ?? null}, ${req.logoUrl ?? null}, ${referralCode})
      RETURNING rto_partner_id, name, slug, contact_name, contact_email, phone, website, logo_url,
                referral_code, status, created_at, updated_at
    `;

    if (!row) throw APIError.internal("failed to create RTO partner");

    return mapRow(row);
  }
);

export interface UpdateRtoPartnerRequest {
  rtoPartnerId: string;
  name?: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  status?: "active" | "inactive";
}

export const adminUpdateRtoPartner = api<UpdateRtoPartnerRequest, RtoPartner>(
  { expose: true, auth: true, method: "PUT", path: "/admin/rto-partners/:rtoPartnerId" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

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
      UPDATE rto_partners SET
        name          = COALESCE(${req.name ?? null}, name),
        contact_name  = COALESCE(${req.contactName ?? null}, contact_name),
        contact_email = COALESCE(${req.contactEmail ?? null}, contact_email),
        phone         = COALESCE(${req.phone ?? null}, phone),
        website       = COALESCE(${req.website ?? null}, website),
        logo_url      = COALESCE(${req.logoUrl ?? null}, logo_url),
        status        = COALESCE(${req.status ?? null}, status),
        updated_at    = NOW()
      WHERE rto_partner_id = ${req.rtoPartnerId}
      RETURNING rto_partner_id, name, slug, contact_name, contact_email, phone, website, logo_url,
                referral_code, status, created_at, updated_at
    `;

    if (!row) throw APIError.notFound("RTO partner not found");

    return mapRow(row);
  }
);

export interface ListRtoPartnersResponse {
  partners: RtoPartner[];
}

export const adminListRtoPartners = api<void, ListRtoPartnersResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/rto-partners" },
  async () => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const rows = await db.queryAll<{
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
      SELECT rto_partner_id, name, slug, contact_name, contact_email, phone, website, logo_url,
             referral_code, status, created_at, updated_at
      FROM rto_partners
      ORDER BY created_at DESC
    `;

    return { partners: rows.map(mapRow) };
  }
);

export interface RtoPartnerStats {
  rtoPartnerId: string;
  rtoName: string;
  slug: string;
  referralCode: string;
  status: "active" | "inactive";
  totalReferrals: number;
  profilesStarted: number;
  profilesActivated: number;
  complianceUploaded: number;
  referenceChecksRequested: number;
  placementRequiredCount: number;
  wantsPaidWorkCount: number;
}

export interface ListRtoPartnerStatsResponse {
  stats: RtoPartnerStats[];
}

export const adminListRtoPartnerStats = api<void, ListRtoPartnerStatsResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/rto-partners/stats" },
  async () => {
    const auth = getAuthData()!;
    await assertAdminOrCompliance(auth.userID);

    const rows = await db.queryAll<{
      rto_partner_id: string;
      name: string;
      slug: string;
      referral_code: string;
      status: string;
      total_referrals: number;
      profiles_started: number;
      profiles_activated: number;
      compliance_uploaded: number;
      reference_checks_requested: number;
      placement_required_count: number;
      wants_paid_work_count: number;
    }>`
      SELECT
        p.rto_partner_id,
        p.name,
        p.slug,
        p.referral_code,
        p.status,
        COUNT(DISTINCT r.referral_id)::int                                                            AS total_referrals,
        COUNT(DISTINCT r.worker_id)::int                                                              AS profiles_started,
        COUNT(DISTINCT CASE WHEN wd.id IS NOT NULL THEN r.worker_id END)::int                         AS profiles_activated,
        COUNT(DISTINCT wd.id)::int                                                                    AS compliance_uploaded,
        COUNT(DISTINCT wref.id)::int                                                                  AS reference_checks_requested,
        COUNT(DISTINCT CASE WHEN sp.placement_required THEN sp.worker_id END)::int                   AS placement_required_count,
        COUNT(DISTINCT CASE WHEN sp.wants_paid_work THEN sp.worker_id END)::int                      AS wants_paid_work_count
      FROM rto_partners p
      LEFT JOIN rto_referrals r ON r.rto_partner_id = p.rto_partner_id
      LEFT JOIN worker_documents wd ON wd.worker_id = r.worker_id
      LEFT JOIN worker_references wref ON wref.worker_id = r.worker_id
      LEFT JOIN worker_student_profiles sp ON sp.worker_id = r.worker_id
      GROUP BY p.rto_partner_id, p.name, p.slug, p.referral_code, p.status
      ORDER BY total_referrals DESC, p.created_at DESC
    `;

    return {
      stats: rows.map((r) => ({
        rtoPartnerId: r.rto_partner_id,
        rtoName: r.name,
        slug: r.slug,
        referralCode: r.referral_code,
        status: r.status as "active" | "inactive",
        totalReferrals: r.total_referrals,
        profilesStarted: r.profiles_started,
        profilesActivated: r.profiles_activated,
        complianceUploaded: r.compliance_uploaded,
        referenceChecksRequested: r.reference_checks_requested,
        placementRequiredCount: r.placement_required_count,
        wantsPaidWorkCount: r.wants_paid_work_count,
      })),
    };
  }
);

function mapRow(row: {
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
}): RtoPartner {
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
