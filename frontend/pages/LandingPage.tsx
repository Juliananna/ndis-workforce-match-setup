import { Link } from "react-router-dom";
import {
  Shield,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
  Calendar,
  DollarSign,
  Compass,
  BadgeCheck,
  Clock3,
  Sparkles,
  FileCheck2,
  MapPin,
  ChevronRight,
  Search,
  ClipboardCheck,
  Handshake,
} from "lucide-react";

const STATS = [
  { value: "96,000+", label: "Support workers in reach" },
  { value: "4.9★", label: "Average satisfaction" },
  { value: "< 3 min", label: "To get started" },
  { value: "100%", label: "Verification focused" },
];

const TRUST_SIGNALS = [
  { icon: BadgeCheck, label: "NDIS worker screening" },
  { icon: FileCheck2, label: "Credential verification" },
  { icon: Shield, label: "Safer hiring workflow" },
];

const FEATURES_WORKER = [
  {
    icon: DollarSign,
    bg: "#E0F7FD",
    fg: "#2BB7E3",
    title: "Set Your Own Rates",
    desc: "Stay in control of your pay, availability and the kind of support work you want to do.",
  },
  {
    icon: Calendar,
    bg: "#F3EDFB",
    fg: "#9764C7",
    title: "Total Flexibility",
    desc: "Choose shifts that fit your life — from regular participant support to urgent provider requests.",
  },
  {
    icon: Compass,
    bg: "#E0F7FD",
    fg: "#3A92DF",
    title: "Smart Matching",
    desc: "Get matched with participants and providers by skills, location, interests and care needs.",
  },
];

const FEATURES_EMPLOYER = [
  {
    icon: Shield,
    bg: "#E0F7FD",
    fg: "#2BB7E3",
    title: "Pre-Verified Workers",
    desc: "See workers with the documents, checks and experience needed for safer NDIS support.",
  },
  {
    icon: Users,
    bg: "#F3EDFB",
    fg: "#9764C7",
    title: "Browse & Match",
    desc: "Search by location, skills, availability and support preferences to find a better fit.",
  },
  {
    icon: Zap,
    bg: "#FFF7ED",
    fg: "#F59E0B",
    title: "Emergency Shifts",
    desc: "Post urgent shifts and reach qualified workers when reliability matters most.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: Search,
    bg: "#E0F7FD",
    fg: "#2BB7E3",
    title: "Create your profile",
    desc: "Sign up in minutes. Tell us about your skills, certifications and what kind of work you're looking for.",
  },
  {
    step: "2",
    icon: ClipboardCheck,
    bg: "#F3EDFB",
    fg: "#9764C7",
    title: "Get verified",
    desc: "Upload your credentials and screening documents. Our compliance team reviews them promptly.",
  },
  {
    step: "3",
    icon: Handshake,
    bg: "#E0F7FD",
    fg: "#3A92DF",
    title: "Start connecting",
    desc: "Browse matched roles or respond to provider requests. Build your schedule on your terms.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    role: "Support Worker · Melbourne",
    initials: "SM",
    avatarColor: "#2BB7E3",
    quote:
      "I went from zero clients to a full schedule in two weeks. The matching is genuinely impressive — it actually understands what I'm good at.",
  },
  {
    name: "James T.",
    role: "NDIS Provider · Sydney",
    initials: "JT",
    avatarColor: "#9764C7",
    quote:
      "We filled three emergency shifts within the hour. KizaziHire has been a game changer for our organisation's reliability.",
  },
  {
    name: "Aisha K.",
    role: "Support Worker · Brisbane",
    initials: "AK",
    avatarColor: "#3A92DF",
    quote:
      "I love that I set my own rates and choose who I work with. For the first time in care work, I feel like I have real independence.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen antialiased" style={{ backgroundColor: "var(--brand-canvas)", color: "var(--brand-ink)" }}>

      {/* ── NAV ── */}
      <nav
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ borderColor: "var(--brand-border)", backgroundColor: "rgba(255,255,255,0.90)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/kizazi-hire-logo.png" alt="KizaziHire" className="h-9 w-9 rounded-xl object-cover" />
            <span className="text-[1.1rem] font-black tracking-tight" style={{ color: "var(--brand-ink)" }}>
              KizaziHire
            </span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {[
              { href: "#workers", label: "For Workers" },
              { href: "#employers", label: "For Providers" },
              { href: "#how", label: "How it works" },
              { href: "#testimonials", label: "Reviews" },
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
              className="rounded-xl px-4 py-2 text-sm font-bold transition-colors"
              style={{ color: "var(--brand-muted)" }}
            >
              Log in
            </Link>
            <Link
              to="/gethired"
              className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--brand-cyan-grad)",
                boxShadow: "0 4px 16px rgba(43,183,227,0.35)",
              }}
            >
              Get started <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/hero-image1.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.92) 45%, rgba(248,250,252,0.55) 70%, rgba(248,250,252,0.10) 100%)",
          }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
          {/* Left copy */}
          <div>
            <span
              className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em]"
              style={{
                borderColor: "rgba(43,183,227,0.25)",
                backgroundColor: "rgba(224,247,253,0.7)",
                color: "var(--brand-cyan)",
              }}
            >
              <Shield className="h-3 w-3" />
              Australia's NDIS workforce marketplace
            </span>

            <h1
              className="mb-5 text-[2.6rem] font-black leading-[1.04] tracking-[-0.02em] md:text-[3.6rem]"
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
              not just any worker.
            </h1>

            <p className="mb-8 max-w-xl text-lg leading-relaxed md:text-xl" style={{ color: "var(--brand-muted)" }}>
              KizaziHire connects NDIS providers and support workers through safer verification,
              smarter matching and a more human hiring experience.
            </p>

            <div className="mb-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 rounded-2xl px-7 py-4 font-black text-white transition-all hover:-translate-y-1"
                style={{
                  background: "var(--brand-cyan-grad)",
                  boxShadow: "0 8px 28px rgba(43,183,227,0.35)",
                }}
              >
                Find support workers <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/gethired"
                className="flex items-center justify-center gap-2 rounded-2xl border px-7 py-4 font-black transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{
                  borderColor: "var(--brand-border)",
                  backgroundColor: "white",
                  color: "var(--brand-ink)",
                }}
              >
                <Sparkles className="h-4 w-4" style={{ color: "var(--brand-purple)" }} />
                Join as a worker
              </Link>
            </div>

            <div className="flex flex-wrap gap-3">
              {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-bold shadow-sm"
                  style={{ borderColor: "var(--brand-border)", backgroundColor: "rgba(255,255,255,0.9)", color: "var(--brand-ink)" }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: "var(--brand-cyan)" }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right hero card */}
          <div className="relative mx-auto w-full max-w-[380px]">
            {/* Floating chip — top left */}
            <div
              className="absolute -left-8 top-12 z-10 rounded-2xl p-3.5"
              style={{ backgroundColor: "white", boxShadow: "0 12px 40px rgba(43,183,227,0.15)" }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--brand-cyan-tint)" }}>
                  <CheckCircle2 className="h-5 w-5" style={{ color: "var(--brand-cyan)" }} />
                </span>
                <div>
                  <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>Match found</p>
                  <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Skills & location aligned</p>
                </div>
              </div>
            </div>

            {/* Floating chip — bottom right */}
            <div
              className="absolute -right-6 bottom-12 z-10 rounded-2xl p-3.5"
              style={{ backgroundColor: "white", boxShadow: "0 12px 40px rgba(151,100,199,0.15)" }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--brand-purple-tint)" }}>
                  <Clock3 className="h-5 w-5" style={{ color: "var(--brand-purple)" }} />
                </span>
                <div>
                  <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>Urgent shift ready</p>
                  <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Workers notified</p>
                </div>
              </div>
            </div>

            {/* Main card */}
            <div
              className="overflow-hidden rounded-[2rem] p-2.5"
              style={{ backgroundColor: "white", boxShadow: "0 24px 64px rgba(43,183,227,0.18)" }}
            >
              <div
                className="rounded-[1.6rem] p-6 text-white"
                style={{ background: "var(--brand-hero-grad)" }}
              >
                <div className="mb-7 flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Recommended worker</p>
                    <p className="mt-1 text-[1.4rem] font-black leading-none">Maya Johnson</p>
                  </div>
                  <div
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                  >
                    <Star className="h-3.5 w-3.5 fill-white" /> 4.9
                  </div>
                </div>

                <div className="mb-6 flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-black"
                    style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                  >
                    MJ
                  </div>
                  <div className="space-y-1.5 text-xs text-white/85">
                    <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /> Melbourne, VIC</p>
                    <p className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 shrink-0" /> Screening verified</p>
                    <p className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 shrink-0" /> Complex care exp.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {["Behaviour support", "Night shifts", "Personal care", "Community access"].map((skill) => (
                    <span
                      key={skill}
                      className="rounded-xl px-2.5 py-1.5 text-center text-[11px] font-bold backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="border-y py-10" style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}>
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p
                className="text-3xl font-black md:text-4xl"
                style={{
                  background: "var(--brand-cyan-grad)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {value}
              </p>
              <p className="mt-1 text-sm font-medium" style={{ color: "var(--brand-muted)" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOR WORKERS ── */}
      <section id="workers" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 max-w-2xl">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-cyan-tint)", color: "var(--brand-cyan)" }}
            >
              For Support Workers
            </span>
            <h2 className="mb-4 text-3xl font-black leading-tight md:text-[2.4rem]" style={{ color: "var(--brand-ink)" }}>
              Work on your own terms
            </h2>
            <p className="text-lg leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              Join an NDIS workforce platform built around flexibility, safety and better matching.
            </p>
          </div>

          <div className="mb-10 grid gap-5 md:grid-cols-3">
            {FEATURES_WORKER.map(({ icon: Icon, bg, fg, title, desc }) => (
              <div
                key={title}
                className="rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
              >
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: bg }}
                >
                  <Icon className="h-5 w-5" style={{ color: fg }} />
                </div>
                <h3 className="mb-2 text-base font-black" style={{ color: "var(--brand-ink)" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{desc}</p>
              </div>
            ))}
          </div>

          <Link
            to="/gethired"
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-black text-white transition-all hover:-translate-y-1"
            style={{ background: "var(--brand-cyan-grad)", boxShadow: "0 6px 22px rgba(43,183,227,0.30)" }}
          >
            Apply as a support worker <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── FOR EMPLOYERS ── */}
      <section
        id="employers"
        className="relative py-20 md:py-28"
        style={{
          backgroundImage: "url('/hero%20image.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0.30) 100%)" }}
        />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mb-14 max-w-2xl">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}
            >
              For NDIS Providers
            </span>
            <h2 className="mb-4 text-3xl font-black leading-tight md:text-[2.4rem]" style={{ color: "var(--brand-ink)" }}>
              Find verified talent, fast
            </h2>
            <p className="text-lg leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              Browse pre-screened support workers ready for safer, more reliable participant support.
            </p>
          </div>

          <div className="mb-10 grid gap-5 md:grid-cols-3">
            {FEATURES_EMPLOYER.map(({ icon: Icon, bg, fg, title, desc }) => (
              <div
                key={title}
                className="rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-xl"
                style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-surface)" }}
              >
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: bg }}
                >
                  <Icon className="h-5 w-5" style={{ color: fg }} />
                </div>
                <h3 className="mb-2 text-base font-black" style={{ color: "var(--brand-ink)" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{desc}</p>
              </div>
            ))}
          </div>

          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-black text-white transition-all hover:-translate-y-1"
            style={{ background: "var(--brand-purple-grad)", boxShadow: "0 6px 22px rgba(151,100,199,0.30)" }}
          >
            Register as a provider <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-cyan-tint)", color: "var(--brand-cyan-deep)" }}
            >
              How it works
            </span>
            <h2 className="mb-4 text-3xl font-black leading-tight md:text-[2.4rem]" style={{ color: "var(--brand-ink)" }}>
              Up and running in minutes
            </h2>
            <p className="mx-auto max-w-lg text-lg" style={{ color: "var(--brand-muted)" }}>
              Three simple steps to start connecting with the right people.
            </p>
          </div>

          <div className="relative grid gap-8 md:grid-cols-3">
            <div
              className="absolute left-0 right-0 top-12 hidden border-t-2 border-dashed md:block"
              style={{ borderColor: "var(--brand-border)", marginLeft: "16.6%", marginRight: "16.6%" }}
            />
            {HOW_IT_WORKS.map(({ step, icon: Icon, bg, fg, title, desc }) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                <div
                  className="relative z-10 mb-6 flex h-24 w-24 items-center justify-center rounded-3xl"
                  style={{ backgroundColor: bg, boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}
                >
                  <Icon className="h-8 w-8" style={{ color: fg }} />
                  <span
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black text-white"
                    style={{ background: "var(--brand-cyan-grad)" }}
                  >
                    {step}
                  </span>
                </div>
                <h3 className="mb-2 text-base font-black" style={{ color: "var(--brand-ink)" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-20 md:py-28" style={{ backgroundColor: "white" }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}
            >
              Real stories
            </span>
            <h2 className="mb-3 text-3xl font-black md:text-[2.4rem]" style={{ color: "var(--brand-ink)" }}>
              Loved by workers &amp; providers
            </h2>
            <p style={{ color: "var(--brand-muted)" }}>Thousands of people trust KizaziHire every day.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map(({ name, role, initials, avatarColor, quote }) => (
              <div
                key={name}
                className="flex flex-col rounded-3xl border p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
              >
                <div className="mb-5 flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" style={{ color: "var(--brand-orange)" }} />
                  ))}
                </div>
                <p className="mb-6 flex-1 text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>{name}</p>
                    <p className="text-xs" style={{ color: "var(--brand-muted)" }}>{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20 md:py-28" style={{ background: "var(--brand-hero-grad)" }}>
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-white/60">
            Ready to get started?
          </p>
          <h2 className="mb-5 text-3xl font-black leading-tight text-white md:text-[2.6rem]">
            Build better care teams, today.
          </h2>
          <p className="mb-10 text-lg text-white/75">
            Start with safer matching, clearer verification and a platform that actually feels human.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 font-black transition-all hover:-translate-y-1 hover:shadow-xl sm:w-auto"
              style={{ backgroundColor: "white", color: "var(--brand-cyan-deep)" }}
            >
              Find support workers <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/gethired"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border px-8 py-4 font-black text-white transition-all hover:-translate-y-1 sm:w-auto"
              style={{ borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(255,255,255,0.12)" }}
            >
              <Sparkles className="h-4 w-4" />
              Join as a worker
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t py-10" style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <div className="flex items-center gap-2">
            <img src="/kizazi-hire-logo.png" alt="KizaziHire" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-black" style={{ color: "var(--brand-ink)" }}>KizaziHire</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: "var(--brand-muted)" }}>
            <Link to="/privacy-policy" className="transition-colors hover:text-[var(--brand-ink)]">Privacy Policy</Link>
            <a href="#" className="transition-colors hover:text-[var(--brand-ink)]">Terms of Service</a>
            <a href="#" className="transition-colors hover:text-[var(--brand-ink)]">Support</a>
          </div>
          <p className="text-xs" style={{ color: "var(--brand-muted)" }}>
            © 2025 KizaziHire · Built with care for the NDIS community
          </p>
        </div>
      </footer>
    </div>
  );
}
