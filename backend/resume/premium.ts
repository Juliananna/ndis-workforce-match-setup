import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import db from "../db";
import Stripe from "stripe";

const stripeSecretKey = secret("StripeSecretKey");
const appBaseUrl = secret("AppBaseUrl");

const RESUME_PREMIUM_PRICE_CENTS = 999;

export interface ResumePremiumStatusResponse {
  isPremium: boolean;
  selectedTheme: string;
}

export interface CreateResumePremiumCheckoutRequest {
  id: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateResumePremiumCheckoutResponse {
  checkoutUrl: string;
  stripeSessionId: string;
}

export interface SaveResumeThemeRequest {
  id: string;
  theme: string;
}

export interface SaveResumeThemeResponse {
  selectedTheme: string;
}

export const getResumePremiumStatus = api<{ id: string }, ResumePremiumStatusResponse>(
  { expose: true, method: "GET", path: "/resume-sessions/:id/premium" },
  async ({ id }) => {
    const row = await db.queryRow<{ is_premium: boolean; selected_theme: string }>`
      SELECT is_premium, selected_theme FROM resume_sessions WHERE id = ${id}
    `;
    if (!row) throw APIError.notFound("session not found");
    return { isPremium: row.is_premium, selectedTheme: row.selected_theme };
  }
);

export const createResumePremiumCheckout = api<CreateResumePremiumCheckoutRequest, CreateResumePremiumCheckoutResponse>(
  { expose: true, method: "POST", path: "/resume-sessions/:id/premium/checkout" },
  async (req) => {
    const session = await db.queryRow<{ id: string; email: string | null }>`
      SELECT id, email FROM resume_sessions WHERE id = ${req.id}
    `;
    if (!session) throw APIError.notFound("session not found");

    const base = appBaseUrl();
    const successUrl = req.successUrl ?? `${base}/resume-builder/preview/${req.id}?premium=success`;
    const cancelUrl = req.cancelUrl ?? `${base}/resume-builder/preview/${req.id}?premium=cancelled`;

    const stripe = new Stripe(stripeSecretKey(), { apiVersion: "2025-02-24.acacia" });

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: RESUME_PREMIUM_PRICE_CENTS,
            product_data: {
              name: "KizaziHire Resume Builder – Premium Unlock",
              description: "Unlock 3 professional resume designs and remove KizaziHire branding from your PDF",
            },
          },
        },
      ],
      metadata: {
        resume_session_id: req.id,
        purchase_type: "resume_premium",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await db.exec`
      INSERT INTO resume_premium_purchases (session_id, stripe_session_id, amount_aud_cents, status)
      VALUES (${req.id}, ${stripeSession.id}, ${RESUME_PREMIUM_PRICE_CENTS}, 'pending')
    `;

    return { checkoutUrl: stripeSession.url!, stripeSessionId: stripeSession.id };
  }
);

export const saveResumeTheme = api<SaveResumeThemeRequest, SaveResumeThemeResponse>(
  { expose: true, method: "POST", path: "/resume-sessions/:id/theme" },
  async (req) => {
    const ALLOWED_FREE_THEMES = ["classic_free"];
    const ALLOWED_PREMIUM_THEMES = ["modern", "executive", "minimal"];
    const ALL_THEMES = [...ALLOWED_FREE_THEMES, ...ALLOWED_PREMIUM_THEMES];

    if (!ALL_THEMES.includes(req.theme)) {
      throw APIError.invalidArgument("invalid theme");
    }

    const row = await db.queryRow<{ is_premium: boolean }>`
      SELECT is_premium FROM resume_sessions WHERE id = ${req.id}
    `;
    if (!row) throw APIError.notFound("session not found");

    if (ALLOWED_PREMIUM_THEMES.includes(req.theme) && !row.is_premium) {
      throw APIError.failedPrecondition("premium required to use this theme");
    }

    await db.exec`
      UPDATE resume_sessions SET selected_theme = ${req.theme}, updated_at = NOW() WHERE id = ${req.id}
    `;

    return { selectedTheme: req.theme };
  }
);
