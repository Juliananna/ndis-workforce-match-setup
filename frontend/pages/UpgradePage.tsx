import { useState, useEffect } from "react";
import { Shield, CheckCircle2, Star, Loader2, BadgeCheck, Users } from "lucide-react";
import { useAuthedBackend } from "../hooks/useAuthedBackend";
import type { PaymentStatus } from "~backend/payments/status";
import type { PaymentPackage } from "~backend/payments/checkout";

const PACKAGES: {
  id: PaymentPackage;
  name: string;
  price: string;
  badge: string;
  description: string;
  features: string[];
  highlight?: boolean;
}[] = [
  {
    id: "docs_only",
    name: "Document Verification",
    price: "$15",
    badge: "One-off",
    description: "Have your compliance documents verified by our team.",
    features: [
      "Professional document review",
      "Verified badge on your profile",
      "Priority placement in employer searches",
    ],
  },
  {
    id: "refs_only",
    name: "Reference Checks",
    price: "$10",
    badge: "2 checks included",
    description: "We conduct structured reference checks on your behalf.",
    features: [
      "2 professional reference interviews",
      "Scored performance report",
      "Reference Check badge on your profile",
      "Priority placement in employer searches",
    ],
  },
  {
    id: "bundle",
    name: "Verified Pro Bundle",
    price: "$20",
    badge: "Best Value",
    description: "Everything you need to stand out — docs verified and references checked.",
    features: [
      "Document Verification ($15 value)",
      "2 Reference Checks ($10 value)",
      "Priority listing in all employer searches",
      "Verified Pro badge on your profile",
      "Matched first to relevant job posts",
    ],
    highlight: true,
  },
];

interface UpgradePageProps {
  onBack?: () => void;
}

export default function UpgradePage({ onBack }: UpgradePageProps) {
  const api = useAuthedBackend();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<PaymentPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    api.payments.getPaymentStatus()
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  const handlePurchase = async (pkg: PaymentPackage) => {
    if (!api) return;
    setPurchasing(pkg);
    setError(null);
    try {
      const origin = window.location.origin;
      const { checkoutUrl } = await api.payments.createCheckoutSession({
        package: pkg,
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

  const alreadyHas = (pkg: PaymentPackage): boolean => {
    if (!status) return false;
    if (pkg === "docs_only") return status.docsVerifiedPurchased;
    if (pkg === "refs_only") return status.refsPurchased;
    if (pkg === "bundle") return status.docsVerifiedPurchased && status.refsPurchased;
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {onBack && (
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to profile
        </button>
      )}

      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Star className="h-5 w-5 fill-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider">Priority Worker Programme</span>
          <Star className="h-5 w-5 fill-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Stand out to employers</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Verified workers appear at the top of every employer search and job match. One-off fee — no subscriptions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PACKAGES.map((pkg) => {
          const purchased = alreadyHas(pkg.id);
          return (
            <div
              key={pkg.id}
              className={`relative rounded-2xl border p-6 flex flex-col gap-4 transition-all ${
                pkg.highlight
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {pkg.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    Best Value
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{pkg.badge}</p>
                <h2 className="text-lg font-bold">{pkg.name}</h2>
                <p className="text-3xl font-extrabold">
                  {pkg.price} <span className="text-base font-normal text-muted-foreground">AUD</span>
                </p>
                <p className="text-sm text-muted-foreground">{pkg.description}</p>
              </div>

              <ul className="space-y-2 flex-1">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {purchased ? (
                <div className="flex items-center gap-2 justify-center rounded-xl bg-green-500/10 text-green-600 font-semibold py-2.5 text-sm">
                  <BadgeCheck className="h-4 w-4" />
                  Purchased
                </div>
              ) : (
                <button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasing !== null}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    pkg.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {purchasing === pkg.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                  ) : (
                    <>Get {pkg.name}</>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {[
          { icon: Shield, title: "Secure checkout", body: "Payments processed by Stripe. We never store card details." },
          { icon: BadgeCheck, title: "One-off fee", body: "Pay once. Your priority status never expires." },
          { icon: Users, title: "More visibility", body: "Priority workers appear first in all employer searches and job matches." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
            <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
            </div>
          </div>
        ))}
      </div>

      {status && status.purchases.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="font-semibold text-sm">Purchase History</h3>
          <div className="divide-y divide-border">
            {status.purchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="capitalize text-muted-foreground">{p.package.replace("_", " ")}</span>
                <span className="font-medium">${(p.amountAudCents / 100).toFixed(2)} AUD</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  p.status === "paid"
                    ? "bg-green-500/10 text-green-600"
                    : p.status === "pending"
                    ? "bg-yellow-500/10 text-yellow-600"
                    : "bg-red-500/10 text-red-600"
                }`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
