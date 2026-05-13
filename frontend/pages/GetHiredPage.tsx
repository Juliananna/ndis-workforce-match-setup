import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle, CheckCircle2, Loader2, X, ArrowRight, BadgeCheck,
  ChevronDown, Tag, FileText, Users, Calendar, MapPin,
  Briefcase, Star, Shield, ChevronRight, ClipboardCheck,
  UserCheck, Building2, Clock, Plus, Minus,
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

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: UserCheck,
    color: "var(--brand-purple)",
    tint: "var(--brand-purple-tint)",
    title: "Create your profile",
    desc: "Add your experience, location, availability, and preferred support work.",
  },
  {
    step: "02",
    icon: FileText,
    color: "var(--brand-cyan-deep)",
    tint: "var(--brand-cyan-tint)",
    title: "Upload your documents",
    desc: "Add your qualifications, certifications, and required worker documents.",
  },
  {
    step: "03",
    icon: Users,
    color: "#10B981",
    tint: "#D1FAE5",
    title: "Complete reference checks",
    desc: "Provide two references so providers can review your profile with confidence.",
  },
  {
    step: "04",
    icon: Building2,
    color: "#F59E0B",
    tint: "#FFF7ED",
    title: "Get interview requests",
    desc: "Providers review your profile and contact you directly when they think you're a good fit.",
  },
];

const BENEFITS = [
  {
    icon: ClipboardCheck,
    color: "var(--brand-purple)",
    tint: "var(--brand-purple-tint)",
    title: "No endless applications",
    desc: "Create one profile instead of applying again and again.",
  },
  {
    icon: Star,
    color: "var(--brand-cyan-deep)",
    tint: "var(--brand-cyan-tint)",
    title: "Get seen by providers",
    desc: "Your profile is visible to providers actively looking for support workers.",
  },
  {
    icon: BadgeCheck,
    color: "#10B981",
    tint: "#D1FAE5",
    title: "Show your experience upfront",
    desc: "Qualifications, references, availability, and experience are clear from the start.",
  },
  {
    icon: Calendar,
    color: "#F59E0B",
    tint: "#FFF7ED",
    title: "More control over your work",
    desc: "Choose opportunities that match your location, availability, and preferences.",
  },
];

const PROFILE_FIELDS = [
  { icon: Briefcase, label: "Experience", color: "var(--brand-purple)" },
  { icon: FileText, label: "Qualifications", color: "var(--brand-cyan-deep)" },
  { icon: BadgeCheck, label: "Certifications", color: "#10B981" },
  { icon: Users, label: "References", color: "#F59E0B" },
  { icon: Calendar, label: "Availability", color: "var(--brand-purple)" },
  { icon: MapPin, label: "Preferred locations", color: "var(--brand-cyan-deep)" },
  { icon: ClipboardCheck, label: "Support preferences", color: "#10B981" },
];

const FAQS = [
  {
    q: "Is KizaziHire free for support workers?",
    a: "Yes. Creating a profile and being discovered by providers is completely free for support workers. There are no upfront fees or subscription costs.",
  },
  {
    q: "Do I need qualifications?",
    a: "You don't need every document to start, but uploading your certifications (such as First Aid, NDIS Worker Orientation, Police Check, and NDIS Worker Screening Check) makes your profile much stronger. Providers are more likely to request an interview when your documents are complete.",
  },
  {
    q: "Do I get employed by KizaziHire?",
    a: "No. KizaziHire is a matching platform. Providers and support workers agree on employment or contracting arrangements directly. We simply make it easier for the right people to find each other.",
  },
  {
    q: "Can providers contact me directly?",
    a: "Yes. When a provider finds your profile and thinks you're a good fit, they can send you an interview or offer request through the platform. You review it and decide whether to proceed.",
  },
  {
    q: "How long does verification take?",
    a: "Most document verifications are completed within 1–3 business days once you've uploaded your documents. You'll be notified as each document is reviewed.",
  },
];

function BenefitCard({
  icon: Icon, color, tint, title, desc, index,
}: {
  icon: React.ElementType; color: string; tint: string; title: string; desc: string; index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotateX = ((y - cy) / cy) * -8;
    const rotateY = ((x - cx) / cx) * 8;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.03)`;
    card.style.boxShadow = `${(x - cx) * 0.04}px ${(y - cy) * 0.04 + 16}px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)";
    card.style.boxShadow = "";
  };

  const accentColors = [
    "var(--brand-purple-grad)",
    "var(--brand-cyan-grad)",
    "linear-gradient(135deg,#10B981,#059669)",
    "linear-gradient(135deg,#F59E0B,#D97706)",
  ];

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative overflow-hidden rounded-3xl border p-7 cursor-default"
      style={{
        borderColor: "var(--brand-border)",
        backgroundColor: "white",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        willChange: "transform",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-3xl"
        style={{ background: accentColors[index % accentColors.length] }}
      />
      <div
        className="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
        style={{ backgroundColor: tint, width: "3.25rem", height: "3.25rem" }}
      >
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
      <h3 className="mb-2 text-[0.95rem] font-black" style={{ color: "var(--brand-ink)" }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{desc}</p>
      <div
        className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle, ${tint} 0%, transparent 70%)` }}
      />
    </div>
  );
}

export default function GetHiredPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLElement>(null);

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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
          <h2 className="text-2xl font-black mb-2" style={{ color: "var(--brand-ink)" }}>Profile created!</h2>
          <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--brand-muted)" }}>
            We sent a verification link to <strong style={{ color: "var(--brand-ink)" }}>{success.email}</strong>. Click the link to activate your account and complete your profile.
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
              { href: "#how-it-works", label: "How it works" },
              { href: "#benefits", label: "Benefits" },
              { href: "#faq", label: "FAQ" },
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
              Create Worker Profile <ChevronRight className="h-3.5 w-3.5" />
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

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
          <div>
            <span
              className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em]"
              style={{
                borderColor: "rgba(151,100,199,0.22)",
                backgroundColor: "rgba(243,237,251,0.75)",
                color: "var(--brand-purple)",
              }}
            >
              <Shield className="h-3 w-3" />
              For NDIS support workers · Australia
            </span>

            <h1
              className="mb-5 text-[2.4rem] font-black leading-[1.06] tracking-[-0.025em] md:text-[3.25rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Get hired faster by{" "}
              <span
                style={{
                  background: "var(--brand-purple-grad)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                NDIS providers
              </span>
            </h1>

            <p
              className="mb-8 max-w-lg text-[1.05rem] leading-[1.75]"
              style={{ color: "var(--brand-muted)" }}
            >
              Create one profile, upload your qualifications, complete your references, and get seen by providers looking for support workers.
            </p>

            <div className="mb-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-sm font-black text-white transition-all hover:-translate-y-1"
                style={{
                  background: "var(--brand-purple-grad)",
                  boxShadow: "0 8px 28px rgba(151,100,199,0.28)",
                }}
              >
                Create Worker Profile <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => howItWorksRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center justify-center gap-2 rounded-2xl border px-7 py-4 text-sm font-bold transition-all hover:-translate-y-1 hover:shadow-md"
                style={{
                  borderColor: "var(--brand-border)",
                  backgroundColor: "white",
                  color: "var(--brand-ink)",
                }}
              >
                How It Works
              </button>
            </div>
          </div>

          {/* Hero mockup */}
          <div className="relative mx-auto w-full max-w-[380px]">
            {/* Interview request floating card */}
            <div
              className="absolute -left-8 top-6 z-10 flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ backgroundColor: "white", boxShadow: "0 10px 40px rgba(151,100,199,0.16)" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--brand-mint)" }}
              >
                <Building2 className="h-4 w-4" style={{ color: "var(--brand-green)" }} />
              </span>
              <div>
                <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>Interview request</p>
                <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Suncare Support · Just now</p>
              </div>
            </div>

            {/* References completed card */}
            <div
              className="absolute -right-6 bottom-20 z-10 flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ backgroundColor: "white", boxShadow: "0 10px 40px rgba(43,183,227,0.16)" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--brand-cyan-tint)" }}
              >
                <CheckCircle2 className="h-4 w-4" style={{ color: "var(--brand-cyan-deep)" }} />
              </span>
              <div>
                <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>References completed</p>
                <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>2 of 2 verified</p>
              </div>
            </div>

            {/* Worker profile card */}
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
                <p className="text-[1.35rem] font-black leading-tight mb-1">Sarah Mitchell</p>
                <p className="text-[11px] text-white/70 mb-4">Melbourne, VIC · Available weekdays</p>

                <div className="grid grid-cols-2 gap-2 mb-3">
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

              {/* Qualifications row */}
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--brand-muted)" }}>Qualifications uploaded</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    { label: "Police check", color: "#10B981", bg: "#D1FAE5" },
                    { label: "NDIS screened", color: "var(--brand-cyan-deep)", bg: "var(--brand-cyan-tint)" },
                    { label: "First aid", color: "#F59E0B", bg: "#FFF7ED" },
                    { label: "Cert III", color: "var(--brand-purple)", bg: "var(--brand-purple-tint)" },
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
                <div className="flex items-center gap-2 py-2 border-t" style={{ borderColor: "var(--brand-border)" }}>
                  <div className="flex -space-x-1.5">
                    {["#9764C7", "#3A92DF", "#10B981"].map((bg) => (
                      <div key={bg} className="h-5 w-5 rounded-full border-2 border-white" style={{ backgroundColor: bg }} />
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold" style={{ color: "var(--brand-muted)" }}>3 providers viewed this week</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP — infinite marquee */}
      <div className="border-y overflow-hidden" style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .marquee-track {
            display: flex;
            width: max-content;
            animation: marquee 28s linear infinite;
          }
          .marquee-track:hover {
            animation-play-state: paused;
          }
        `}</style>
        <div className="marquee-track py-5">
          {[
            { icon: UserCheck, label: "One profile", color: "var(--brand-purple)", tint: "var(--brand-purple-tint)" },
            { icon: FileText, label: "Qualifications uploaded", color: "var(--brand-cyan-deep)", tint: "var(--brand-cyan-tint)" },
            { icon: Users, label: "References completed", color: "#10B981", tint: "#D1FAE5" },
            { icon: Star, label: "Seen by providers", color: "#F59E0B", tint: "#FFF7ED" },
            { icon: Clock, label: "Interview faster", color: "var(--brand-purple)", tint: "var(--brand-purple-tint)" },
            { icon: BadgeCheck, label: "NDIS compliant", color: "var(--brand-cyan-deep)", tint: "var(--brand-cyan-tint)" },
            { icon: MapPin, label: "Location matched", color: "#10B981", tint: "#D1FAE5" },
            { icon: Shield, label: "Document verified", color: "#F59E0B", tint: "#FFF7ED" },
            { icon: UserCheck, label: "One profile", color: "var(--brand-purple)", tint: "var(--brand-purple-tint)" },
            { icon: FileText, label: "Qualifications uploaded", color: "var(--brand-cyan-deep)", tint: "var(--brand-cyan-tint)" },
            { icon: Users, label: "References completed", color: "#10B981", tint: "#D1FAE5" },
            { icon: Star, label: "Seen by providers", color: "#F59E0B", tint: "#FFF7ED" },
            { icon: Clock, label: "Interview faster", color: "var(--brand-purple)", tint: "var(--brand-purple-tint)" },
            { icon: BadgeCheck, label: "NDIS compliant", color: "var(--brand-cyan-deep)", tint: "var(--brand-cyan-tint)" },
            { icon: MapPin, label: "Location matched", color: "#10B981", tint: "#D1FAE5" },
            { icon: Shield, label: "Document verified", color: "#F59E0B", tint: "#FFF7ED" },
          ].map(({ icon: Icon, label, color, tint }, i) => (
            <div
              key={i}
              className="mx-3 flex items-center gap-4 rounded-2xl border px-6 py-4 shrink-0"
              style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-canvas)", minWidth: "220px" }}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: tint }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </span>
              <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how-it-works" ref={howItWorksRef} className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}
            >
              The process
            </span>
            <h2
              className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              How KizaziHire works for support workers
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map(({ step, icon: Icon, color, tint, title, desc }) => (
              <div
                key={step}
                className="relative rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
              >
                <span
                  className="absolute right-5 top-5 text-[2rem] font-black leading-none"
                  style={{ color: "var(--brand-surface)" }}
                >
                  {step}
                </span>
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: tint }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <h3 className="mb-2 text-[0.95rem] font-black" style={{ color: "var(--brand-ink)" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="py-20 md:py-28" style={{ backgroundColor: "white" }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-cyan-tint)", color: "var(--brand-cyan-deep)" }}
            >
              Why choose us
            </span>
            <h2
              className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Why support workers use KizaziHire
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, color, tint, title, desc }, i) => (
              <BenefitCard key={title} icon={Icon} color={color} tint={tint} title={title} desc={desc} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* PROFILE PREVIEW */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-14 md:grid-cols-2 md:items-center">
            <div>
              <span
                className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
                style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}
              >
                Your profile
              </span>
              <h2
                className="mb-5 text-3xl font-black leading-tight md:text-[2.3rem]"
                style={{ color: "var(--brand-ink)" }}
              >
                Your profile does the work for you
              </h2>
              <p className="mb-8 text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                Once your profile is complete, providers can review the information they need before requesting an interview.
              </p>
              <button
                onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black text-white transition-all hover:-translate-y-0.5"
                style={{ background: "var(--brand-purple-grad)", boxShadow: "0 6px 20px rgba(151,100,199,0.26)" }}
              >
                Create Worker Profile <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PROFILE_FIELDS.map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border p-4 transition-all hover:shadow-md"
                  style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "var(--brand-canvas)" }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color }} />
                  </span>
                  <span className="text-sm font-bold" style={{ color: "var(--brand-ink)" }}>{label}</span>
                </div>
              ))}
              <div
                className="flex items-center justify-center rounded-2xl border-2 border-dashed p-4"
                style={{ borderColor: "var(--brand-border)" }}
              >
                <span className="text-sm font-bold" style={{ color: "var(--brand-muted)" }}>+ more</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN POINT */}
      <section
        className="relative overflow-hidden py-20 md:py-24"
        style={{ background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)" }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full opacity-10" style={{ backgroundColor: "var(--brand-purple)" }} />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full opacity-10" style={{ backgroundColor: "var(--brand-cyan)" }} />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-5 text-3xl font-black leading-tight text-white md:text-[2.5rem]">
            Stop applying into silence
          </h2>
          <p className="mb-8 text-[1.05rem] leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            Support workers spend too much time applying for roles and waiting for replies. KizaziHire helps you build one clear profile so providers can find you faster.
          </p>
          <button
            onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-black transition-all hover:-translate-y-1"
            style={{ backgroundColor: "white", color: "var(--brand-ink)" }}
          >
            Create Worker Profile <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* SIGNUP */}
      <section id="signup" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 md:grid-cols-2 md:items-start">
            <div
              ref={formRef}
              className="rounded-3xl border p-8"
              style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
            >
              <h2 className="mb-1 text-2xl font-black" style={{ color: "var(--brand-ink)" }}>Create Worker Profile</h2>
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
                    By clicking "Create Worker Profile" you agree to our{" "}
                    <Link to="/privacy-policy" className="font-bold hover:underline" style={{ color: "var(--brand-purple)" }}>Terms of Service</Link>
                    {" "}and{" "}
                    <Link to="/privacy-policy" className="font-bold hover:underline" style={{ color: "var(--brand-purple)" }}>Privacy Policy</Link>
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
                  {loading ? "Creating profile…" : "Create Worker Profile →"}
                </button>
              </form>

              <p className="mt-4 text-center text-xs" style={{ color: "var(--brand-muted)" }}>
                Already have an account?{" "}
                <Link to="/login" className="font-black hover:underline" style={{ color: "var(--brand-purple)" }}>Log in</Link>
              </p>
            </div>

            {/* Right column — what happens next */}
            <div className="flex flex-col gap-5">
              <div
                className="rounded-3xl border p-8"
                style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
              >
                <h3 className="mb-5 text-lg font-black" style={{ color: "var(--brand-ink)" }}>What happens after you sign up</h3>
                <div className="space-y-4">
                  {[
                    { step: "1", title: "Verify your email", desc: "Click the link we send to activate your account." },
                    { step: "2", title: "Complete your profile", desc: "Add your experience, location, and availability." },
                    { step: "3", title: "Upload qualifications", desc: "Add your certifications and required documents." },
                    { step: "4", title: "Add your references", desc: "Provide two referees for providers to review." },
                    { step: "5", title: "Get seen by providers", desc: "Your profile goes live and providers can find you." },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-4">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                        style={{ background: "var(--brand-purple-grad)" }}
                      >
                        {step}
                      </div>
                      <div>
                        <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>{title}</p>
                        <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--brand-muted)" }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { stat: "Free", label: "For support workers" },
                  { stat: "1–3 days", label: "Document verification" },
                  { stat: "3 min", label: "To sign up" },
                  { stat: "100%", label: "Profile control" },
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

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28" style={{ backgroundColor: "white" }}>
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-12 text-center">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}
            >
              FAQs
            </span>
            <h2
              className="text-3xl font-black leading-tight md:text-[2.3rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Common questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map(({ q, a }, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border transition-all"
                style={{ borderColor: openFaq === i ? "var(--brand-purple)" : "var(--brand-border)", backgroundColor: "var(--brand-canvas)" }}
              >
                <button
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>{q}</span>
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors"
                    style={{ backgroundColor: openFaq === i ? "var(--brand-purple-tint)" : "var(--brand-surface)" }}
                  >
                    {openFaq === i
                      ? <Minus className="h-3.5 w-3.5" style={{ color: "var(--brand-purple)" }} />
                      : <Plus className="h-3.5 w-3.5" style={{ color: "var(--brand-muted)" }} />
                    }
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{a}</p>
                  </div>
                )}
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
          <h2 className="mb-5 text-3xl font-black leading-tight text-white md:text-[2.7rem]">
            Ready to get seen by NDIS providers?
          </h2>
          <p className="mb-10 text-[1.05rem] leading-relaxed text-white/70">
            Create your worker profile and make it easier for providers to review your experience, qualifications, and availability.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 text-sm font-black transition-all hover:-translate-y-1 hover:shadow-xl sm:w-auto"
              style={{ backgroundColor: "white", color: "var(--brand-purple)" }}
            >
              Create Worker Profile <ArrowRight className="h-4 w-4" />
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
