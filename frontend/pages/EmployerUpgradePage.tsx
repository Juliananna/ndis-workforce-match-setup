import { useState, useEffect } from "react";
import {
  CheckCircle2, Loader2, BadgeCheck, Users, FileCheck, Shield,
  PhoneCall, Star, Lock, Zap, Clock
} from "lucide-react";
import { PromoCodeBox } from "../components/PromoCodeBox";
import { useAuthedBackend } from "../hooks/useAuthedBackend";
import type { EmployerSubscriptionStatus } from "~backend/payments/employer_status";
import type { EmployerPlan } from "~backend/payments/employer_checkout";

const PLANS: {
  id: EmployerPlan;
  name: string;
  monthlyPrice: number;
  totalPrice: number;
  billingLabel: string;
  badge?: string;
  highlight?: boolean;
  saving?: string;
  months: number;
}[] = [
  {
    id: "monthly",
    name: "Month to Month",
    monthlyPrice: 400,
    totalPrice: 400,
    billingLabel: "Billed monthly — cancel anytime",
    months: 1,
  },
  {
    id: "biannual",
    name: "6-Month Plan",
    monthlyPrice: 300,
    totalPrice: 1800,
    billingLabel: "Billed as $1,800 AUD upfront",
    badge: "Popular",
    highlight: true,
    saving: "Save $600",
    months: 6,
  },
  {
    id: "annual",
    name: "12-Month Plan",
    monthlyPrice: 200,
    totalPrice: 2400,
    billingLabel: "Billed as $2,400 AUD upfront",
    badge: "Best Value",
    saving: "Save $2,400",
    months: 12,
  },
];

const FEATURES = [
  {
    icon: Users,
    title: "Unlimited Worker Access",
    description: "Browse and contact every verified NDIS support worker on the platform.",
  },
  {
    icon: FileCheck,
    title: "Instant Compliance Documents",
    description: "Access worker compliance documents immediately — verified by our compliance officers.",
  },
  {
    icon: PhoneCall,
    title: "Human-Conducted Reference Checks",
    description: "Our internal compliance officers personally conduct structured reference checks on each worker.",
  },
  {
    icon: Zap,
    title: "Unlimited Job Postings",
    description: "Post as many job requests as you need with no caps or restrictions.",
  },
  {
    icon: Shield,
    title: "Verified Worker Profiles",
    description: "Every worker's credentials are confirmed by our team — not just self-reported.",
  },
  {
    icon: Clock,
    title: "Priority Matching",
    description: "Get matched to the best workers for your shifts faster than ever.",
  },
];

interface EmployerUpgradePageProps {
  onBack?: () => void;
}

export default function EmployerUpgradePage({ onBack }: EmployerUpgradePageProps) {
  const api = useAuthedBackend();
  const [status, setStatus] = useState<EmployerSubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<EmployerPlan | null>(null);
  const [testActivating, setTestActivating] = useState<EmployerPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const refreshStatus = () => {
    if (!api) return;
    api.payments.getEmployerSubscriptionStatus()
      .then(setStatus)
      .catch(() => {});
  };

  useEffect(() => {
    if (!api) return;
    api.payments.getEmployerSubscriptionStatus()
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  const handleTestActivate = async (plan: EmployerPlan) => {
    if (!api) return;
    setTestActivating(plan);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.payments.testActivateEmployerSubscription({ plan });
      setSuccessMsg(`✓ Test subscription activated: ${res.plan} plan until ${new Date(res.periodEnd).toLocaleDateString("en-AU")}`);
      refreshStatus();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Activation failed.";
      setError(msg);
      console.error(e);
    } finally {
      setTestActivating(null);
    }
  };

  const handleSubscribe = async (plan: EmployerPlan) => {
    if (!api) return;
    setPurchasing(plan);
    setError(null);
    setSuccessMsg(null);
    try {
      const origin = window.location.origin;
      const { checkoutUrl } = await api.payments.createEmployerCheckoutSession({
        plan,
        successUrl: `${origin}/?payment=success`,
        cancelUrl: `${origin}/?payment=cancelled`,
      });
      window.location.href = checkoutUrl;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Payment failed. Please try again.";
      setError(msg);
      console.error(e);
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const isActive = status?.isActive ?? false;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {onBack && (
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          ← Back to dashboard
        </button>
      )}

      {isActive && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
          <BadgeCheck className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Subscription Active</p>
            <p className="text-sm text-green-700">
              Plan: <span className="font-medium capitalize">{status?.plan?.replace("biannual", "6-Month") ?? ""}</span>
              {status?.periodEnd && (
                <> · Renews {new Date(status.periodEnd).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-blue-600">
          <Star className="h-5 w-5 fill-blue-600" />
          <span className="text-sm font-semibold uppercase tracking-wider">Employer Platform Access</span>
          <Star className="h-5 w-5 fill-blue-600" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          The complete NDIS workforce solution
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Access every verified worker, instant compliance documents, human-conducted reference checks, 
          and unlimited job postings. Everything your organisation needs to staff confidently.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl border p-6 flex flex-col gap-5 transition-all ${
              plan.highlight
                ? "border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-100"
                : "border-gray-200 bg-white"
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  plan.highlight
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-white"
                }`}>
                  {plan.badge}
                </span>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">{plan.name}</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-extrabold text-gray-900">${plan.monthlyPrice}</span>
                <span className="text-base text-gray-500 mb-1">/mo AUD</span>
              </div>
              {plan.saving && (
                <span className="inline-block text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  {plan.saving}
                </span>
              )}
              <p className="text-xs text-gray-500 mt-1">{plan.billingLabel}</p>
            </div>

            <ul className="space-y-2 flex-1 text-sm">
              {[
                "Unlimited worker browsing",
                "Instant compliance documents",
                "Human reference checks",
                "Unlimited job postings",
                "Priority matching",
                "Verified worker profiles",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${plan.highlight ? "text-blue-600" : "text-gray-500"}`} />
                  <span className="text-gray-700">{f}</span>
                </li>
              ))}
            </ul>

            {isActive ? (
              <div className="flex items-center gap-2 justify-center rounded-xl bg-green-500/10 text-green-700 font-semibold py-2.5 text-sm">
                <BadgeCheck className="h-4 w-4" />
                {status?.plan === plan.id ? "Current Plan" : "Included"}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={purchasing !== null || testActivating !== null}
                  className={`rounded-xl py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                    plan.highlight
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {purchasing === plan.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                  ) : (
                    <>Get Started — ${plan.totalPrice.toLocaleString()} AUD</>
                  )}
                </button>
                <button
                  onClick={() => handleTestActivate(plan.id)}
                  disabled={purchasing !== null || testActivating !== null}
                  className="rounded-xl py-2 text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testActivating === plan.id ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Activating…</>
                  ) : (
                    <>⚡ Activate for Testing (no payment)</>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-center text-sm text-red-600">{error}</p>
      )}

      {successMsg && (
        <p className="text-center text-sm text-green-700 font-medium">{successMsg}</p>
      )}

      <PromoCodeBox onRedeemed={refreshStatus} />

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 text-center">Everything included in every plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-5">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{title}</p>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 flex items-start gap-4">
        <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-900">Secure checkout via Stripe</p>
          <p className="text-sm text-blue-700 mt-1">
            Payments are processed securely by Stripe. We never store card details. 
            All subscriptions are billed upfront for the contracted period.
          </p>
        </div>
      </div>

      {status && status.subscriptions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h3 className="font-semibold text-sm text-gray-900">Billing History</h3>
          <div className="divide-y divide-gray-100">
            {status.subscriptions.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3 text-sm">
                <span className="capitalize text-gray-600">
                  {s.plan === "biannual" ? "6-Month Plan" : s.plan === "annual" ? "12-Month Plan" : "Monthly Plan"}
                </span>
                <span className="font-medium text-gray-900">${(s.amountAudCents / 100).toLocaleString()} AUD</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  s.status === "active"
                    ? "bg-green-100 text-green-700"
                    : s.status === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
