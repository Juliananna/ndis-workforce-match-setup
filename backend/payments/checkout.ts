import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { getAuthData } from "~encore/auth";
import db from "../db";
import Stripe from "stripe";

const stripeSecretKey = secret("StripeSecretKey");

export type PaymentPackage = "docs_only" | "refs_only" | "bundle";

const PRICES: Record<PaymentPackage, { amountCents: number; label: string }> = {
  docs_only: { amountCents: 1500, label: "Document Verification – $15 AUD" },
  refs_only: { amountCents: 1000, label: "2 Reference Checks – $10 AUD" },
  bundle:    { amountCents: 2000, label: "Bundle: Verified Docs + 2 Reference Checks – $20 AUD" },
};

export interface CreateCheckoutRequest {
  package: PaymentPackage;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

export const createCheckoutSession = api<CreateCheckoutRequest, CreateCheckoutResponse>(
  { expose: true, auth: true, method: "POST", path: "/payments/checkout" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can purchase packages");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const price = PRICES[req.package];
    if (!price) throw APIError.invalidArgument("invalid package");

    const stripe = new Stripe(stripeSecretKey(), { apiVersion: "2025-02-24.acacia" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: price.amountCents,
            product_data: { name: price.label },
          },
        },
      ],
      metadata: {
        worker_id: worker.worker_id,
        package: req.package,
      },
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
    });

    await db.exec`
      INSERT INTO worker_purchases (worker_id, package, stripe_session_id, amount_aud_cents, status)
      VALUES (${worker.worker_id}, ${req.package}, ${session.id}, ${price.amountCents}, 'pending')
    `;

    return { checkoutUrl: session.url!, sessionId: session.id };
  }
);
