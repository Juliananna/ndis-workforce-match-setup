import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import backend from "~backend/client";

export default function PrivacyPolicyPage() {
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backend.admin.getPrivacyPolicy()
      .then((res) => {
        setContent(res.content);
        setUpdatedAt(res.updatedAt ? new Date(res.updatedAt) : null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

      {/* HERO */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #f0fbfe 0%, #f5f0fc 50%, #eef6ff 100%)" }}
        />
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[400px] w-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3ED4E2 0%, transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <span
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em]"
            style={{
              borderColor: "rgba(43,183,227,0.22)",
              backgroundColor: "rgba(224,247,253,0.75)",
              color: "var(--brand-cyan-deep)",
            }}
          >
            <ShieldCheck className="h-3 w-3" />
            Legal
          </span>
          <h1
            className="mb-4 text-[2.2rem] font-black leading-[1.08] tracking-[-0.025em] md:text-[3rem]"
            style={{ color: "var(--brand-ink)" }}
          >
            Privacy{" "}
            <span
              style={{
                background: "var(--brand-hero-grad)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Policy
            </span>
          </h1>
          {updatedAt && !loading && (
            <p className="text-sm" style={{ color: "var(--brand-muted)" }}>
              Last updated: {updatedAt.toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </div>
      </section>

      {/* CONTENT */}
      <section className="pb-24">
        <div className="mx-auto max-w-4xl px-6">
          <div
            className="rounded-3xl border p-8 md:p-12"
            style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
          >
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--brand-cyan-deep)" }} />
              </div>
            ) : content ? (
              <div
                className="text-sm leading-[1.85] whitespace-pre-wrap"
                style={{ color: "var(--brand-muted)" }}
              >
                {content}
              </div>
            ) : (
              <div className="flex flex-col items-center py-20 text-center">
                <div
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "var(--brand-cyan-tint)" }}
                >
                  <ShieldCheck className="h-7 w-7" style={{ color: "var(--brand-cyan-deep)" }} />
                </div>
                <p className="text-base font-bold" style={{ color: "var(--brand-ink)" }}>Privacy policy coming soon.</p>
                <p className="mt-1 text-sm" style={{ color: "var(--brand-muted)" }}>
                  We're finalising our privacy policy. Please check back shortly.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm font-semibold transition-colors"
              style={{ color: "var(--brand-muted)" }}
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <Link
              to="/contact"
              className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--brand-cyan-grad)",
                boxShadow: "0 4px 14px rgba(43,183,227,0.25)",
              }}
            >
              Contact us <ChevronRight className="h-3.5 w-3.5" />
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
            <Link to="/contact" className="transition-colors hover:text-[var(--brand-ink)]">Contact</Link>
            <a href="#" className="transition-colors hover:text-[var(--brand-ink)]">Terms of Service</a>
          </div>
          <p className="text-xs" style={{ color: "var(--brand-muted)" }}>
            © 2025 KizaziHire · Built for the NDIS community
          </p>
        </div>
      </footer>
    </div>
  );
}
