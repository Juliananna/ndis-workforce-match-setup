import { Link } from "react-router-dom";
import {
  Shield,
  BadgeCheck,
  FileCheck2,
  ClipboardCheck,
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
  Heart,
  ChevronRight,
  MapPin,
  Star,
  Lock,
  Sparkles,
  Activity,
} from "lucide-react";

const TRUST_STRIP = [
  { icon: BadgeCheck, label: "Verified workers" },
  { icon: FileCheck2, label: "Police checks" },
  { icon: ClipboardCheck, label: "Credential screening" },
  { icon: Shield, label: "Trusted hiring process" },
];

const FEATURE_CARDS = [
  {
    icon: Sparkles,
    tint: "#E0F7FD",
    fg: "#2BB7E3",
    title: "Smarter matching",
    desc: "Matches based on skills, location, availability, and care compatibility — not just proximity.",
  },
  {
    icon: BadgeCheck,
    tint: "#F3EDFB",
    fg: "#9764C7",
    title: "Verified workforce",
    desc: "Every worker goes through credential checks and compliance screening before connecting with providers.",
  },
  {
    icon: Heart,
    tint: "#D1FAE5",
    fg: "#10B981",
    title: "Complex care ready",
    desc: "Purpose-built for high-support participants requiring consistent, skilled 1:1+ care arrangements.",
  },
  {
    icon: Zap,
    tint: "#FFF7ED",
    fg: "#F59E0B",
    title: "Faster hiring",
    desc: "Reduce time-to-hire and mismatches with a workflow built around compliance and fit — not volume.",
  },
];

const CREDIBILITY_BLOCKS = [
  {
    icon: Shield,
    fg: "#2BB7E3",
    tint: "#E0F7FD",
    title: "Designed for NDIS environments",
    desc: "Every feature reflects the compliance, documentation, and screening requirements of the NDIS framework.",
  },
  {
    icon: Heart,
    fg: "#9764C7",
    tint: "#F3EDFB",
    title: "Focused on complex care needs",
    desc: "Supporting providers who work with participants requiring consistent, high-quality 1:1 and complex care.",
  },
  {
    icon: Lock,
    fg: "#10B981",
    tint: "#D1FAE5",
    title: "Built to reduce hiring risk",
    desc: "Credential verification, screening checks, and structured matching reduce the risk of poor-fit placements.",
  },
  {
    icon: Activity,
    fg: "#F59E0B",
    tint: "#FFF7ED",
    title: "Supporting better care outcomes",
    desc: "When the right worker meets the right participant, care quality improves — that's the platform's core purpose.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen antialiased" style={{ backgroundColor: "var(--brand-canvas)", color: "var(--brand-ink)" }}>

      {/* ── NAV ── */}
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
              { href: "#features", label: "Features" },
              { href: "#why", label: "Why KizaziHire" },
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
            <Link
              to="/register"
              className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--brand-cyan-grad)",
                boxShadow: "0 4px 14px rgba(43,183,227,0.30)",
              }}
            >
              Get started <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #f0fbfe 0%, #f5f0fc 50%, #eef6ff 100%)",
          }}
        />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url('/hero-image.png')" }}
        />
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[600px] w-[600px] rounded-full opacity-20"
         
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-[400px] w-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #9764C7 0%, transparent 70%)" }}
        />
        {/* Subtle wave lines */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#3A92DF" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 py-24 md:grid-cols-[1.05fr_0.95fr] md:py-32">
          {/* Left: copy */}
          <div>
            <span
              className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em]"
              style={{
                borderColor: "rgba(43,183,227,0.22)",
                backgroundColor: "rgba(224,247,253,0.75)",
                color: "var(--brand-cyan-deep)",
              }}
            >
              <Shield className="h-3 w-3" />
              NDIS workforce platform · Australia
            </span>

            <h1
              className="mb-5 text-[2.5rem] font-black leading-[1.06] tracking-[-0.025em] md:text-[3.5rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Find the right
              <br />
              <span
                style={{
                  background: "var(--brand-hero-grad)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                support worker
              </span>
              <br />
              <span style={{ fontWeight: 500 }}>not just any worker.</span>
            </h1>

            <p
              className="mb-9 max-w-lg text-[1.07rem] leading-[1.75]"
              style={{ color: "var(--brand-muted)" }}
            >
              Built for NDIS providers and participants who need reliable, verified, and compatible support. Intelligent matching meets rigorous credential screening.
            </p>

            <div className="mb-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-sm font-black text-white transition-all hover:-translate-y-1"
                style={{
                  background: "var(--brand-hero-grad)",
                  boxShadow: "0 8px 28px rgba(43,183,227,0.28)",
                }}
              >
                Find verified support workers <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/gethired"
                className="flex items-center justify-center gap-2 rounded-2xl border px-7 py-4 text-sm font-bold transition-all hover:-translate-y-1 hover:shadow-md"
                style={{
                  borderColor: "var(--brand-border)",
                  backgroundColor: "white",
                  color: "var(--brand-ink)",
                }}
              >
                Start getting matched as a worker
              </Link>
            </div>

            {/* Trust micro-row */}
            <div className="flex flex-wrap gap-2.5">
              {[
                "NDIS-aligned workforce",
                "Verified credentials",
                "Built for complex care",
                "Fast matching",
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

          {/* Right: UI mockup */}
          <div className="relative mx-auto w-full max-w-[400px]">
            {/* Floating chip — verification */}
            <div
              className="absolute -left-8 top-10 z-10 flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ backgroundColor: "white", boxShadow: "0 10px 40px rgba(43,183,227,0.14)" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--brand-cyan-tint)" }}
              >
                <BadgeCheck className="h-4.5 w-4.5" style={{ color: "var(--brand-cyan)" }} />
              </span>
              <div>
                <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>Credentials verified</p>
                <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Screening complete</p>
              </div>
            </div>

            {/* Floating chip — match */}
            <div
              className="absolute -right-6 bottom-16 z-10 flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ backgroundColor: "white", boxShadow: "0 10px 40px rgba(151,100,199,0.14)" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--brand-purple-tint)" }}
              >
                <Sparkles className="h-4 w-4" style={{ color: "var(--brand-purple)" }} />
              </span>
              <div>
                <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>98% match found</p>
                <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Skills &amp; location aligned</p>
              </div>
            </div>

            {/* Main card */}
            <div
              className="overflow-hidden rounded-[2.2rem] p-2.5"
              style={{ backgroundColor: "white", boxShadow: "0 24px 72px rgba(58,146,223,0.14)" }}
            >
              {/* Card header gradient */}
              <div
                className="rounded-[1.8rem] p-6 text-white"
                style={{ background: "var(--brand-hero-grad)" }}
              >
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                  Best match · Complex care
                </p>
                <div className="mb-5 flex items-start justify-between">
                  <p className="text-[1.45rem] font-black leading-tight">Maya Johnson</p>
                  <div
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
                    style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                  >
                    <Star className="h-3 w-3 fill-white" /> 4.9
                  </div>
                </div>

                <div className="mb-5 flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-black"
                    style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                  >
                    MJ
                  </div>
                  <div className="space-y-1.5 text-xs text-white/80">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0" /> Melbourne, VIC
                    </p>
                    <p className="flex items-center gap-1.5">
                      <BadgeCheck className="h-3 w-3 shrink-0" /> NDIS screening verified
                    </p>
                    <p className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0" /> Complex care experience
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {["Behaviour support", "1:1 care", "Personal care", "Community access"].map((s) => (
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

              {/* Verification badges row */}
              <div className="flex gap-2 px-3 pt-3 pb-1">
                {[
                  { label: "Police check", color: "var(--brand-green)", bg: "#D1FAE5" },
                  { label: "First aid", color: "#F59E0B", bg: "#FFF7ED" },
                  { label: "NDIS screened", color: "var(--brand-cyan-deep)", bg: "var(--brand-cyan-tint)" },
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

      {/* ── TRUST STRIP ── */}
      <div className="border-y" style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}>
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {TRUST_STRIP.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-3 text-center md:flex-row md:text-left">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "var(--brand-cyan-tint)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "var(--brand-cyan-deep)" }} />
                </span>
                <p className="text-sm font-bold" style={{ color: "var(--brand-ink)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-cyan-tint)", color: "var(--brand-cyan-deep)" }}
            >
              How it works
            </span>
            <h2
              className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              See how it works
            </h2>
            <p className="mx-auto max-w-lg text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              Two paths. One platform. Designed for safer, smarter care matching.
            </p>
          </div>

          <div className="grid gap-10 md:grid-cols-2">
            {/* For Providers */}
            <div
              className="rounded-3xl border p-8"
              style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
            >
              <div className="mb-6 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "var(--brand-cyan-tint)" }}
                >
                  <Users className="h-5 w-5" style={{ color: "var(--brand-cyan-deep)" }} />
                </span>
                <h3 className="text-lg font-black" style={{ color: "var(--brand-ink)" }}>For Providers</h3>
              </div>
              <div className="space-y-5">
                {[
                  { n: "1", t: "Tell us your needs", d: "Describe the participant's care requirements, location, and scheduling needs." },
                  { n: "2", t: "Get matched instantly", d: "Our intelligent system surfaces verified workers who fit your specific requirements." },
                  { n: "3", t: "Hire with confidence", d: "Review credentials, screening results, and experience before making contact." },
                ].map(({ n, t, d }) => (
                  <div key={n} className="flex gap-4">
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                      style={{ background: "var(--brand-cyan-grad)" }}
                    >
                      {n}
                    </span>
                    <div>
                      <p className="mb-0.5 text-sm font-black" style={{ color: "var(--brand-ink)" }}>{t}</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/register"
                className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5"
                style={{ background: "var(--brand-cyan-grad)", boxShadow: "0 6px 20px rgba(43,183,227,0.26)" }}
              >
                Start as a provider <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* For Workers */}
            <div
              className="rounded-3xl border p-8"
              style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
            >
              <div className="mb-6 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "var(--brand-purple-tint)" }}
                >
                  <BadgeCheck className="h-5 w-5" style={{ color: "var(--brand-purple)" }} />
                </span>
                <h3 className="text-lg font-black" style={{ color: "var(--brand-ink)" }}>For Workers</h3>
              </div>
              <div className="space-y-5">
                {[
                  { n: "1", t: "Create your profile", d: "Upload your credentials, screening documents, and care experience in minutes." },
                  { n: "2", t: "Get matched", d: "Be surfaced to providers who genuinely need your specific skills and availability." },
                  { n: "3", t: "Start working", d: "Connect with providers, manage your schedule, and build a sustainable practice." },
                ].map(({ n, t, d }) => (
                  <div key={n} className="flex gap-4">
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                      style={{ background: "var(--brand-purple-grad)" }}
                    >
                      {n}
                    </span>
                    <div>
                      <p className="mb-0.5 text-sm font-black" style={{ color: "var(--brand-ink)" }}>{t}</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/gethired"
                className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5"
                style={{ background: "var(--brand-purple-grad)", boxShadow: "0 6px 20px rgba(151,100,199,0.26)" }}
              >
                Join as a worker <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUE / FEATURE CARDS ── */}
      <section
        id="features"
        className="relative overflow-hidden py-20 md:py-28"
        style={{
          backgroundImage: "url('/hero-image1.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: "rgba(255,255,255,0.82)" }} />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mb-14 max-w-2xl">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}
            >
              Why KizaziHire
            </span>
            <h2
              className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Built for real-world care —{" "}
              <span style={{ color: "var(--brand-muted)", fontWeight: 600 }}>not just job listings.</span>
            </h2>
            <p className="text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              Four pillars that separate KizaziHire from generic hiring platforms.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_CARDS.map(({ icon: Icon, tint, fg, title, desc }) => (
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

      {/* ── PRODUCT PREVIEW ── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-cyan-tint)", color: "var(--brand-cyan-deep)" }}
            >
              Product preview
            </span>
            <h2
              className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              See how it works
            </h2>
            <p className="mx-auto max-w-lg text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              A purpose-built interface designed around compliance, verification, and care outcomes.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {/* Worker profile card */}
            <div
              className="overflow-hidden rounded-3xl border"
              style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
            >
              <div
                className="px-6 py-5 text-white"
                style={{ background: "var(--brand-hero-grad)" }}
              >
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/60">Worker profile</p>
                <p className="text-lg font-black">James Okafor</p>
                <p className="text-xs text-white/70">Brisbane, QLD · Complex care</p>
              </div>
              <div className="space-y-3 p-6">
                {[
                  { label: "NDIS screening", status: "Verified", ok: true },
                  { label: "Police check", status: "Verified", ok: true },
                  { label: "First aid cert.", status: "Current", ok: true },
                  { label: "Certificate III", status: "Uploaded", ok: true },
                ].map(({ label, status, ok }) => (
                  <div key={label} className="flex items-center justify-between">
                    <p className="text-xs font-semibold" style={{ color: "var(--brand-muted)" }}>{label}</p>
                    <span
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
                      style={{
                        backgroundColor: ok ? "#D1FAE5" : "#FEE2E2",
                        color: ok ? "#10B981" : "#EF4444",
                      }}
                    >
                      <CheckCircle2 className="h-3 w-3" /> {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Match results card */}
            <div
              className="overflow-hidden rounded-3xl border"
              style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
            >
              <div className="border-b px-6 py-5" style={{ borderColor: "var(--brand-border)" }}>
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>
                  Match results
                </p>
                <p className="text-lg font-black" style={{ color: "var(--brand-ink)" }}>3 workers matched</p>
              </div>
              <div className="divide-y p-4" style={{ borderColor: "var(--brand-border)" }}>
                {[
                  { initials: "MJ", name: "Maya Johnson", location: "Melbourne", match: "98%", color: "#3ED4E2" },
                  { initials: "JO", name: "James Okafor", location: "Brisbane", match: "94%", color: "#9764C7" },
                  { initials: "AL", name: "Aisha Lim", location: "Sydney", match: "91%", color: "#3A92DF" },
                ].map(({ initials, name, location, match, color }) => (
                  <div key={name} className="flex items-center gap-3 py-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "var(--brand-ink)" }}>{name}</p>
                      <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>{location}</p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-black"
                      style={{ backgroundColor: "var(--brand-cyan-tint)", color: "var(--brand-cyan-deep)" }}
                    >
                      {match}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification card */}
            <div
              className="overflow-hidden rounded-3xl border"
              style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
            >
              <div className="border-b px-6 py-5" style={{ borderColor: "var(--brand-border)" }}>
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>
                  Verification score
                </p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-black" style={{ color: "var(--brand-ink)" }}>92</p>
                  <p className="mb-1 text-sm" style={{ color: "var(--brand-muted)" }}>/100</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { label: "Identity", pct: 100, color: "#10B981" },
                  { label: "Compliance", pct: 90, color: "var(--brand-cyan-deep)" },
                  { label: "Experience", pct: 85, color: "var(--brand-purple)" },
                ].map(({ label, pct, color }) => (
                  <div key={label}>
                    <div className="mb-1.5 flex justify-between">
                      <p className="text-xs font-semibold" style={{ color: "var(--brand-muted)" }}>{label}</p>
                      <p className="text-xs font-black" style={{ color: "var(--brand-ink)" }}>{pct}%</p>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full"
                      style={{ backgroundColor: "var(--brand-surface)" }}
                    >
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
                <div
                  className="mt-2 flex items-center gap-2 rounded-2xl px-4 py-3"
                  style={{ backgroundColor: "var(--brand-mint)" }}
                >
                  <BadgeCheck className="h-4 w-4 shrink-0" style={{ color: "var(--brand-green)" }} />
                  <p className="text-xs font-bold" style={{ color: "#065F46" }}>
                    Meets compliance threshold
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CREDIBILITY ── */}
      <section
        id="why"
        className="py-20 md:py-28"
        style={{ backgroundColor: "white" }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}
            >
              Our commitment
            </span>
            <h2
              className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Built for safer, smarter care matching
            </h2>
            <p className="mx-auto max-w-xl text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              Supporting providers across Australia. Designed for real-world care scenarios.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {CREDIBILITY_BLOCKS.map(({ icon: Icon, fg, tint, title, desc }) => (
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

          {/* Supporting statements */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[
              { stat: "Australia-wide", label: "Provider reach" },
              { stat: "Complex care", label: "Purpose-built focus" },
              { stat: "End-to-end", label: "Credential screening" },
              { stat: "Safer hiring", label: "Every placement" },
            ].map(({ stat, label }) => (
              <div
                key={stat}
                className="rounded-2xl border py-6 text-center"
                style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
              >
                <p
                  className="mb-1 text-xl font-black"
                  style={{
                    background: "var(--brand-hero-grad)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {stat}
                </p>
                <p className="text-xs font-semibold" style={{ color: "var(--brand-muted)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        className="relative overflow-hidden py-24 md:py-32"
        style={{ background: "var(--brand-hero-grad)" }}
      >
        {/* Decorative shapes */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full opacity-20"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full opacity-15"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-white/55">
            Ready to get started?
          </p>
          <h2 className="mb-5 text-3xl font-black leading-tight text-white md:text-[2.7rem]">
            Better matches.{" "}
            <span style={{ opacity: 0.85 }}>Safer hiring.</span>
            <br />
            <span style={{ opacity: 0.85 }}>Stronger care outcomes.</span>
          </h2>
          <p className="mb-10 text-[1.05rem] leading-relaxed text-white/70">
            Join providers and workers using KizaziHire to deliver better care.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 text-sm font-black transition-all hover:-translate-y-1 hover:shadow-xl sm:w-auto"
              style={{ backgroundColor: "white", color: "var(--brand-cyan-deep)" }}
            >
              Find support workers <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/gethired"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border px-8 py-4 text-sm font-black text-white transition-all hover:-translate-y-1 sm:w-auto"
              style={{ borderColor: "rgba(255,255,255,0.32)", backgroundColor: "rgba(255,255,255,0.10)" }}
            >
              Join as a worker
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
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
