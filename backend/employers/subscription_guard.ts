import { APIError } from "encore.dev/api";
import db from "../db";

export type EmployerTier = "free" | "paid";

export interface EmployerTierInfo {
  tier: EmployerTier;
  isActive: boolean;
  isDemo: boolean;
}

export async function getEmployerTier(userId: string): Promise<EmployerTierInfo> {
  const employer = await db.queryRow<{
    subscription_status: string;
    subscription_period_end: Date | null;
    is_demo: boolean;
  }>`
    SELECT e.subscription_status, e.subscription_period_end, u.is_demo
    FROM employers e
    JOIN users u ON u.user_id = e.user_id
    WHERE e.user_id = ${userId}
  `;

  if (!employer) {
    throw APIError.notFound("employer profile not found");
  }

  if (employer.is_demo) {
    return { tier: "paid", isActive: true, isDemo: true };
  }

  const isActive =
    employer.subscription_status === "active" &&
    (employer.subscription_period_end == null || employer.subscription_period_end > new Date());

  return {
    tier: isActive ? "paid" : "free",
    isActive,
    isDemo: false,
  };
}

export async function requireEmployerSubscription(userId: string): Promise<void> {
  const info = await getEmployerTier(userId);

  if (info.isDemo || info.isActive) {
    return;
  }

  throw APIError.permissionDenied(
    "An active subscription is required to access this feature. Please upgrade your plan."
  );
}
