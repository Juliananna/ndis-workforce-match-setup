import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertAdmin } from "./guard";

export interface AdminEmployerSummary {
  employerId: string;
  userId: string;
  organisationName: string;
  contactPerson: string;
  email: string;
  phone: string;
  abn: string;
  location: string | null;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  subscriptionPeriodEnd: Date | null;
  activeJobCount: number;
  totalJobCount: number;
  isVerified: boolean;
  createdAt: Date;
  profileCompletionPct: number;
  profileCompletionItems: {
    location: boolean;
    servicesProvided: boolean;
    serviceAreas: boolean;
    organisationSize: boolean;
    logo: boolean;
    jobPosted: boolean;
  };
}

export interface ListEmployersResponse {
  employers: AdminEmployerSummary[];
}

export const adminListEmployers = api<void, ListEmployersResponse>(
  { expose: true, auth: true, method: "GET", path: "/admin/employers" },
  async () => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const rows = await db.queryAll<{
      employer_id: string;
      user_id: string;
      organisation_name: string;
      contact_person: string;
      email: string;
      phone: string;
      abn: string;
      location: string | null;
      subscription_status: string;
      subscription_plan: string | null;
      subscription_period_end: Date | null;
      active_jobs: number;
      total_jobs: number;
      is_verified: boolean;
      created_at: Date;
      has_location: boolean;
      has_services: boolean;
      has_service_areas: boolean;
      has_org_size: boolean;
      has_logo: boolean;
    }>`
      SELECT
        e.employer_id,
        e.user_id,
        e.organisation_name,
        e.contact_person,
        u.email,
        e.phone,
        e.abn,
        e.location,
        e.subscription_status,
        e.subscription_plan,
        e.subscription_period_end,
        COUNT(j.job_id) FILTER (WHERE j.status = 'Open')::int AS active_jobs,
        COUNT(j.job_id)::int AS total_jobs,
        u.is_verified,
        u.created_at,
        (e.location IS NOT NULL AND e.location <> '') AS has_location,
        (array_length(e.services_provided, 1) > 0) AS has_services,
        (array_length(e.service_areas, 1) > 0) AS has_service_areas,
        (e.organisation_size IS NOT NULL AND e.organisation_size <> '') AS has_org_size,
        (e.logo_url IS NOT NULL AND e.logo_url <> '') AS has_logo
      FROM employers e
      JOIN users u ON u.user_id = e.user_id
      LEFT JOIN job_requests j ON j.employer_id = e.employer_id
      GROUP BY e.employer_id, e.user_id, e.organisation_name, e.contact_person,
               u.email, e.phone, e.abn, e.location, e.subscription_status,
               e.subscription_plan, e.subscription_period_end, u.is_verified, u.created_at,
               e.services_provided, e.service_areas, e.organisation_size, e.logo_url
      ORDER BY u.created_at DESC
    `;

    return {
      employers: rows.map((r) => {
        const items = {
          location: r.has_location,
          servicesProvided: r.has_services,
          serviceAreas: r.has_service_areas,
          organisationSize: r.has_org_size,
          logo: r.has_logo,
          jobPosted: r.total_jobs > 0,
        };
        const completed = Object.values(items).filter(Boolean).length;
        const total = Object.keys(items).length;
        return {
          employerId: r.employer_id,
          userId: r.user_id,
          organisationName: r.organisation_name,
          contactPerson: r.contact_person,
          email: r.email,
          phone: r.phone,
          abn: r.abn,
          location: r.location,
          subscriptionStatus: r.subscription_status,
          subscriptionPlan: r.subscription_plan,
          subscriptionPeriodEnd: r.subscription_period_end,
          activeJobCount: r.active_jobs,
          totalJobCount: r.total_jobs,
          isVerified: r.is_verified,
          createdAt: r.created_at,
          profileCompletionPct: Math.round((completed / total) * 100),
          profileCompletionItems: items,
        };
      }),
    };
  }
);

export interface AdminGrantSubscriptionRequest {
  employerId: string;
  plan: "monthly" | "biannual" | "annual";
  durationDays: number;
  notes?: string;
}

export interface AdminGrantSubscriptionResponse {
  employerId: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  subscriptionPeriodEnd: Date;
}

export const adminGrantSubscription = api<AdminGrantSubscriptionRequest, AdminGrantSubscriptionResponse>(
  { expose: true, auth: true, method: "POST", path: "/admin/employers/:employerId/grant-subscription" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE employer_id = ${req.employerId}
    `;
    if (!employer) throw APIError.notFound("employer not found");

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + req.durationDays);

    await db.exec`
      INSERT INTO employer_subscriptions (employer_id, plan, stripe_session_id, amount_aud_cents, status, current_period_start, current_period_end, paid_at)
      VALUES (${req.employerId}, ${req.plan}, ${"admin-grant-" + Date.now()}, 0, 'active', NOW(), ${periodEnd}, NOW())
    `;

    await db.exec`
      UPDATE employers
      SET subscription_status = 'active', subscription_plan = ${req.plan}, subscription_period_end = ${periodEnd}
      WHERE employer_id = ${req.employerId}
    `;

    return {
      employerId: req.employerId,
      subscriptionStatus: "active",
      subscriptionPlan: req.plan,
      subscriptionPeriodEnd: periodEnd,
    };
  }
);

export interface AdminRevokeSubscriptionRequest {
  employerId: string;
}

export const adminRevokeSubscription = api<AdminRevokeSubscriptionRequest, void>(
  { expose: true, auth: true, method: "POST", path: "/admin/employers/:employerId/revoke-subscription" },
  async (req) => {
    const auth = getAuthData()!;
    await assertAdmin(auth.userID);

    await db.exec`
      UPDATE employers
      SET subscription_status = 'cancelled', subscription_plan = NULL, subscription_period_end = NULL
      WHERE employer_id = ${req.employerId}
    `;

    await db.exec`
      UPDATE employer_subscriptions
      SET status = 'cancelled'
      WHERE employer_id = ${req.employerId} AND status = 'active'
    `;
  }
);
