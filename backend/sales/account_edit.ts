import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertSalesOrAdmin } from "./guard";

export interface UpdateWorkerProfileRequest {
  userId: string;
  name?: string;
  phone?: string;
  location?: string;
  bio?: string;
  experienceYears?: number;
}

export interface UpdateEmployerProfileRequest {
  userId: string;
  organisationName?: string;
  contactPerson?: string;
  phone?: string;
  location?: string;
  email?: string;
}

export interface UpdateAccountResponse {
  ok: boolean;
}

export const salesUpdateWorker = api<UpdateWorkerProfileRequest, UpdateAccountResponse>(
  { expose: true, auth: true, method: "POST", path: "/sales/accounts/:userId/update-worker" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${req.userId}
    `;
    if (!worker) throw APIError.notFound("worker not found");

    await db.exec`
      UPDATE workers SET
        name       = COALESCE(${req.name ?? null}, name),
        phone      = COALESCE(${req.phone ?? null}, phone),
        location   = COALESCE(${req.location ?? null}, location),
        bio        = COALESCE(${req.bio ?? null}, bio),
        experience_years = COALESCE(${req.experienceYears ?? null}, experience_years),
        updated_at = NOW()
      WHERE worker_id = ${worker.worker_id}
    `;

    return { ok: true };
  }
);

export const salesUpdateEmployer = api<UpdateEmployerProfileRequest, UpdateAccountResponse>(
  { expose: true, auth: true, method: "POST", path: "/sales/accounts/:userId/update-employer" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${req.userId}
    `;
    if (!employer) throw APIError.notFound("employer not found");

    await db.exec`
      UPDATE employers SET
        organisation_name = COALESCE(${req.organisationName ?? null}, organisation_name),
        contact_person    = COALESCE(${req.contactPerson ?? null}, contact_person),
        phone             = COALESCE(${req.phone ?? null}, phone),
        location          = COALESCE(${req.location ?? null}, location),
        email             = COALESCE(${req.email ?? null}, email),
        updated_at        = NOW()
      WHERE employer_id = ${employer.employer_id}
    `;

    return { ok: true };
  }
);

export interface ForceVerifyEmailRequest {
  userId: string;
}

export const salesForceVerifyEmail = api<ForceVerifyEmailRequest, UpdateAccountResponse>(
  { expose: true, auth: true, method: "POST", path: "/sales/accounts/:userId/verify-email" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const row = await db.queryRow<{ user_id: string }>`
      UPDATE users SET is_verified = true, verification_token = null
      WHERE user_id = ${req.userId}
      RETURNING user_id
    `;
    if (!row) throw APIError.notFound("user not found");

    return { ok: true };
  }
);

export interface ManualSubscriptionRequest {
  userId: string;
  plan: "monthly" | "biannual" | "annual";
  amountAudCents: number;
  periodDays: number;
}

const PLAN_AMOUNTS: Record<string, number> = {
  monthly: 20000,
  biannual: 100000,
  annual: 180000,
};

export const salesActivateSubscription = api<ManualSubscriptionRequest, UpdateAccountResponse>(
  { expose: true, auth: true, method: "POST", path: "/sales/accounts/:userId/activate-subscription" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${req.userId}
    `;
    if (!employer) throw APIError.notFound("employer not found");

    const validPlans = ["monthly", "biannual", "annual"];
    if (!validPlans.includes(req.plan)) throw APIError.invalidArgument("invalid plan");
    if (req.periodDays <= 0) throw APIError.invalidArgument("periodDays must be positive");

    const { randomUUID } = await import("crypto");
    const manualSessionId = `manual_${randomUUID()}`;
    const periodStart = new Date();
    const periodEnd = new Date(periodStart.getTime() + req.periodDays * 86400000);
    const amount = req.amountAudCents > 0 ? req.amountAudCents : (PLAN_AMOUNTS[req.plan] ?? 20000);

    await db.exec`
      INSERT INTO employer_subscriptions
        (employer_id, plan, stripe_session_id, amount_aud_cents, status, current_period_start, current_period_end, paid_at)
      VALUES
        (${employer.employer_id}, ${req.plan}, ${manualSessionId}, ${amount},
         'active', ${periodStart}, ${periodEnd}, NOW())
    `;

    await db.exec`
      UPDATE employers SET
        subscription_status = 'active',
        subscription_plan   = ${req.plan},
        subscription_period_end = ${periodEnd}
      WHERE employer_id = ${employer.employer_id}
    `;

    return { ok: true };
  }
);

export interface CancelSubscriptionRequest {
  userId: string;
}

export const salesCancelSubscription = api<CancelSubscriptionRequest, UpdateAccountResponse>(
  { expose: true, auth: true, method: "POST", path: "/sales/accounts/:userId/cancel-subscription" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${req.userId}
    `;
    if (!employer) throw APIError.notFound("employer not found");

    await db.exec`
      UPDATE employer_subscriptions
      SET status = 'cancelled'
      WHERE employer_id = ${employer.employer_id} AND status = 'active'
    `;

    await db.exec`
      UPDATE employers SET
        subscription_status = 'cancelled'
      WHERE employer_id = ${employer.employer_id}
    `;

    return { ok: true };
  }
);

export interface ExtendSubscriptionRequest {
  userId: string;
  additionalDays: number;
}

export const salesExtendSubscription = api<ExtendSubscriptionRequest, UpdateAccountResponse>(
  { expose: true, auth: true, method: "POST", path: "/sales/accounts/:userId/extend-subscription" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    if (req.additionalDays <= 0) throw APIError.invalidArgument("additionalDays must be positive");

    const employer = await db.queryRow<{
      employer_id: string;
      subscription_period_end: Date | null;
    }>`
      SELECT employer_id, subscription_period_end
      FROM employers WHERE user_id = ${req.userId}
    `;
    if (!employer) throw APIError.notFound("employer not found");

    const base = employer.subscription_period_end && employer.subscription_period_end > new Date()
      ? employer.subscription_period_end
      : new Date();
    const newEnd = new Date(base.getTime() + req.additionalDays * 86400000);

    await db.exec`
      UPDATE employers SET
        subscription_status     = 'active',
        subscription_period_end = ${newEnd}
      WHERE employer_id = ${employer.employer_id}
    `;

    await db.exec`
      UPDATE employer_subscriptions
      SET current_period_end = ${newEnd}, status = 'active'
      WHERE id = (
        SELECT id FROM employer_subscriptions
        WHERE employer_id = ${employer.employer_id}
          AND status IN ('active', 'cancelled', 'expired')
        ORDER BY created_at DESC
        LIMIT 1
      )
    `;

    return { ok: true };
  }
);

export interface GetAccountDetailRequest {
  userId: string;
}

export interface AccountDetail {
  userId: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: Date;
  worker: {
    workerId: string;
    name: string;
    phone: string;
    location: string | null;
    bio: string | null;
    experienceYears: number | null;
    priorityBoost: boolean;
    docsVerifiedPurchased: boolean;
    refsPurchased: boolean;
  } | null;
  employer: {
    employerId: string;
    organisationName: string;
    contactPerson: string;
    phone: string;
    email: string | null;
    location: string | null;
    abn: string;
    subscriptionStatus: string;
    subscriptionPlan: string | null;
    subscriptionPeriodEnd: Date | null;
    subscriptionHistory: {
      id: string;
      plan: string;
      amountAudCents: number;
      status: string;
      createdAt: Date;
      currentPeriodEnd: Date | null;
    }[];
  } | null;
}

export interface GrantWorkerPackageRequest {
  userId: string;
  grantDocs: boolean;
  grantRefs: boolean;
  grantPriorityBoost: boolean;
}

export const salesGrantWorkerPackage = api<GrantWorkerPackageRequest, UpdateAccountResponse>(
  { expose: true, auth: true, method: "POST", path: "/sales/accounts/:userId/grant-worker-package" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${req.userId}
    `;
    if (!worker) throw APIError.notFound("worker not found");

    if (req.grantDocs || req.grantRefs || req.grantPriorityBoost) {
      const { randomUUID } = await import("crypto");
      if (req.grantDocs) {
        await db.exec`
          UPDATE workers SET docs_verified_purchased = true WHERE worker_id = ${worker.worker_id}
        `;
        await db.exec`
          INSERT INTO worker_purchases (worker_id, package, stripe_session_id, amount_aud_cents, status, paid_at)
          VALUES (${worker.worker_id}, 'docs_only', ${`manual_${randomUUID()}`}, 0, 'paid', NOW())
        `;
      }
      if (req.grantRefs) {
        await db.exec`
          UPDATE workers SET refs_purchased = true WHERE worker_id = ${worker.worker_id}
        `;
        await db.exec`
          INSERT INTO worker_purchases (worker_id, package, stripe_session_id, amount_aud_cents, status, paid_at)
          VALUES (${worker.worker_id}, 'refs_only', ${`manual_${randomUUID()}`}, 0, 'paid', NOW())
        `;
      }
      if (req.grantPriorityBoost) {
        await db.exec`
          UPDATE workers SET priority_boost = true WHERE worker_id = ${worker.worker_id}
        `;
      }
    }

    return { ok: true };
  }
);

export const getAccountDetail = api<GetAccountDetailRequest, AccountDetail>(
  { expose: true, auth: true, method: "GET", path: "/sales/accounts/:userId/detail" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const user = await db.queryRow<{
      user_id: string;
      email: string;
      role: string;
      is_verified: boolean;
      created_at: Date;
    }>`
      SELECT user_id, email, role, is_verified, created_at
      FROM users WHERE user_id = ${req.userId}
    `;
    if (!user) throw APIError.notFound("user not found");

    const worker = await db.queryRow<{
      worker_id: string;
      name: string;
      phone: string;
      location: string | null;
      bio: string | null;
      experience_years: number | null;
      priority_boost: boolean;
      docs_verified_purchased: boolean;
      refs_purchased: boolean;
    }>`
      SELECT worker_id, name, phone, location, bio, experience_years,
             priority_boost, docs_verified_purchased, refs_purchased
      FROM workers WHERE user_id = ${req.userId}
    `;

    const employer = await db.queryRow<{
      employer_id: string;
      organisation_name: string;
      contact_person: string;
      phone: string;
      email: string | null;
      location: string | null;
      abn: string;
      subscription_status: string;
      subscription_plan: string | null;
      subscription_period_end: Date | null;
    }>`
      SELECT employer_id, organisation_name, contact_person, phone, email, location, abn,
             subscription_status, subscription_plan, subscription_period_end
      FROM employers WHERE user_id = ${req.userId}
    `;

    const subHistory = employer ? await db.queryAll<{
      id: string;
      plan: string;
      amount_aud_cents: number;
      status: string;
      created_at: Date;
      current_period_end: Date | null;
    }>`
      SELECT id, plan, amount_aud_cents, status, created_at, current_period_end
      FROM employer_subscriptions
      WHERE employer_id = ${employer.employer_id}
      ORDER BY created_at DESC
      LIMIT 10
    ` : [];

    return {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
      createdAt: user.created_at,
      worker: worker ? {
        workerId: worker.worker_id,
        name: worker.name,
        phone: worker.phone,
        location: worker.location,
        bio: worker.bio,
        experienceYears: worker.experience_years,
        priorityBoost: worker.priority_boost,
        docsVerifiedPurchased: worker.docs_verified_purchased,
        refsPurchased: worker.refs_purchased,
      } : null,
      employer: employer ? {
        employerId: employer.employer_id,
        organisationName: employer.organisation_name,
        contactPerson: employer.contact_person,
        phone: employer.phone,
        email: employer.email,
        location: employer.location,
        abn: employer.abn,
        subscriptionStatus: employer.subscription_status,
        subscriptionPlan: employer.subscription_plan,
        subscriptionPeriodEnd: employer.subscription_period_end,
        subscriptionHistory: subHistory.map((s) => ({
          id: s.id,
          plan: s.plan,
          amountAudCents: s.amount_aud_cents,
          status: s.status,
          createdAt: s.created_at,
          currentPeriodEnd: s.current_period_end,
        })),
      } : null,
    };
  }
);
