import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { getAuthData } from "~encore/auth";
import db from "../db";
import Stripe from "stripe";

const stripeSecretKey = secret("StripeSecretKey");

export type EmployerPlan = "monthly" | "biannual" | "annual";

export const EMPLOYER_PLANS: Record<EmployerPlan, { amountCents: number; label: string; months: number; monthlyDisplay: number }> = {
  monthly:  { amountCents: 40000,  label: "Employer Access – Monthly ($400/mo AUD)",        months: 1,  monthlyDisplay: 400 },
  biannual: { amountCents: 180000, label: "Employer Access – 6-Month Contract ($300/mo AUD)", months: 6,  monthlyDisplay: 300 },
  annual:   { amountCents: 240000, label: "Employer Access – 12-Month Contract ($200/mo AUD)", months: 12, monthlyDisplay: 200 },
};

export interface CreateEmployerCheckoutRequest {
  plan: EmployerPlan;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateEmployerCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

export const createEmployerCheckoutSession = api<CreateEmployerCheckoutRequest, CreateEmployerCheckoutResponse>(
  { expose: true, auth: true, method: "POST", path: "/payments/employer/checkout" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can subscribe");
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) throw APIError.notFound("employer profile not found");

    const plan = EMPLOYER_PLANS[req.plan];
    if (!plan) throw APIError.invalidArgument("invalid plan");

    const stripe = new Stripe(stripeSecretKey(), { apiVersion: "2025-02-24.acacia" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: plan.amountCents,
            product_data: { name: plan.label },
          },
        },
      ],
      metadata: {
        employer_id: employer.employer_id,
        employer_plan: req.plan,
        months: String(plan.months),
      },
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
    });

    await db.exec`
      INSERT INTO employer_subscriptions (employer_id, plan, stripe_session_id, amount_aud_cents, status)
      VALUES (${employer.employer_id}, ${req.plan}, ${session.id}, ${plan.amountCents}, 'pending')
    `;

    return { checkoutUrl: session.url!, sessionId: session.id };
  }
);
