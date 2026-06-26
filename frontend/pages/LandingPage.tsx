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
  FileSpreadsheet,
  Brain,
  Download,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

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
      className="overflow-hidden rounded-2xl border transition-all duration-300"
      style={{
        borderColor: open ? "var(--brand-cyan-deep)" : "var(--brand-border)",
        backgroundColor: "white",
        boxShadow: open ? "0 4px 24px rgba(58,146,223,0.10)" : "none",
      }}
    >
      <button
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>{q}</span>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300"
          style={{
            backgroundColor: open ? "var(--brand-cyan-tint)" : "var(--brand-surface)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <ChevronDown className="h-4 w-4" style={{ color: open ? "var(--brand-cyan-deep)" : "var(--brand-muted)" }} />
        </span>
      </button>
      <div
        style={{
          maxHeight: open ? "200px" : "0",
          overflow: "hidden",
          transition: "max-height 0.35s ease",
        }}
      >
        <div className="border-t px-6 pb-5 pt-4" style={{ borderColor: "var(--brand-border)" }}>
          <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen antialiased" style={{ backgroundColor: "var(--brand-canvas)", color: "var(--brand-ink)" }}>

      {/* ── NAV ── */}
      <nav
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ borderColor: "var(--brand-border)", backgroundColor: "rgba(255,255,255,0.88)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/kizazi-hire-logo.png" alt="KizaziHire" className="h-9 w-9 rounded-xl object-cover transition-transform duration-300 group-hover:scale-105" />
            <span className="text-[1.05rem] font-black tracking-tight" style={{ color: "var(--brand-ink)" }}>
              KizaziHire
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {[
              { href: "#how-it-works", label: "How it works" },
              { href: "#whats-included", label: "What's included" },
              { href: "#resume-builder", label: "Resume Builder" },
              { href: "#faq", label: "FAQ" },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="relative text-sm font-semibold transition-colors duration-200 after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:transition-all after:duration-300 hover:after:w-full"
                style={{ color: "var(--brand-muted)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--brand-ink)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--brand-muted)")}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-200 hover:bg-[var(--brand-surface)]"
              style={{ color: "var(--brand-muted)" }}
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
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
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #eef9fe 0%, #f4eefb 45%, #edf3ff 100%)" }} />
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/hero-image.png')" }} />

        {/* Animated blobs */}
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[700px] w-[700px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(62,212,226,0.18) 0%, transparent 65%)",
            animation: "pulse 8s ease-in-out infinite",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(151,100,199,0.14) 0%, transparent 70%)",
            animation: "pulse 10s ease-in-out infinite 2s",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-20 right-1/3 h-64 w-64 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(58,146,223,0.10) 0%, transparent 70%)",
            animation: "pulse 7s ease-in-out infinite 1s",
          }}
        />

        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#3A92DF" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <style>{`
          @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.75; } }
          @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
          @keyframes floatAlt { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(8px); } }
          @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        `}</style>

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 py-24 md:grid-cols-[1.1fr_0.9fr] md:py-36">
          {/* Left */}
          <div>
            <div
              className="mb-7 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em]"
              style={{
                borderColor: "rgba(43,183,227,0.25)",
                backgroundColor: "rgba(224,247,253,0.8)",
                color: "var(--brand-cyan-deep)",
                animation: "float 6s ease-in-out infinite",
              }}
            >
              <Shield className="h-3.5 w-3.5" />
              NDIS workforce platform · Australia
            </div>

            <h1
              className="mb-6 text-[2.6rem] font-black leading-[1.06] tracking-[-0.03em] md:text-[3.6rem]"
              style={{ color: "var(--brand-ink)" }}
            >
              Hire Pre-Vetted NDIS{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #3ED4E2, #3A92DF, #9764C7, #3A92DF, #3ED4E2)",
                  backgroundSize: "300% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "shimmer 5s linear infinite",
                }}
              >
                Support Workers
              </span>{" "}
              Faster.
            </h1>

            <p className="mb-9 max-w-lg text-[1.07rem] leading-[1.8]" style={{ color: "var(--brand-ink)" }}>
              Access experienced support workers with required qualifications collected, 2 reference checks completed, and files ready to review before interview.
            </p>

            <div className="mb-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="group flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-sm font-black text-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
                style={{ background: "var(--brand-hero-grad)", boxShadow: "0 8px 28px rgba(43,183,227,0.3)" }}
              >
                Find Support Workers
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/gethired"
                className="flex items-center justify-center gap-2 rounded-2xl border px-7 py-4 text-sm font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[var(--brand-cyan-deep)]"
                style={{ borderColor: "var(--brand-border)", backgroundColor: "white", color: "var(--brand-ink)" }}
              >
                Join as a Support Worker
              </Link>
              <Link
                to="/resume-builder"
                className="flex items-center justify-center gap-2 rounded-2xl border px-7 py-4 text-sm font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                style={{ borderColor: "rgba(151,100,199,0.4)", backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}
              >
                <FileSpreadsheet className="h-4 w-4" /> Build My Resume
              </Link>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {[
                "Qualifications collected",
                "2 references completed",
                "Files ready to review",
                "Interview directly",
              ].map((label, i) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold backdrop-blur-sm"
                  style={{
                    borderColor: "var(--brand-border)",
                    backgroundColor: "rgba(255,255,255,0.9)",
                    color: "var(--brand-muted)",
                    animationDelay: `${i * 100}ms`,
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--brand-green)" }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: floating card */}
          <div className="relative mx-auto w-full max-w-[400px]" style={{ animation: "float 7s ease-in-out infinite" }}>
            {/* Chip 1 */}
            <div
              className="absolute -left-10 top-8 z-10 flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                backgroundColor: "white",
                boxShadow: "0 12px 40px rgba(43,183,227,0.18)",
                animation: "floatAlt 5s ease-in-out infinite",
              }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--brand-cyan-tint)" }}>
                <BadgeCheck className="h-5 w-5" style={{ color: "var(--brand-cyan-deep)" }} />
              </span>
              <div>
                <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>Files ready to review</p>
                <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Before you make contact</p>
              </div>
            </div>

            {/* Chip 2 */}
            <div
              className="absolute -right-8 bottom-14 z-10 flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                backgroundColor: "white",
                boxShadow: "0 12px 40px rgba(151,100,199,0.18)",
                animation: "float 6s ease-in-out infinite 1.5s",
              }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--brand-purple-tint)" }}>
                <Sparkles className="h-4 w-4" style={{ color: "var(--brand-purple)" }} />
              </span>
              <div>
                <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>2 references done</p>
                <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>Collected before listing</p>
              </div>
            </div>

            {/* Main card */}
            <div
              className="overflow-hidden rounded-[2.2rem] p-2.5"
              style={{ backgroundColor: "white", boxShadow: "0 32px 80px rgba(58,146,223,0.18), 0 8px 24px rgba(0,0,0,0.06)" }}
            >
              <div className="rounded-[1.8rem] p-6 text-white" style={{ background: "var(--brand-hero-grad)" }}>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Support worker · Complex care</p>
                <div className="mb-5 flex items-start justify-between">
                  <p className="text-[1.45rem] font-black leading-tight">Maya Johnson</p>
                  <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                    <Star className="h-3 w-3 fill-white" /> 4.9
                  </div>
                </div>
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-black" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>MJ</div>
                  <div className="space-y-1.5 text-xs text-white/80">
                    <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" /> Melbourne, VIC</p>
                    <p className="flex items-center gap-1.5"><BadgeCheck className="h-3 w-3 shrink-0" /> NDIS screening verified</p>
                    <p className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 shrink-0" /> 2 references completed</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["Behaviour support", "1:1 care", "Personal care", "Community access"].map((s) => (
                    <span key={s} className="rounded-xl px-2.5 py-1.5 text-center text-[10px] font-bold" style={{ backgroundColor: "rgba(255,255,255,0.16)" }}>{s}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 px-3 pb-1 pt-3">
                {[
                  { label: "Police check", color: "var(--brand-green)", bg: "#D1FAE5" },
                  { label: "First aid", color: "#F59E0B", bg: "#FFF7ED" },
                  { label: "NDIS screened", color: "var(--brand-cyan-deep)", bg: "var(--brand-cyan-tint)" },
                ].map(({ label, color, bg }) => (
                  <span key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold" style={{ backgroundColor: bg, color }}>
                    <BadgeCheck className="h-3 w-3" />{label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: HOW IT WORKS ── */}
      <section id="how-it-works" className="relative overflow-hidden py-28 md:py-36" style={{ backgroundColor: "white" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(62,212,226,0.06) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-6xl px-6">
          <Reveal className="mb-20 text-center">
            <span className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest" style={{ backgroundColor: "var(--brand-cyan-tint)", color: "var(--brand-cyan-deep)" }}>
              How it works
            </span>
            <h2 className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]" style={{ color: "var(--brand-ink)" }}>
              Hire support workers in 4 simple steps
            </h2>
            <p className="mx-auto max-w-md text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              No agencies. No delays. Just the right worker, faster.
            </p>
          </Reveal>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: Search, step: "01", title: "Browse pre-vetted workers", note: "We don't list everyone.", body: "Access experienced support workers with qualifications collected, references completed, and profiles ready to review." },
              { Icon: FileText, step: "02", title: "Review files instantly", note: null, body: "Download compliance documents and worker files before making contact. No waiting. No back-and-forth." },
              { Icon: Video, step: "03", title: "Interview directly", note: null, body: "Book interviews with workers that fit your needs. You stay in control of every hiring decision." },
              { Icon: CheckCircle, step: "04", title: "Hire and get started", note: null, body: "Many workers are available to start within 24–48 hours of you making contact." },
            ].map(({ Icon, step, title, note, body }, i) => (
              <Reveal key={step} delay={i * 100}>
                <div className="group relative flex flex-col items-start">
                  {/* Step connector line */}
                  {i < 3 && (
                    <div className="absolute left-7 top-7 hidden h-px w-[calc(100%+2.5rem)] lg:block" style={{ background: "linear-gradient(90deg, var(--brand-cyan-deep) 0%, var(--brand-border) 100%)", opacity: 0.3 }} />
                  )}
                  <div
                    className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg"
                    style={{ background: "linear-gradient(135deg, var(--brand-cyan-tint) 0%, rgba(58,146,223,0.12) 100%)" }}
                  >
                    <Icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" style={{ color: "var(--brand-cyan-deep)" }} />
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: "var(--brand-cyan-grad)" }}>{i + 1}</div>
                  </div>
                  <p className="mb-1 text-xs font-black uppercase tracking-widest" style={{ color: "var(--brand-cyan-deep)" }}>{step}</p>
                  <h3 className="mb-2 text-base font-black leading-snug" style={{ color: "var(--brand-ink)" }}>{title}</h3>
                  {note && <p className="mb-2 text-sm font-black italic" style={{ color: "var(--brand-cyan-deep)" }}>{note}</p>}
                  <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: WHAT'S INCLUDED ── */}
      <section id="whats-included" className="relative overflow-hidden py-28 md:py-36" style={{ backgroundColor: "var(--brand-canvas)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 50% at 100% 50%, rgba(58,146,223,0.07) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-5xl px-6">
          <Reveal className="mb-14 text-center">
            <span className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest" style={{ backgroundColor: "var(--brand-cyan-tint)", color: "var(--brand-cyan-deep)" }}>
              Worker profiles
            </span>
            <h2 className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]" style={{ color: "var(--brand-ink)" }}>
              Everything you need to review before hiring
            </h2>
            <p className="mx-auto max-w-xl text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              No chasing documents. No incomplete applications. Review worker information upfront before booking interviews.
            </p>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { Icon: BadgeCheck, title: "Qualifications collected", body: "Review certifications and required documentation before making contact." },
              { Icon: CheckCircle2, title: "2 reference checks completed", body: "Workers complete 2 reference checks before being listed on the platform." },
              { Icon: Users, title: "Experience and support background", body: "See previous support experience, skills, and worker information upfront." },
              { Icon: FileCheck2, title: "Compliance files ready to download", body: "Access worker documents and files instantly from their profile." },
              { Icon: Zap, title: "Availability and readiness to start", body: "View workers who are actively looking and ready for opportunities." },
              { Icon: Video, title: "Direct interview booking", body: "Speak directly with workers and assess suitability yourself before hiring." },
            ].map(({ Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div
                  className="group flex gap-5 rounded-3xl border bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{ borderColor: "var(--brand-border)" }}
                >
                  <div
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
                    style={{ background: "linear-gradient(135deg, var(--brand-cyan-tint) 0%, rgba(62,212,226,0.15) 100%)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "var(--brand-cyan-deep)" }} />
                  </div>
                  <div>
                    <p className="mb-1 font-black text-sm" style={{ color: "var(--brand-ink)" }}>{title}</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div
              className="mt-10 overflow-hidden rounded-3xl p-px"
              style={{ background: "var(--brand-cyan-grad)" }}
            >
              <div className="rounded-3xl p-8 text-center" style={{ backgroundColor: "var(--brand-cyan-tint)" }}>
                <p className="text-lg font-black" style={{ color: "var(--brand-ink)" }}>
                  We reduce the screening work — not your control.
                </p>
                <p className="mt-2 text-base" style={{ color: "var(--brand-muted)" }}>
                  You still choose who you interview and who you hire.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SECTION 4: WHY PROVIDERS ARE SWITCHING ── */}
      <section id="why-switch" className="relative overflow-hidden py-28 md:py-36" style={{ backgroundColor: "white" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 0% 50%, rgba(151,100,199,0.05) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-5xl px-6">
          <Reveal className="mb-16 text-center">
            <span className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest" style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}>
              Why providers are switching
            </span>
            <h2 className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]" style={{ color: "var(--brand-ink)" }}>
              NDIS providers are rethinking how they hire
            </h2>
            <p className="mx-auto max-w-xl text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              Traditional hiring is slow, manual, and unpredictable. Providers need a faster, lower-friction way to access qualified support workers.
            </p>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-3xl border p-8" style={{ borderColor: "#fca5a5", backgroundColor: "#fff7f7" }}>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-black" style={{ backgroundColor: "#ef4444" }}>✕</div>
                  <p className="text-base font-black" style={{ color: "#991b1b" }}>Traditional hiring</p>
                </div>
                <ul className="space-y-3.5">
                  {[
                    "Post job ads and wait for applications",
                    "Spend hours screening candidates",
                    "Chase interviews and no-shows",
                    "Review incomplete applications",
                    "Repeat the process if it fails",
                    "Delays impact clients and teams",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-xs font-black" style={{ backgroundColor: "#fca5a5" }}>✕</span>
                      <span className="text-sm leading-relaxed" style={{ color: "#7f1d1d" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="h-full overflow-hidden rounded-3xl p-px" style={{ background: "var(--brand-cyan-grad)" }}>
                <div className="h-full rounded-[calc(1.5rem-1px)] p-8" style={{ backgroundColor: "var(--brand-cyan-tint)" }}>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-black" style={{ backgroundColor: "var(--brand-cyan-deep)" }}>✓</div>
                    <p className="text-base font-black" style={{ color: "var(--brand-cyan-deep)" }}>KizaziHire</p>
                  </div>
                  <ul className="space-y-3.5">
                    {[
                      "Browse pre-vetted support workers",
                      "Qualifications and references already collected",
                      "Review files before making contact",
                      "Interview workers directly",
                      "Reduce recruitment admin significantly",
                      "Hire faster with more confidence",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-xs font-black" style={{ backgroundColor: "var(--brand-cyan-deep)" }}>✓</span>
                        <span className="text-sm leading-relaxed font-medium" style={{ color: "var(--brand-ink)" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={150}>
            <div className="mt-10 rounded-3xl border p-8 text-center" style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-canvas)" }}>
              <p className="text-xl font-black" style={{ color: "var(--brand-ink)" }}>Hiring shouldn't take weeks.</p>
              <p className="mt-2 text-base" style={{ color: "var(--brand-muted)" }}>The right systems make hiring faster, simpler, and more reliable.</p>
              <Link
                to="/register"
                className="group mt-6 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                style={{ background: "var(--brand-cyan-grad)", boxShadow: "0 6px 20px rgba(43,183,227,0.26)" }}
              >
                Find Support Workers <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SECTION 5: TRUST ── */}
      <section id="trust" className="relative overflow-hidden py-28 md:py-36" style={{ backgroundColor: "var(--brand-canvas)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 60% at 50% 100%, rgba(62,212,226,0.07) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-5xl px-6">
          <Reveal className="mb-14 text-center">
            <span className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest" style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}>
              Trust &amp; compliance
            </span>
            <h2 className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]" style={{ color: "var(--brand-ink)" }}>
              Built for NDIS compliance
            </h2>
            <p className="mx-auto max-w-xl text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              We don't list everyone. Workers are screened before appearing on the platform.
            </p>
          </Reveal>

          <Reveal delay={50}>
            <div
              className="mb-10 overflow-hidden rounded-3xl p-px"
              style={{ background: "linear-gradient(135deg, rgba(62,212,226,0.4) 0%, rgba(58,146,223,0.4) 50%, rgba(151,100,199,0.4) 100%)" }}
            >
              <div className="rounded-[calc(1.5rem-1px)] p-10 text-center" style={{ backgroundColor: "white" }}>
                <div
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: "var(--brand-hero-grad)" }}
                >
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <p className="text-2xl font-black" style={{ color: "var(--brand-ink)" }}>"We don't list everyone."</p>
                <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                  Workers on KizaziHire have gone through a qualification and reference collection process before their profile is made visible to providers. This keeps the pool relevant, vetted, and trustworthy.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: BadgeCheck, tint: "var(--brand-cyan-tint)", fg: "var(--brand-cyan-deep)", title: "Qualifications verified", body: "Workers upload certifications, screening documents, and compliance files during onboarding." },
              { Icon: MessageSquare, tint: "var(--brand-purple-tint)", fg: "var(--brand-purple)", title: "2 references completed", body: "Every listed worker has completed 2 professional reference checks before being visible to providers." },
              { Icon: FileCheck2, tint: "#D1FAE5", fg: "#10B981", title: "NDIS-aligned screening", body: "The platform is built around NDIS documentation and compliance requirements from the ground up." },
              { Icon: Users, tint: "#FFF7ED", fg: "#F59E0B", title: "You control who you hire", body: "KizaziHire surfaces pre-screened workers. You interview and make every hiring decision yourself." },
              { Icon: Shield, tint: "var(--brand-cyan-tint)", fg: "var(--brand-cyan-deep)", title: "Built for complex care", body: "Designed for providers supporting participants with complex needs — not just generic job placements." },
              { Icon: CheckCircle2, tint: "var(--brand-purple-tint)", fg: "var(--brand-purple)", title: "Workers ready to start sooner", body: "Pre-screening removes weeks of admin from your hiring process, so support can begin faster." },
            ].map(({ Icon, tint, fg, title, body }, i) => (
              <Reveal key={title} delay={i * 70}>
                <div
                  className="group flex gap-4 rounded-3xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{ borderColor: "var(--brand-border)" }}
                >
                  <div
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
                    style={{ backgroundColor: tint }}
                  >
                    <Icon className="h-5 w-5" style={{ color: fg }} />
                  </div>
                  <div>
                    <p className="mb-1 font-black text-sm" style={{ color: "var(--brand-ink)" }}>{title}</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: FOR SUPPORT WORKERS ── */}
      <section id="for-workers" className="relative overflow-hidden py-28 md:py-36" style={{ backgroundColor: "white" }}>
        <div className="pointer-events-none absolute -right-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle, rgba(151,100,199,0.08) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-5xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <div>
                <span className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest" style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}>
                  For Support Workers
                </span>
                <h2 className="mb-5 text-3xl font-black leading-tight md:text-[2.3rem]" style={{ color: "var(--brand-ink)" }}>
                  Find support work without the usual hassle
                </h2>
                <p className="mb-10 text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                  Create your profile, upload your documents, and get in front of providers who are actively hiring.
                </p>

                <div className="space-y-6">
                  {[
                    { title: "Stop applying over and over", body: "Your profile stays visible to providers looking for support workers right now." },
                    { title: "Show your experience upfront", body: "Upload your qualifications, references, and worker information in one place." },
                    { title: "Get discovered by providers", body: "Providers review your profile and contact you directly for interviews." },
                    { title: "Be ready for opportunities faster", body: "Complete your profile once and be prepared when new opportunities become available." },
                  ].map(({ title, body }, i) => (
                    <div key={title} className="group flex gap-4" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110" style={{ background: "var(--brand-purple-grad)" }}>
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="mb-0.5 font-black" style={{ color: "var(--brand-ink)" }}>{title}</p>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10">
                  <p className="mb-5 text-xl font-black" style={{ color: "var(--brand-ink)" }}>Less chasing. More opportunity.</p>
                  <Link
                    to="/gethired"
                    className="group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                    style={{ background: "var(--brand-purple-grad)", boxShadow: "0 6px 20px rgba(151,100,199,0.28)" }}
                  >
                    Join as a Support Worker <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="flex flex-col gap-4">
                {[
                  { Icon: Users, label: "Visible to hiring providers", sub: "Actively hiring organisations can find and review your profile", tint: "var(--brand-purple-tint)", fg: "var(--brand-purple)" },
                  { Icon: FileCheck2, label: "Documents in one place", sub: "Upload qualifications and references once — providers access them directly", tint: "var(--brand-cyan-tint)", fg: "var(--brand-cyan-deep)" },
                  { Icon: Zap, label: "Ready when opportunities arise", sub: "No repeated applications. Your profile works for you in the background", tint: "#fef9ec", fg: "#b45309" },
                ].map(({ Icon, label, sub, tint, fg }, i) => (
                  <div
                    key={label}
                    className="group flex items-start gap-5 rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-canvas)", transitionDelay: `${i * 60}ms` }}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: tint }}>
                      <Icon className="h-5 w-5" style={{ color: fg }} />
                    </div>
                    <div>
                      <p className="mb-1 font-black text-sm" style={{ color: "var(--brand-ink)" }}>{label}</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{sub}</p>
                    </div>
                  </div>
                ))}

                <div
                  className="overflow-hidden rounded-2xl p-px"
                  style={{ background: "var(--brand-purple-grad)" }}
                >
                  <div className="rounded-[calc(1rem-1px)] p-6" style={{ backgroundColor: "var(--brand-purple-tint)" }}>
                    <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>You're not inventory.</p>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                      KizaziHire is built so providers find you — not the other way around.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── SECTION 6B: RESUME BUILDER ── */}
      <section id="resume-builder" className="relative overflow-hidden py-28 md:py-36" style={{ backgroundColor: "var(--brand-canvas)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 55% 50% at 50% 100%, rgba(151,100,199,0.07) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-5xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

            <Reveal delay={80}>
              <div className="flex flex-col gap-4">
                <div
                  className="group flex items-start gap-5 rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--brand-purple-tint)" }}>
                    <FileSpreadsheet className="h-5 w-5" style={{ color: "var(--brand-purple)" }} />
                  </div>
                  <div>
                    <p className="mb-1 font-black text-sm" style={{ color: "var(--brand-ink)" }}>Answer a few questions</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>Walk through 8 quick steps — your experience, skills, availability, checks, and qualifications. No blank page staring back at you.</p>
                  </div>
                </div>

                <div
                  className="group flex items-start gap-5 rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--brand-cyan-tint)" }}>
                    <Brain className="h-5 w-5" style={{ color: "var(--brand-cyan-deep)" }} />
                  </div>
                  <div>
                    <p className="mb-1 font-black text-sm" style={{ color: "var(--brand-ink)" }}>AI writes your resume content</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>Get a professional summary, key achievement bullet points, and a bio — written in NDIS-aligned Australian English. No writing experience needed.</p>
                  </div>
                </div>

                <div
                  className="group flex items-start gap-5 rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#D1FAE5" }}>
                    <Download className="h-5 w-5" style={{ color: "#10B981" }} />
                  </div>
                  <div>
                    <p className="mb-1 font-black text-sm" style={{ color: "var(--brand-ink)" }}>Download your PDF — then go further</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>Download your resume as a PDF instantly. Or convert it into a full KizaziHire profile so providers can find you directly — no re-entering anything.</p>
                  </div>
                </div>

                <div
                  className="overflow-hidden rounded-2xl p-px"
                  style={{ background: "var(--brand-purple-grad)" }}
                >
                  <div className="rounded-[calc(1rem-1px)] px-6 py-5" style={{ backgroundColor: "var(--brand-purple-tint)" }}>
                    <p className="text-sm font-black" style={{ color: "var(--brand-ink)" }}>Free to use. No account required to start.</p>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>Start building in seconds. Enter your email only when you're ready to download or create your profile.</p>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div>
                <span className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest" style={{ backgroundColor: "var(--brand-purple-tint)", color: "var(--brand-purple)" }}>
                  Free Resume Builder
                </span>
                <h2 className="mb-5 text-3xl font-black leading-tight md:text-[2.3rem]" style={{ color: "var(--brand-ink)" }}>
                  Build an NDIS-ready resume in minutes
                </h2>
                <p className="mb-6 text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                  Not sure how to write a support worker resume? Our free builder walks you through it — step by step — and uses AI to write your professional content for you.
                </p>

                <div className="mb-8 space-y-3">
                  {[
                    "Guided 8-step questionnaire built for NDIS roles",
                    "AI-generated summary, bullet points & bio",
                    "Include your checks, qualifications & availability",
                    "Resume strength score with improvement tips",
                    "Download as PDF — or convert to a KizaziHire profile",
                    "Your data pre-fills your worker profile automatically",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--brand-purple)" }} />
                      <span className="text-sm leading-relaxed" style={{ color: "var(--brand-ink)" }}>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    to="/resume-builder"
                    className="group inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                    style={{ background: "var(--brand-purple-grad)", boxShadow: "0 6px 20px rgba(151,100,199,0.28)" }}
                  >
                    Build My Resume Free <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                  <span className="text-xs" style={{ color: "var(--brand-muted)" }}>No account needed · Takes about 10 minutes</span>
                </div>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ── SECTION 7: FAQ ── */}
      <section id="faq" className="relative overflow-hidden py-28 md:py-36" style={{ backgroundColor: "var(--brand-canvas)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(58,146,223,0.06) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-3xl px-6">
          <Reveal className="mb-14 text-center">
            <span className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest" style={{ backgroundColor: "var(--brand-cyan-tint)", color: "var(--brand-cyan-deep)" }}>
              FAQ
            </span>
            <h2 className="mb-4 text-3xl font-black leading-tight md:text-[2.3rem]" style={{ color: "var(--brand-ink)" }}>
              Common questions
            </h2>
            <p className="mx-auto max-w-lg text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              Everything you need to know before getting started.
            </p>
          </Reveal>

          <Reveal delay={50}>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-10 overflow-hidden rounded-3xl p-px" style={{ background: "var(--brand-cyan-grad)" }}>
              <div className="rounded-[calc(1.5rem-1px)] p-8 text-center" style={{ backgroundColor: "white" }}>
                <div className="mb-3 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "var(--brand-cyan-tint)" }}>
                    <HelpCircle className="h-6 w-6" style={{ color: "var(--brand-cyan-deep)" }} />
                  </div>
                </div>
                <p className="text-base font-black" style={{ color: "var(--brand-ink)" }}>Still have questions?</p>
                <p className="mt-2 text-sm" style={{ color: "var(--brand-muted)" }}>Reach out and we'll get back to you.</p>
                <Link
                  to="/contact"
                  className="group mt-5 inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                  style={{ background: "var(--brand-cyan-grad)" }}
                >
                  Get in touch <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SECTION 8: FINAL CTA ── */}
      <section className="relative overflow-hidden py-28 md:py-36" style={{ background: "var(--brand-hero-grad)" }}>
        {/* Animated orbs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full" style={{ background: "rgba(255,255,255,0.10)", animation: "pulse 8s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full" style={{ background: "rgba(255,255,255,0.08)", animation: "pulse 10s ease-in-out infinite 2s" }} />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 65%)" }} />

        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        <Reveal>
          <div className="relative mx-auto max-w-3xl px-6 text-center">
            <h2 className="mb-4 text-3xl font-black leading-tight text-white md:text-[2.8rem]">
              Hire support workers faster.
            </h2>
            <p className="mb-3 text-lg font-semibold text-white/80">
              Pre-vetted workers. Files ready to review. Interview directly and hire with confidence.
            </p>
            <p className="mb-12 text-base text-white/55">
              Join NDIS providers across Australia using KizaziHire.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/register"
                className="group flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 text-sm font-black transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl sm:w-auto"
                style={{ backgroundColor: "white", color: "var(--brand-cyan-deep)", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
              >
                Find Support Workers <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/gethired"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border px-8 py-4 text-sm font-black text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 sm:w-auto"
                style={{ borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(255,255,255,0.12)" }}
              >
                Join as a Support Worker
              </Link>
              <Link
                to="/resume-builder"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border px-8 py-4 text-sm font-black text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 sm:w-auto"
                style={{ borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(255,255,255,0.12)" }}
              >
                <FileSpreadsheet className="h-4 w-4" /> Free Resume Builder
              </Link>
            </div>
          </div>
        </Reveal>
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
            <Link to="/resume-builder" className="transition-colors hover:text-[var(--brand-ink)]">Resume Builder</Link>
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
