import { Link } from "react-router-dom";
import {
  Shield,
  BadgeCheck,
  FileCheck2,
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
  ChevronRight,
  MapPin,
  Star,
  Sparkles,
  Search,
  FileText,
  Video,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "Is KizaziHire a recruitment agency?",
    a: "No. KizaziHire is a hiring platform, not an agency. You find and hire workers directly — we simply make the process faster and more organised. Workers are not employed by KizaziHire.",
  },
  {
    q: "Do providers still interview workers?",
    a: "Yes, absolutely. You review worker profiles and files first, then book interviews directly with the workers you're interested in. You stay in control of every hiring decision.",
  },
  {
    q: "What documents are collected from workers?",
    a: "Qualifications, NDIS worker screening, police check, first aid certificate, and other relevant compliance documents depending on the worker's profile. Workers also complete 2 reference checks before being listed.",
  },
  {
    q: "How quickly can workers start?",
    a: "Many workers on KizaziHire are actively looking for opportunities and available to start within 24–48 hours of you making contact and completing your interview process.",
  },
  {
    q: "Are workers employees or contractors?",
    a: "Workers on KizaziHire are independent contractors. Employment arrangements are agreed directly between the provider and the worker. KizaziHire facilitates the discovery and hiring process.",
  },
  {
    q: "What does KizaziHire cost for providers?",
    a: "KizaziHire offers subscription plans for providers. You can browse worker profiles and review files on a trial basis, then upgrade to access full contact and interview features.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl border"
      style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
    >
      <button
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>{q}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform"
          style={{
            color: "var(--brand-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {open && (
        <div className="border-t px-6 pb-5 pt-4" style={{ borderColor: "var(--brand-border)" }}>
          <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{a}</p>
        </div>
      )}
    </div>
  );
}

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
              { href: "#whats-included", label: "What's included" },
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
            <Link
              to="/register"
              className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--brand-cyan-grad)",
                boxShadow: "0 4px 14px rgba(43,183,227,0.30)",
              }}
            >
              Find Workers <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── SECTION 1: HERO ── */}
      <section className="relative overflow-hidden">
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
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-[400px] w-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #9764C7 0%, transparent 70%)" }}
        />
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
              className="mb-5 text-[2.6rem] font-black leading-[1.06] tracking-[-0.025em] md:text-[3.5rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Hire pre-vetted NDIS{" "}
              <span
                style={{
                  background: "var(--brand-hero-grad)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                support workers
              </span>{" "}
              faster.
            </h1>

            <p
              className="mb-9 max-w-lg text-[1.07rem] leading-[1.75]"
              style={{ color: "var(--brand-muted)" }}
            >
              Access experienced support workers with required qualifications collected, 2 reference checks completed, and files ready to review before interview.
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
                Find Support Workers <ArrowRight className="h-4 w-4" />
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
                Join as a Support Worker
              </Link>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {[
                "Qualifications collected",
                "2 references completed",
                "Files ready to review",
                "Interview directly",
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
            <div
              className="absolute -left-8 top-10 z-10 flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ backgroundColor: "white", boxShadow: "0 10px 40px rgba(43,183,227,0.14)" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--brand-cyan-tint)" }}
              >
                <BadgeCheck className="h-5 w-5" style={{ color: "var(--brand-cyan)" }} />
              </span>
              <div>
                <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>Files ready to review</p>
                <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Before you make contact</p>
              </div>
            </div>

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
                <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>2 references done</p>
                <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Collected before listing</p>
              </div>
            </div>

            <div
              className="overflow-hidden rounded-[2.2rem] p-2.5"
              style={{ backgroundColor: "white", boxShadow: "0 24px 72px rgba(58,146,223,0.14)" }}
            >
              <div
                className="rounded-[1.8rem] p-6 text-white"
                style={{ background: "var(--brand-hero-grad)" }}
              >
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                  Support worker · Complex care
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
                      <CheckCircle2 className="h-3 w-3 shrink-0" /> 2 references completed
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

      {/* ── SECTION 2: HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 md:py-32" style={{ backgroundColor: "white" }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-20 text-center">
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
              Hire support workers in 4 simple steps
            </h2>
            <p className="mx-auto max-w-md text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              No agencies. No delays. Just the right worker, faster.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                Icon: Search,
                step: "01",
                title: "Browse pre-vetted workers",
                note: "We don't list everyone.",
                body: "Access experienced support workers with qualifications collected, references completed, and profiles ready to review.",
              },
              {
                Icon: FileText,
                step: "02",
                title: "Review files instantly",
                note: null,
                body: "Download compliance documents and worker files before making contact. No waiting. No back-and-forth.",
              },
              {
                Icon: Video,
                step: "03",
                title: "Interview directly",
                note: null,
                body: "Book interviews with workers that fit your needs. You stay in control of every hiring decision.",
              },
              {
                Icon: CheckCircle,
                step: "04",
                title: "Hire and get started",
                note: null,
                body: "Many workers are available to start within 24–48 hours of you making contact.",
              },
            ].map(({ Icon, step, title, note, body }, i) => (
              <div key={step} className="relative flex flex-col items-start">
                {i < 3 && (
                  <div
                    className="absolute left-7 top-7 hidden h-0.5 w-[calc(100%+2.5rem)] lg:block"
                    style={{ backgroundColor: "var(--brand-border)" }}
                  />
                )}
                <div
                  className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "var(--brand-cyan-tint)" }}
                >
                  <Icon className="h-6 w-6" style={{ color: "var(--brand-cyan-deep)" }} />
                </div>
                <p className="mb-1 text-xs font-black uppercase tracking-widest" style={{ color: "var(--brand-cyan-deep)" }}>
                  {step}
                </p>
                <h3 className="mb-2 text-base font-black leading-snug" style={{ color: "var(--brand-ink)" }}>
                  {title}
                </h3>
                {note && (
                  <p className="mb-2 text-sm font-black italic" style={{ color: "var(--brand-ink)" }}>
                    {note}
                  </p>
                )}
                <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: WHAT'S INCLUDED IN EVERY PROFILE ── */}
      <section
        id="whats-included"
        className="py-24 md:py-32"
        style={{ backgroundColor: "var(--brand-canvas)" }}
      >
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 text-center">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-cyan-tint)", color: "var(--brand-cyan-deep)" }}
            >
              Worker profiles
            </span>
            <h2
              className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Everything you need to review before hiring
            </h2>
            <p className="mx-auto max-w-xl text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              No chasing documents. No incomplete applications. Review worker information upfront before booking interviews.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                Icon: BadgeCheck,
                title: "Qualifications collected",
                body: "Review certifications and required documentation before making contact.",
              },
              {
                Icon: CheckCircle2,
                title: "2 reference checks completed",
                body: "Workers complete 2 reference checks before being listed on the platform.",
              },
              {
                Icon: Users,
                title: "Experience and support background",
                body: "See previous support experience, skills, and worker information upfront.",
              },
              {
                Icon: FileCheck2,
                title: "Compliance files ready to download",
                body: "Access worker documents and files instantly from their profile.",
              },
              {
                Icon: Zap,
                title: "Availability and readiness to start",
                body: "View workers who are actively looking and ready for opportunities.",
              },
              {
                Icon: Video,
                title: "Direct interview booking",
                body: "Speak directly with workers and assess suitability yourself before hiring.",
              },
            ].map(({ Icon, title, body }) => (
              <div
                key={title}
                className="flex gap-5 rounded-3xl border bg-white p-7"
                style={{ borderColor: "var(--brand-border)" }}
              >
                <div
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "var(--brand-cyan-tint)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "var(--brand-cyan-deep)" }} />
                </div>
                <div>
                  <p className="mb-1 font-black text-sm" style={{ color: "var(--brand-ink)" }}>{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-10 rounded-3xl border p-8 text-center"
            style={{ borderColor: "var(--brand-cyan-deep)", backgroundColor: "var(--brand-cyan-tint)" }}
          >
            <p className="text-lg font-black" style={{ color: "var(--brand-ink)" }}>
              We reduce the screening work — not your control.
            </p>
            <p className="mt-2 text-base" style={{ color: "var(--brand-muted)" }}>
              You still choose who you interview and who you hire.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: WHY PROVIDERS ARE SWITCHING ── */}
      <section id="why-switch" className="py-24 md:py-32" style={{ backgroundColor: "white" }}>
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}
            >
              Why providers are switching
            </span>
            <h2
              className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              NDIS providers are rethinking how they hire
            </h2>
            <p className="mx-auto max-w-xl text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              Traditional hiring is slow, manual, and unpredictable. Providers need a faster, lower-friction way to access qualified support workers.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div
              className="rounded-3xl border p-8"
              style={{ borderColor: "#fca5a5", backgroundColor: "#fff7f7" }}
            >
              <p className="mb-6 text-base font-black" style={{ color: "#991b1b" }}>Traditional hiring</p>
              <ul className="space-y-4">
                {[
                  "Post job ads and wait for applications",
                  "Spend hours screening candidates",
                  "Chase interviews and no-shows",
                  "Review incomplete applications",
                  "Repeat the process if it fails",
                  "Delays impact clients and teams",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-xs font-black"
                      style={{ backgroundColor: "#ef4444" }}
                    >
                      ✕
                    </span>
                    <span className="text-sm leading-relaxed" style={{ color: "#7f1d1d" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-3xl border p-8"
              style={{ borderColor: "var(--brand-cyan-deep)", backgroundColor: "var(--brand-cyan-tint)" }}
            >
              <p className="mb-6 text-base font-black" style={{ color: "var(--brand-cyan-deep)" }}>KizaziHire</p>
              <ul className="space-y-4">
                {[
                  "Browse pre-vetted support workers",
                  "Qualifications and references already collected",
                  "Review files before making contact",
                  "Interview workers directly",
                  "Reduce recruitment admin significantly",
                  "Hire faster with more confidence",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-xs font-black"
                      style={{ backgroundColor: "var(--brand-cyan-deep)" }}
                    >
                      ✓
                    </span>
                    <span className="text-sm leading-relaxed font-medium" style={{ color: "var(--brand-ink)" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className="mt-10 rounded-3xl border p-8 text-center"
            style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-canvas)" }}
          >
            <p className="text-xl font-black" style={{ color: "var(--brand-ink)" }}>
              Hiring shouldn't take weeks.
            </p>
            <p className="mt-2 text-base" style={{ color: "var(--brand-muted)" }}>
              The right systems make hiring faster, simpler, and more reliable.
            </p>
            <Link
              to="/register"
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-black text-white transition-all hover:-translate-y-0.5"
              style={{ background: "var(--brand-cyan-grad)", boxShadow: "0 6px 20px rgba(43,183,227,0.26)" }}
            >
              Find Support Workers <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: SOCIAL PROOF / TRUST ── */}
      <section
        id="trust"
        className="py-24 md:py-32"
        style={{ backgroundColor: "var(--brand-canvas)" }}
      >
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 text-center">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}
            >
              Trust &amp; compliance
            </span>
            <h2
              className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Built for NDIS compliance
            </h2>
            <p className="mx-auto max-w-xl text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              We don't list everyone. Workers are screened before appearing on the platform.
            </p>
          </div>

          {/* Trust statement */}
          <div
            className="mb-10 rounded-3xl border p-8 text-center"
            style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
          >
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--brand-cyan-tint)" }}>
              <Shield className="h-7 w-7" style={{ color: "var(--brand-cyan-deep)" }} />
            </div>
            <p className="text-2xl font-black" style={{ color: "var(--brand-ink)" }}>
              "We don't list everyone."
            </p>
            <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              Workers on KizaziHire have gone through a qualification and reference collection process before their profile is made visible to providers. This keeps the pool relevant, vetted, and trustworthy.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: BadgeCheck,
                tint: "var(--brand-cyan-tint)",
                fg: "var(--brand-cyan-deep)",
                title: "Qualifications verified",
                body: "Workers upload certifications, screening documents, and compliance files during onboarding.",
              },
              {
                Icon: MessageSquare,
                tint: "var(--brand-purple-tint)",
                fg: "var(--brand-purple)",
                title: "2 references completed",
                body: "Every listed worker has completed 2 professional reference checks before being visible to providers.",
              },
              {
                Icon: FileCheck2,
                tint: "#D1FAE5",
                fg: "#10B981",
                title: "NDIS-aligned screening",
                body: "The platform is built around NDIS documentation and compliance requirements from the ground up.",
              },
              {
                Icon: Users,
                tint: "#FFF7ED",
                fg: "#F59E0B",
                title: "You control who you hire",
                body: "KizaziHire surfaces pre-screened workers. You interview and make every hiring decision yourself.",
              },
              {
                Icon: Shield,
                tint: "var(--brand-cyan-tint)",
                fg: "var(--brand-cyan-deep)",
                title: "Built for complex care",
                body: "Designed for providers supporting participants with complex needs — not just generic job placements.",
              },
              {
                Icon: CheckCircle2,
                tint: "var(--brand-purple-tint)",
                fg: "var(--brand-purple)",
                title: "Workers ready to start sooner",
                body: "Pre-screening removes weeks of admin from your hiring process, so support can begin faster.",
              },
            ].map(({ Icon, tint, fg, title, body }) => (
              <div
                key={title}
                className="flex gap-5 rounded-3xl border bg-white p-7"
                style={{ borderColor: "var(--brand-border)" }}
              >
                <div
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: tint }}
                >
                  <Icon className="h-5 w-5" style={{ color: fg }} />
                </div>
                <div>
                  <p className="mb-1 font-black text-sm" style={{ color: "var(--brand-ink)" }}>{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: FOR SUPPORT WORKERS ── */}
      <section id="for-workers" className="py-24 md:py-32" style={{ backgroundColor: "white" }}>
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

            <div>
              <span
                className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
                style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}
              >
                For Support Workers
              </span>
              <h2
                className="mb-5 text-3xl font-black leading-tight md:text-[2.3rem]"
                style={{ color: "var(--brand-ink)" }}
              >
                Find support work without the usual hassle
              </h2>
              <p className="mb-10 text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                Create your profile, upload your documents, and get in front of providers who are actively hiring.
              </p>

              <div className="space-y-7">
                {[
                  {
                    title: "Stop applying over and over",
                    body: "Your profile stays visible to providers looking for support workers right now.",
                  },
                  {
                    title: "Show your experience upfront",
                    body: "Upload your qualifications, references, and worker information in one place.",
                  },
                  {
                    title: "Get discovered by providers",
                    body: "Providers review your profile and contact you directly for interviews.",
                  },
                  {
                    title: "Be ready for opportunities faster",
                    body: "Complete your profile once and be prepared when new opportunities become available.",
                  },
                ].map(({ title, body }) => (
                  <div key={title} className="flex gap-4">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: "var(--brand-purple)" }}
                    />
                    <div>
                      <p className="mb-1 font-black" style={{ color: "var(--brand-ink)" }}>{title}</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <p className="mb-5 text-xl font-black" style={{ color: "var(--brand-ink)" }}>
                  Less chasing. More opportunity.
                </p>
                <Link
                  to="/gethired"
                  className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-black text-white transition-all hover:-translate-y-0.5"
                  style={{ background: "var(--brand-purple-grad)", boxShadow: "0 6px 20px rgba(151,100,199,0.28)" }}
                >
                  Join as a Support Worker <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {[
                {
                  Icon: Users,
                  label: "Visible to hiring providers",
                  sub: "Actively hiring organisations can find and review your profile",
                  tint: "var(--brand-purple-tint)",
                  fg: "var(--brand-purple)",
                },
                {
                  Icon: FileCheck2,
                  label: "Documents in one place",
                  sub: "Upload qualifications and references once — providers access them directly",
                  tint: "var(--brand-cyan-tint)",
                  fg: "var(--brand-cyan-deep)",
                },
                {
                  Icon: Zap,
                  label: "Ready when opportunities arise",
                  sub: "No repeated applications. Your profile works for you in the background",
                  tint: "#fef9ec",
                  fg: "#b45309",
                },
              ].map(({ Icon, label, sub, tint, fg }) => (
                <div
                  key={label}
                  className="flex items-start gap-5 rounded-2xl border p-6"
                  style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-canvas)" }}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: tint }}
                  >
                    <Icon className="h-5 w-5" style={{ color: fg }} />
                  </div>
                  <div>
                    <p className="mb-1 font-black text-sm" style={{ color: "var(--brand-ink)" }}>{label}</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{sub}</p>
                  </div>
                </div>
              ))}

              <div
                className="rounded-2xl border p-6"
                style={{ borderColor: "var(--brand-purple)", backgroundColor: "var(--brand-purple-tint)" }}
              >
                <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>
                  You're not inventory.
                </p>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                  KizaziHire is built so providers find you — not the other way around.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 7: FAQ ── */}
      <section id="faq" className="py-24 md:py-32" style={{ backgroundColor: "var(--brand-canvas)" }}>
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-14 text-center">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--brand-cyan-tint)", color: "var(--brand-cyan-deep)" }}
            >
              FAQ
            </span>
            <h2
              className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Common questions
            </h2>
            <p className="mx-auto max-w-lg text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              Everything you need to know before getting started.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>

          <div className="mt-10 rounded-3xl border p-8 text-center" style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}>
            <div className="mb-3 flex justify-center">
              <HelpCircle className="h-8 w-8" style={{ color: "var(--brand-cyan-deep)" }} />
            </div>
            <p className="text-base font-black" style={{ color: "var(--brand-ink)" }}>Still have questions?</p>
            <p className="mt-2 text-sm" style={{ color: "var(--brand-muted)" }}>
              Reach out and we'll get back to you.
            </p>
            <Link
              to="/contact"
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5"
              style={{ background: "var(--brand-cyan-grad)" }}
            >
              Get in touch <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 8: FINAL CTA ── */}
      <section
        className="relative overflow-hidden py-24 md:py-32"
        style={{ background: "var(--brand-hero-grad)" }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full opacity-20"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full opacity-15"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-black leading-tight text-white md:text-[2.7rem]">
            Hire support workers faster.
          </h2>
          <p className="mb-3 text-lg font-semibold text-white/80">
            Pre-vetted workers. Files ready to review. Interview directly and hire with confidence.
          </p>
          <p className="mb-10 text-base text-white/60">
            Join NDIS providers across Australia using KizaziHire.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 text-sm font-black transition-all hover:-translate-y-1 hover:shadow-xl sm:w-auto"
              style={{ backgroundColor: "white", color: "var(--brand-cyan-deep)" }}
            >
              Find Support Workers <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/gethired"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border px-8 py-4 text-sm font-black text-white transition-all hover:-translate-y-1 sm:w-auto"
              style={{ borderColor: "rgba(255,255,255,0.32)", backgroundColor: "rgba(255,255,255,0.10)" }}
            >
              Join as a Support Worker
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
            <Link to="/contact" className="transition-colors hover:text-[var(--brand-ink)]">Contact</Link>
            <a href="#faq" className="transition-colors hover:text-[var(--brand-ink)]">FAQ</a>
          </div>
          <p className="text-xs" style={{ color: "var(--brand-muted)" }}>
            © 2025 KizaziHire · Built for the NDIS community
          </p>
        </div>
      </footer>
    </div>
  );
}
