import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface EmployerSubscriptionStatus {
  isActive: boolean;
  plan: string | null;
  periodEnd: Date | null;
  subscriptions: {
    id: string;
    plan: string;
    amountAudCents: number;
    status: string;
    createdAt: Date;
    paidAt: Date | null;
    currentPeriodEnd: Date | null;
  }[];
}

export const getEmployerSubscriptionStatus = api<void, EmployerSubscriptionStatus>(
  { expose: true, auth: true, method: "GET", path: "/payments/employer/status" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can view subscription status");
    }

    const employer = await db.queryRow<{
      employer_id: string;
      subscription_status: string;
      subscription_plan: string | null;
      subscription_period_end: Date | null;
    }>`
      SELECT employer_id, subscription_status, subscription_plan, subscription_period_end
      FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const isActive =
      employer.subscription_status === "active" &&
      (employer.subscription_period_end == null || employer.subscription_period_end > new Date());

    const subs = await db.queryAll<{
      id: string;
      plan: string;
      amount_aud_cents: number;
      status: string;
      created_at: Date;
      paid_at: Date | null;
      current_period_end: Date | null;
    }>`
      SELECT id, plan, amount_aud_cents, status, created_at, paid_at, current_period_end
      FROM employer_subscriptions WHERE employer_id = ${employer.employer_id}
      ORDER BY created_at DESC
    `;

    return {
      isActive,
      plan: employer.subscription_plan,
      periodEnd: employer.subscription_period_end,
      subscriptions: subs.map((s) => ({
        id: s.id,
        plan: s.plan,
        amountAudCents: s.amount_aud_cents,
        status: s.status,
        createdAt: s.created_at,
        paidAt: s.paid_at,
        currentPeriodEnd: s.current_period_end,
      })),
    };
  }
);
