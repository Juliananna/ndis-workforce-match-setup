import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import type { EmployerPlan } from "./employer_checkout";
import { EMPLOYER_PLANS } from "./employer_checkout";

export interface TestActivateEmployerRequest {
  plan: EmployerPlan;
}

export interface TestActivateEmployerResponse {
  message: string;
  plan: string;
  periodEnd: Date;
}

export const testActivateEmployerSubscription = api<TestActivateEmployerRequest, TestActivateEmployerResponse>(
  { expose: true, auth: true, method: "POST", path: "/payments/employer/test-activate" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can use this endpoint");
    }

    const planConfig = EMPLOYER_PLANS[req.plan];
    if (!planConfig) throw APIError.invalidArgument("invalid plan");

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + planConfig.months);

    const fakeSessionId = `test_${crypto.randomUUID()}`;

    await db.exec`
      INSERT INTO employer_subscriptions
        (employer_id, plan, stripe_session_id, amount_aud_cents, status, current_period_start, current_period_end, paid_at)
      VALUES
        (${employer.employer_id}, ${req.plan}, ${fakeSessionId}, ${planConfig.amountCents}, 'active', ${periodStart}, ${periodEnd}, NOW())
    `;

    await db.exec`
      UPDATE employers
      SET subscription_status = 'active',
          subscription_plan = ${req.plan},
          subscription_period_end = ${periodEnd}
      WHERE employer_id = ${employer.employer_id}
    `;

    return {
      message: "Subscription activated for testing",
      plan: req.plan,
      periodEnd,
    };
  }
);
