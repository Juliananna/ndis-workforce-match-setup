import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface RedeemPromoRequest {
  code: string;
}

export interface RedeemPromoResponse {
  message: string;
  grantsApplied: string[];
}

export const redeemPromo = api<RedeemPromoRequest, RedeemPromoResponse>(
  { expose: true, auth: true, method: "POST", path: "/sales/discounts/redeem" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER" && auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only workers and employers can redeem promo codes");
    }

    if (!req.code.trim()) throw APIError.invalidArgument("code is required");
    const code = req.code.trim().toUpperCase();

    const discount = await db.queryRow<{
      id: string;
      grants_upgrades: string[];
      applies_to: string;
      max_uses: number | null;
      uses_count: number;
      valid_from: Date;
      valid_until: Date | null;
      is_active: boolean;
    }>`
      SELECT id, grants_upgrades, applies_to, max_uses, uses_count, valid_from, valid_until, is_active
      FROM sales_discounts
      WHERE code = ${code}
    `;

    if (!discount || !discount.is_active) {
      throw APIError.invalidArgument("invalid or inactive promo code");
    }

    const now = new Date();
    if (discount.valid_from > now) {
      throw APIError.invalidArgument("promo code is not yet valid");
    }
    if (discount.valid_until && discount.valid_until < now) {
      throw APIError.invalidArgument("promo code has expired");
    }
    if (discount.max_uses !== null && discount.uses_count >= discount.max_uses) {
      throw APIError.invalidArgument("promo code has reached its maximum uses");
    }

    const appliesTo = discount.applies_to as "employer_subscription" | "worker_purchase" | "all";

    if (auth.role === "WORKER") {
      if (appliesTo === "employer_subscription") {
        throw APIError.invalidArgument("this code is for employer accounts only");
      }

      const upgrades = (discount.grants_upgrades ?? []) as string[];
      if (upgrades.length === 0) {
        throw APIError.invalidArgument("this code does not grant any upgrades");
      }

      const worker = await db.queryRow<{ worker_id: string }>`
        SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
      `;
      if (!worker) throw APIError.notFound("worker profile not found");

      await db.exec`
        UPDATE workers
        SET docs_verified_purchased = CASE WHEN ${upgrades.includes("docs_verified")} THEN TRUE ELSE docs_verified_purchased END,
            refs_purchased          = CASE WHEN ${upgrades.includes("refs")} THEN TRUE ELSE refs_purchased END,
            priority_boost          = CASE WHEN ${upgrades.includes("priority_boost")} THEN TRUE ELSE priority_boost END
        WHERE worker_id = ${worker.worker_id}
      `;

      await db.exec`
        UPDATE sales_discounts SET uses_count = uses_count + 1 WHERE id = ${discount.id}
      `;

      const labels: Record<string, string> = {
        docs_verified: "Document Verification",
        refs: "Reference Checks",
        priority_boost: "Priority Boost",
      };
      const grantsApplied = upgrades.map((u) => labels[u] ?? u);

      return { message: "Promo code redeemed successfully", grantsApplied };
    }

    if (auth.role === "EMPLOYER") {
      if (appliesTo === "worker_purchase") {
        throw APIError.invalidArgument("this code is for worker accounts only");
      }

      const employer = await db.queryRow<{
        employer_id: string;
        subscription_status: string;
        subscription_period_end: Date | null;
      }>`
        SELECT employer_id, subscription_status, subscription_period_end
        FROM employers WHERE user_id = ${auth.userID}
      `;
      if (!employer) throw APIError.notFound("employer profile not found");

      const upgrades = (discount.grants_upgrades ?? []) as string[];
      const grantMonths = upgrades.find((u) => u.startsWith("subscription_months:"));
      if (!grantMonths && !upgrades.includes("subscription_30d") && !upgrades.includes("subscription_monthly") && !upgrades.includes("subscription_biannual") && !upgrades.includes("subscription_annual")) {
        throw APIError.invalidArgument("this code does not grant employer access");
      }

      let months = 1;
      if (upgrades.includes("subscription_biannual")) months = 6;
      else if (upgrades.includes("subscription_annual")) months = 12;
      else if (grantMonths) months = parseInt(grantMonths.split(":")[1] ?? "1", 10) || 1;

      const isCurrentlyActive =
        employer.subscription_status === "active" &&
        employer.subscription_period_end != null &&
        employer.subscription_period_end > now;

      const baseDate = isCurrentlyActive ? employer.subscription_period_end! : now;
      const newEnd = new Date(baseDate);
      newEnd.setMonth(newEnd.getMonth() + months);

      const planLabel = months >= 12 ? "annual" : months >= 6 ? "biannual" : "monthly";

      await db.exec`
        UPDATE employers
        SET subscription_status = 'active',
            subscription_plan = ${planLabel},
            subscription_period_end = ${newEnd}
        WHERE employer_id = ${employer.employer_id}
      `;

      await db.exec`
        INSERT INTO employer_subscriptions (employer_id, plan, stripe_session_id, amount_aud_cents, status, current_period_start, current_period_end, paid_at)
        VALUES (${employer.employer_id}, ${planLabel}, ${'promo:' + discount.id + ':' + Date.now()}, 0, 'active', ${now}, ${newEnd}, ${now})
      `;

      await db.exec`
        UPDATE sales_discounts SET uses_count = uses_count + 1 WHERE id = ${discount.id}
      `;

      const label = months >= 12 ? "12-month subscription" : months >= 6 ? "6-month subscription" : `${months}-month subscription`;
      return {
        message: "Promo code redeemed successfully",
        grantsApplied: [`${label} access`],
      };
    }

    throw APIError.internal("unexpected state");
  }
);
