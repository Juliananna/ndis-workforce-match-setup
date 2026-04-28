import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle, CheckCircle2, Loader2, X, ArrowRight, BadgeCheck,
  DollarSign, Calendar, Compass, Star, ChevronDown,
  Tag, Shield, ChevronRight, Sparkles, Heart, Zap,
} from "lucide-react";
import backend from "~backend/client";

type PromoState = "idle" | "checking" | "valid" | "invalid";

interface PromoResult {
  description: string | null;
  discountType: "percent" | "fixed_aud_cents";
  discountValue: number;
}

function formatDiscount(result: PromoResult): string {
  if (result.discountType === "percent") return `${result.discountValue}% off`;
  return `$${(result.discountValue / 100).toFixed(2)} off`;
}

const SKILLS = [
  "Community Participation",
  "Personal Care",
  "Domestic Assistance",
  "Social Support",
  "Behaviour Support",
  "Allied Health Support",
];

const FEATURES = [
  {
    icon: DollarSign,
    tint: "#E0F7FD",
    fg: "#3A92DF",
    title: "Set Your Own Rates",
    desc: "You're in control. Average providers earn 20% more than industry standard benchmarks.",
  },
  {
    icon: Calendar,
    tint: "#D1FAE5",
    fg: "#10B981",
    title: "Total Flexibility",
    desc: "Manage your schedule with ease. Work as much or as little as you want.",
  },
  {
    icon: Compass,
    tint: "#F3EDFB",
    fg: "#9764C7",
    title: "Smart Matching",
    desc: "Our intelligent system connects you with participants based on skills, location, and care compatibility.",
  },
  {
    icon: Zap,
    tint: "#FFF7ED",
    fg: "#F59E0B",
    title: "Fast Onboarding",
    desc: "Complete your profile and start getting matched in minutes — not days.",
  },
];

const WHY_ITEMS = [
  {
    icon: Shield,
    fg: "#3A92DF",
    tint: "#E0F7FD",
    title: "NDIS-aligned compliance",
    desc: "Every credential, screening, and document check aligns with NDIS framework requirements.",
  },
  {
    icon: Heart,
    fg: "#9764C7",
    tint: "#F3EDFB",
    title: "Purpose-built for care",
    desc: "Designed specifically for support workers — not generic job boards.",
  },
  {
    icon: BadgeCheck,
    fg: "#10B981",
    tint: "#D1FAE5",
    title: "Verified & trusted",
    desc: "Your credentials are verified and displayed to providers, building trust before first contact.",
  },
  {
    icon: Sparkles,
    fg: "#F59E0B",
    tint: "#FFF7ED",
    title: "Better matches, better outcomes",
    desc: "When the right worker meets the right participant, care quality and satisfaction improve.",
  },
];

export default function GetHiredPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [skill, setSkill] = useState(SKILLS[0]);
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoState, setPromoState] = useState<PromoState>("idle");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const promoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ email: string; promoGrants?: string[] } | null>(null);

  useEffect(() => {
    const code = searchParams.get("promo");
    if (code) handlePromoInput(code);
  }, []);

  const handlePromoInput = (val: string) => {
    setPromoCode(val);
    setPromoResult(null);
    if (!val.trim()) { setPromoState("idle"); return; }
    setPromoState("checking");
    if (promoDebounce.current) clearTimeout(promoDebounce.current);
    promoDebounce.current = setTimeout(async () => {
      try {
        const res = await backend.sales.validatePromo({ code: val.trim() });
        if (res.valid) {
          setPromoState("valid");
          setPromoResult({ description: res.description, discountType: res.discountType, discountValue: res.discountValue });
        } else {
          setPromoState("invalid");
        }
      } catch {
        setPromoState("invalid");
      }
    }, 600);
  };

  const clearPromo = () => {
    setPromoCode("");
    setPromoState("idle");
    setPromoResult(null);
    if (promoDebounce.current) clearTimeout(promoDebounce.current);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError("Please agree to the Terms of Service and Privacy Policy."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await backend.auth.register({
        email, password, role: "WORKER", name, phone,
        promoCode: promoState === "valid" && promoCode ? promoCode.trim() : undefined,
      });
      setSuccess({ email, promoGrants: res.promoGrantsApplied });
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--brand-canvas)" }}>
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 text-center border" style={{ borderColor: "var(--brand-border)" }}>
          <div className="flex justify-center mb-5">
            <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--brand-mint)" }}>
              <CheckCircle2 className="h-10 w-10" style={{ color: "var(--brand-green)" }} />
            </div>
          </div>
          <h2 className="text-2xl font-black mb-2" style={{ color: "var(--brand-ink)" }}>You're in!</h2>
          <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--brand-muted)" }}>
            We sent a verification link to <strong style={{ color: "var(--brand-ink)" }}>{success.email}</strong>. Click the link to activate your account.
          </p>
          {success.promoGrants && success.promoGrants.length > 0 && (
            <div className="mb-5 rounded-2xl p-3 text-left border" style={{ backgroundColor: "var(--brand-mint)", borderColor: "#A7F3D0" }}>
              <p className="text-xs font-black mb-1.5 flex items-center gap-1" style={{ color: "#065F46" }}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Promo code applied!
              </p>
              <ul className="space-y-0.5">
                {success.promoGrants.map((g) => (
                  <li key={g} className="text-xs flex items-center gap-1.5" style={{ color: "#047857" }}>
                    <span className="h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: "var(--brand-green)" }} />{g}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3.5 text-white font-black rounded-2xl transition-all hover:-translate-y-0.5"
            style={{ background: "var(--brand-hero-grad)", boxShadow: "0 6px 20px rgba(43,183,227,0.26)" }}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen antialiased" style={{ backgroundColor: "var(--brand-canvas)", color: "var(--brand-ink)" }}>

      {/* NAV */}
      <nav
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ borderColor: "var(--brand-border)", backgroundColor: "rgba(255,255,255,0.93)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/kizazi-hire-logo.png" alt="KizaziHire" className="h-9 w-9 rounded-xl object-cover" />
            <span className="text-[1.05rem] font-black tracking-tight" style={{ color: "var(--brand-ink)" }}>
              KizaziHire
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {[
              { href: "#features", label: "Benefits" },
              { href: "#why", label: "Why join" },
              { href: "#signup", label: "Sign up" },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="text-sm font-semibold transition-colors"
                style={{ color: "var(--brand-muted)" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--brand-ink)")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--brand-muted)")}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
              style={{ color: "var(--brand-muted)" }}
            >
              Log in
            </Link>
            <button
              onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-black text-white transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--brand-purple-grad)",
                boxShadow: "0 4px 14px rgba(151,100,199,0.30)",
              }}
            >
              Get started <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #f5f0fc 0%, #f0fbfe 50%, #eef6ff 100%)" }}
        />
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[600px] w-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #9764C7 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-[400px] w-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #3ED4E2 0%, transparent 70%)" }}
        />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#9764C7" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 py-24 md:grid-cols-[1.05fr_0.95fr] md:py-32">
          <div>
            <span
              className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em]"
              style={{
                borderColor: "rgba(151,100,199,0.22)",
                backgroundColor: "rgba(243,237,251,0.75)",
                color: "var(--brand-purple)",
              }}
            >
              <BadgeCheck className="h-3 w-3" />
              For NDIS support workers · Australia
            </span>

            <h1
              className="mb-5 text-[2.5rem] font-black leading-[1.06] tracking-[-0.025em] md:text-[3.5rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Be the{" "}
              <span
                style={{
                  background: "var(--brand-purple-grad)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                support
              </span>
              <br />
              they deserve.
            </h1>

            <p
              className="mb-9 max-w-lg text-[1.07rem] leading-[1.75]"
              style={{ color: "var(--brand-muted)" }}
            >
              Join Australia's most trusted NDIS workforce. Set your rates, choose your hours, and match with participants who need your specific skills.
            </p>

            <div className="mb-9 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-sm font-black text-white transition-all hover:-translate-y-1"
                style={{
                  background: "var(--brand-purple-grad)",
                  boxShadow: "0 8px 28px rgba(151,100,199,0.28)",
                }}
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/"
                className="flex items-center justify-center gap-2 rounded-2xl border px-7 py-4 text-sm font-bold transition-all hover:-translate-y-1 hover:shadow-md"
                style={{
                  borderColor: "var(--brand-border)",
                  backgroundColor: "white",
                  color: "var(--brand-ink)",
                }}
              >
                I'm a provider →
              </Link>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {[
                "Verified credentials",
                "NDIS-aligned screening",
                "Flexible scheduling",
                "Smart matching",
              ].map((label) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold"
                  style={{
                    borderColor: "var(--brand-border)",
                    backgroundColor: "rgba(255,255,255,0.85)",
                    color: "var(--brand-muted)",
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--brand-green)" }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: worker profile card mockup */}
          <div className="relative mx-auto w-full max-w-[400px]">
            <div
              className="absolute -left-8 top-10 z-10 flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ backgroundColor: "white", boxShadow: "0 10px 40px rgba(151,100,199,0.14)" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--brand-purple-tint)" }}
              >
                <BadgeCheck className="h-4 w-4" style={{ color: "var(--brand-purple)" }} />
              </span>
              <div>
                <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>Documents verified</p>
                <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Screening complete</p>
              </div>
            </div>

            <div
              className="absolute -right-6 bottom-16 z-10 flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ backgroundColor: "white", boxShadow: "0 10px 40px rgba(43,183,227,0.14)" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--brand-cyan-tint)" }}
              >
                <Star className="h-4 w-4 fill-current" style={{ color: "var(--brand-cyan-deep)" }} />
              </span>
              <div>
                <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>4.9/5 avg rating</p>
                <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Worker satisfaction</p>
              </div>
            </div>

            <div
              className="overflow-hidden rounded-[2.2rem] p-2.5"
              style={{ backgroundColor: "white", boxShadow: "0 24px 72px rgba(151,100,199,0.14)" }}
            >
              <div
                className="rounded-[1.8rem] p-6 text-white"
                style={{ background: "var(--brand-purple-grad)" }}
              >
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                  Worker profile · Personal care
                </p>
                <div className="mb-5 flex items-start justify-between">
                  <p className="text-[1.45rem] font-black leading-tight">Sarah Mitchell</p>
                  <div
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
                    style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                  >
                    <Star className="h-3 w-3 fill-white" /> 4.9
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {["Personal care", "Social support", "Community access", "Domestic assist."].map((s) => (
                    <span
                      key={s}
                      className="rounded-xl px-2.5 py-1.5 text-center text-[10px] font-bold"
                      style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 px-3 pt-3 pb-1">
                {[
                  { label: "Police check", color: "var(--brand-green)", bg: "#D1FAE5" },
                  { label: "NDIS screened", color: "var(--brand-cyan-deep)", bg: "var(--brand-cyan-tint)" },
                  { label: "First aid", color: "#F59E0B", bg: "#FFF7ED" },
                ].map(({ label, color, bg }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold"
                    style={{ backgroundColor: bg, color }}
                  >
                    <BadgeCheck className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div className="border-y" style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}>
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { icon: BadgeCheck, label: "Verified credentials" },
              { icon: Shield, label: "NDIS-aligned screening" },
              { icon: Compass, label: "Smart matching" },
              { icon: Heart, label: "Purpose-built for care" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-3 text-center md:flex-row md:text-left">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "var(--brand-purple-tint)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "var(--brand-purple)" }} />
                </span>
                <p className="text-sm font-bold" style={{ color: "var(--brand-ink)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BENEFITS */}
      <section id="features" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 max-w-2xl">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}
            >
              Worker benefits
            </span>
            <h2
              className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Everything you need to{" "}
              <span style={{ color: "var(--brand-muted)", fontWeight: 600 }}>build your practice.</span>
            </h2>
            <p className="text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              Four reasons support workers choose KizaziHire over generic job platforms.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, tint, fg, title, desc }) => (
              <div
                key={title}
                className="group rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-canvas)" }}
              >
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: tint }}
                >
                  <Icon className="h-5 w-5" style={{ color: fg }} />
                </div>
                <h3 className="mb-2 text-[0.95rem] font-black" style={{ color: "var(--brand-ink)" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROMO BANNER */}
      <section className="py-6 md:py-10" style={{ backgroundColor: "white" }}>
        <div className="mx-auto max-w-6xl px-6">
          <div
            className="relative overflow-hidden rounded-3xl p-8 md:p-10"
            style={{ background: "var(--brand-hero-grad)" }}
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full opacity-20" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full opacity-15" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="mb-3 inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/70 border border-white/20">
                  Limited Time Offer
                </span>
                <h2 className="mb-2 text-xl font-black text-white md:text-2xl">
                  Get Verified for Free
                </h2>
                <p className="text-sm leading-relaxed text-white/75 md:max-w-md">
                  We've waived the $45 background check fee for new applicants this month. Start your journey with zero upfront costs.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:items-end md:shrink-0">
                <div className="flex items-center gap-2 text-white text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--brand-mint)" }} />
                  ID &amp; Police Check Included
                </div>
                <button
                  onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: "white", color: "var(--brand-purple)" }}
                >
                  Claim Now <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SIGNUP + SOCIAL PROOF */}
      <section id="signup" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 md:grid-cols-2 md:items-start">

            {/* Form */}
            <div
              ref={formRef}
              className="rounded-3xl border p-8"
              style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
            >
              <h2 className="mb-1 text-2xl font-black" style={{ color: "var(--brand-ink)" }}>Start Your Application</h2>
              <p className="mb-6 text-sm" style={{ color: "var(--brand-muted)" }}>Takes less than 3 minutes to get started</p>

              {error && (
                <div
                  className="mb-4 flex items-start gap-2 rounded-2xl border p-3 text-xs"
                  style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA", color: "#EF4444" }}
                >
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>Full Name</label>
                  <input
                    type="text"
                    placeholder="Jane Cooper"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all"
                    style={{ backgroundColor: "var(--brand-canvas)", borderColor: "var(--brand-border)", color: "var(--brand-ink)" }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--brand-purple)"; e.target.style.backgroundColor = "white"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--brand-border)"; e.target.style.backgroundColor = "var(--brand-canvas)"; }}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all"
                    style={{ backgroundColor: "var(--brand-canvas)", borderColor: "var(--brand-border)", color: "var(--brand-ink)" }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--brand-purple)"; e.target.style.backgroundColor = "white"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--brand-border)"; e.target.style.backgroundColor = "var(--brand-canvas)"; }}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>Phone</label>
                  <input
                    type="tel"
                    placeholder="04XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all"
                    style={{ backgroundColor: "var(--brand-canvas)", borderColor: "var(--brand-border)", color: "var(--brand-ink)" }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--brand-purple)"; e.target.style.backgroundColor = "white"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--brand-border)"; e.target.style.backgroundColor = "var(--brand-canvas)"; }}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>Primary Skill</label>
                  <div className="relative">
                    <select
                      value={skill}
                      onChange={(e) => setSkill(e.target.value)}
                      className="w-full appearance-none rounded-xl border px-4 py-3 pr-10 text-sm outline-none transition-all"
                      style={{ backgroundColor: "var(--brand-canvas)", borderColor: "var(--brand-border)", color: "var(--brand-ink)" }}
                    >
                      {SKILLS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>Password</label>
                  <input
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all"
                    style={{ backgroundColor: "var(--brand-canvas)", borderColor: "var(--brand-border)", color: "var(--brand-ink)" }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--brand-purple)"; e.target.style.backgroundColor = "white"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--brand-border)"; e.target.style.backgroundColor = "var(--brand-canvas)"; }}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>
                    Promo / Discount Code{" "}
                    <span className="font-normal normal-case tracking-normal" style={{ color: "var(--brand-muted)", opacity: 0.6 }}>(optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Tag className="h-4 w-4" style={{ color: "var(--brand-muted)" }} />
                    </div>
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={promoCode}
                      onChange={(e) => handlePromoInput(e.target.value)}
                      className="w-full rounded-xl border pl-9 pr-10 py-3 text-sm outline-none transition-all uppercase tracking-widest"
                      style={{
                        backgroundColor: "var(--brand-canvas)",
                        borderColor: promoState === "valid" ? "#10B981" : promoState === "invalid" ? "#EF4444" : "var(--brand-border)",
                        color: "var(--brand-ink)",
                      }}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {promoState === "checking" && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--brand-muted)" }} />}
                      {promoState === "valid" && <CheckCircle2 className="h-4 w-4" style={{ color: "var(--brand-green)" }} />}
                      {promoState === "invalid" && <AlertCircle className="h-4 w-4" style={{ color: "#EF4444" }} />}
                      {promoState === "idle" && promoCode && (
                        <button type="button" onClick={clearPromo}>
                          <X className="h-4 w-4" style={{ color: "var(--brand-muted)" }} />
                        </button>
                      )}
                    </div>
                  </div>
                  {promoState === "valid" && promoResult && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--brand-green)" }}>
                      <CheckCircle2 className="h-3 w-3" />
                      {formatDiscount(promoResult)} applied{promoResult.description ? ` — ${promoResult.description}` : ""}
                    </p>
                  )}
                  {promoState === "invalid" && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: "#EF4444" }}>
                      <AlertCircle className="h-3 w-3" />
                      Invalid or expired code
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agree"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded"
                    style={{ accentColor: "var(--brand-purple)" }}
                  />
                  <label htmlFor="agree" className="cursor-pointer text-xs leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                    By clicking "Create My Account" you agree to our{" "}
                    <a href="https://ndis.gov.au/about-us/policies/privacy" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: "var(--brand-purple)" }}>Terms of Service</a>
                    {" "}and{" "}
                    <a href="https://ndis.gov.au/about-us/policies/privacy" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: "var(--brand-purple)" }}>Privacy Policy</a>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                  style={{
                    background: "var(--brand-purple-grad)",
                    boxShadow: "0 6px 20px rgba(151,100,199,0.26)",
                  }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? "Creating account…" : "Create My Account →"}
                </button>
              </form>

              <p className="mt-4 text-center text-xs" style={{ color: "var(--brand-muted)" }}>
                Already have an account?{" "}
                <Link to="/login" className="font-black hover:underline" style={{ color: "var(--brand-purple)" }}>Log in</Link>
              </p>
            </div>

            {/* Social proof */}
            <div className="flex flex-col gap-5">
              <div
                className="rounded-3xl border p-8"
                style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
              >
                <div className="mb-5 flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "var(--brand-purple-tint)" }}
                  >
                    <Shield className="h-5 w-5" style={{ color: "var(--brand-purple)" }} />
                  </span>
                  <div>
                    <h3 className="font-black" style={{ color: "var(--brand-ink)" }}>Join the Movement</h3>
                    <p className="text-xs" style={{ color: "var(--brand-muted)" }}>Empowering 96,000+ support workers across Australia.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex -space-x-2">
                    {[
                      { bg: "#3A92DF", label: "S" },
                      { bg: "#9764C7", label: "J" },
                      { bg: "#3ED4E2", label: "M" },
                      { bg: "#F59E0B", label: "A" },
                    ].map(({ bg, label }) => (
                      <div
                        key={label}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-black text-white"
                        style={{ backgroundColor: bg }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: "var(--brand-muted)" }}>+96,000 workers joined</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Profile completion", pct: 85, color: "var(--brand-purple)" },
                    { label: "Match rate", pct: 92, color: "var(--brand-cyan-deep)" },
                    { label: "Worker satisfaction", pct: 96, color: "var(--brand-green)" },
                  ].map(({ label, pct, color }) => (
                    <div key={label}>
                      <div className="mb-1 flex justify-between">
                        <p className="text-xs font-semibold" style={{ color: "var(--brand-muted)" }}>{label}</p>
                        <p className="text-xs font-black" style={{ color: "var(--brand-ink)" }}>{pct}%</p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: "var(--brand-surface)" }}>
                        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { stat: "Free", label: "Verification this month" },
                  { stat: "96k+", label: "Active workers" },
                  { stat: "4.9/5", label: "Avg. satisfaction" },
                  { stat: "3 min", label: "To sign up" },
                ].map(({ stat, label }) => (
                  <div
                    key={stat}
                    className="rounded-2xl border py-5 text-center"
                    style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
                  >
                    <p
                      className="mb-1 text-xl font-black"
                      style={{
                        background: "var(--brand-purple-grad)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {stat}
                    </p>
                    <p className="text-[11px] font-semibold" style={{ color: "var(--brand-muted)" }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY JOIN */}
      <section id="why" className="py-20 md:py-28" style={{ backgroundColor: "white" }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-cyan-tint)", color: "var(--brand-cyan-deep)" }}
            >
              Why KizaziHire
            </span>
            <h2
              className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Built for better care outcomes
            </h2>
            <p className="mx-auto max-w-xl text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              Supporting workers across Australia. Designed for real-world NDIS care scenarios.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {WHY_ITEMS.map(({ icon: Icon, fg, tint, title, desc }) => (
              <div
                key={title}
                className="flex gap-5 rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-canvas)" }}
              >
                <span
                  className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: tint }}
                >
                  <Icon className="h-5 w-5" style={{ color: fg }} />
                </span>
                <div>
                  <h3 className="mb-2 text-[0.95rem] font-black" style={{ color: "var(--brand-ink)" }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        className="relative overflow-hidden py-24 md:py-32"
        style={{ background: "var(--brand-purple-grad)" }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full opacity-20" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full opacity-15" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-white/55">
            Ready to get started?
          </p>
          <h2 className="mb-5 text-3xl font-black leading-tight text-white md:text-[2.7rem]">
            Your next opportunity
            <br />
            <span style={{ opacity: 0.85 }}>is waiting.</span>
          </h2>
          <p className="mb-10 text-[1.05rem] leading-relaxed text-white/70">
            Join thousands of support workers using KizaziHire to build a meaningful, flexible career in care.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 text-sm font-black transition-all hover:-translate-y-1 hover:shadow-xl sm:w-auto"
              style={{ backgroundColor: "white", color: "var(--brand-purple)" }}
            >
              Create free account <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border px-8 py-4 text-sm font-black text-white transition-all hover:-translate-y-1 sm:w-auto"
              style={{ borderColor: "rgba(255,255,255,0.32)", backgroundColor: "rgba(255,255,255,0.10)" }}
            >
              I'm a provider
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-10" style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <img src="/kizazi-hire-logo.png" alt="KizaziHire" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-black" style={{ color: "var(--brand-ink)" }}>KizaziHire</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: "var(--brand-muted)" }}>
            <Link to="/privacy-policy" className="transition-colors hover:text-[var(--brand-ink)]">Privacy Policy</Link>
            <a href="#" className="transition-colors hover:text-[var(--brand-ink)]">Terms of Service</a>
            <a href="#" className="transition-colors hover:text-[var(--brand-ink)]">Support</a>
          </div>
          <p className="text-xs" style={{ color: "var(--brand-muted)" }}>
            © 2025 KizaziHire · Built for the NDIS community
          </p>
        </div>
      </footer>
    </div>
  );
}
