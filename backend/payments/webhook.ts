import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import db from "../db";
import Stripe from "stripe";
import { employerSubscribedTopic, paymentSucceededTopic } from "../notifications/lifecycle_topics";

const stripeSecretKey = secret("StripeSecretKey");
const stripeWebhookSecret = secret("StripeWebhookSecret");

export const stripeWebhook = api.raw(
  { expose: true, method: "POST", path: "/payments/webhook" },
  async (req, resp) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      resp.writeHead(400);
      resp.end("Missing stripe-signature header");
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const rawBody = Buffer.concat(chunks);

    const stripe = new Stripe(stripeSecretKey(), { apiVersion: "2025-02-24.acacia" });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      resp.writeHead(400);
      resp.end(`Webhook signature verification failed: ${msg}`);
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const amountCents = typeof session.amount_total === "number" ? session.amount_total : 0;

      const workerId = session.metadata?.worker_id;
      const pkg = session.metadata?.package as "docs_only" | "refs_only" | "bundle" | undefined;

      if (workerId && pkg) {
        await db.exec`
          UPDATE worker_purchases
          SET status = 'paid',
              stripe_payment_intent = ${session.payment_intent as string | null},
              paid_at = NOW()
          WHERE stripe_session_id = ${session.id}
        `;

        const docsVerified = pkg === "docs_only" || pkg === "bundle";
        const refsPurchased = pkg === "refs_only" || pkg === "bundle";

        await db.exec`
          UPDATE workers
          SET priority_boost = TRUE,
              docs_verified_purchased = docs_verified_purchased OR ${docsVerified},
              refs_purchased = refs_purchased OR ${refsPurchased}
          WHERE worker_id = ${workerId}
        `;

        const workerUser = await db.queryRow<{ user_id: string; email: string; name: string }>`
          SELECT u.user_id, u.email, w.name
          FROM workers w
          JOIN users u ON u.user_id = w.user_id
          WHERE w.worker_id = ${workerId}
        `;
        if (workerUser) {
          const pkgLabels: Record<string, string> = {
            docs_only: "Document Verification",
            refs_only: "Reference Check",
            bundle: "Verification Bundle",
          };
          await paymentSucceededTopic.publish({
            userId: workerUser.user_id,
            email: workerUser.email,
            name: workerUser.name,
            amountAudCents: amountCents,
            description: pkgLabels[pkg] ?? pkg,
          });
        }
      }

      const employerId = session.metadata?.employer_id;
      const employerPlan = session.metadata?.employer_plan as "monthly" | "biannual" | "annual" | undefined;
      const months = session.metadata?.months ? parseInt(session.metadata.months, 10) : null;

      if (employerId && employerPlan && months) {
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + months);

        await db.exec`
          UPDATE employer_subscriptions
          SET status = 'active',
              stripe_payment_intent = ${session.payment_intent as string | null},
              paid_at = NOW(),
              current_period_start = ${periodStart},
              current_period_end = ${periodEnd}
          WHERE stripe_session_id = ${session.id}
        `;

        await db.exec`
          UPDATE employers
          SET subscription_status = 'active',
              subscription_plan = ${employerPlan},
              subscription_period_end = ${periodEnd}
          WHERE employer_id = ${employerId}
        `;

        const empUser = await db.queryRow<{ user_id: string; email: string; organisation_name: string }>`
          SELECT u.user_id, u.email, e.organisation_name
          FROM employers e
          JOIN users u ON u.user_id = e.user_id
          WHERE e.employer_id = ${employerId}
        `;
        if (empUser) {
          const planLabels: Record<string, string> = { monthly: "Monthly", biannual: "6-Month", annual: "Annual" };
          await employerSubscribedTopic.publish({
            userId: empUser.user_id,
            email: empUser.email,
            organisationName: empUser.organisation_name,
            plan: planLabels[employerPlan] ?? employerPlan,
            periodEnd: periodEnd.toISOString().slice(0, 10),
          });
          await paymentSucceededTopic.publish({
            userId: empUser.user_id,
            email: empUser.email,
            name: empUser.organisation_name,
            amountAudCents: amountCents,
            description: `${planLabels[employerPlan] ?? employerPlan} subscription`,
          });
        }
      }
    }

    resp.writeHead(200);
    resp.end("ok");
  }
);
