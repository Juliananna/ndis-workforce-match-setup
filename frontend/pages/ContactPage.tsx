import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Users,
  Building2,
  ArrowRight,
  CheckCircle2,
  Shield,
} from "lucide-react";

const CONTACT_CHANNELS = [
  {
    icon: Mail,
    tint: "#E0F7FD",
    fg: "#3A92DF",
    title: "Email us",
    desc: "For general enquiries and support",
    value: "hello@kizazihire.com.au",
    href: "mailto:hello@kizazihire.com.au",
  },
  {
    icon: Phone,
    tint: "#F3EDFB",
    fg: "#9764C7",
    title: "Call us",
    desc: "Mon–Fri, 9am–5pm AEST",
    value: "0485 041 315",
    href: "tel:+61485041315",
  },
  {
    icon: MapPin,
    tint: "#D1FAE5",
    fg: "#10B981",
    title: "Our location",
    desc: "Registered in Australia",
    value: "Melbourne, VIC, Australia",
    href: undefined,
  },
];

const ENQUIRY_TYPES = [
  { icon: Building2, label: "I'm an NDIS provider", value: "provider" },
  { icon: Users, label: "I'm a support worker", value: "worker" },
  { icon: MessageSquare, label: "General enquiry", value: "general" },
  { icon: Shield, label: "Compliance question", value: "compliance" },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [type, setType] = useState("");
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
      <section className="relative overflow-hidden py-20 md:py-28">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #f0fbfe 0%, #f5f0fc 50%, #eef6ff 100%)" }}
        />
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3ED4E2 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-[350px] w-[350px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #9764C7 0%, transparent 70%)" }}
        />

        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <span
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em]"
            style={{
              borderColor: "rgba(43,183,227,0.22)",
              backgroundColor: "rgba(224,247,253,0.75)",
              color: "var(--brand-cyan-deep)",
            }}
          >
            <MessageSquare className="h-3 w-3" />
            Get in touch
          </span>

          <h1
            className="mb-5 text-[2.5rem] font-black leading-[1.06] tracking-[-0.025em] md:text-[3.5rem]"
            style={{ color: "var(--brand-ink)" }}
          >
            We'd love to{" "}
            <span
              style={{
                background: "var(--brand-hero-grad)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              hear from you
            </span>
          </h1>

          <p
            className="mx-auto mb-0 max-w-xl text-[1.07rem] leading-[1.75]"
            style={{ color: "var(--brand-muted)" }}
          >
            Whether you're a provider, support worker, or just curious about how KizaziHire works — our team is here to help.
          </p>
        </div>
      </section>

      {/* CONTACT CHANNELS */}
      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-5 sm:grid-cols-3">
            {CONTACT_CHANNELS.map(({ icon: Icon, tint, fg, title, desc, value, href }) => (
              <div
                key={title}
                className="group rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                style={{ borderColor: "var(--brand-border)", backgroundColor: "white" }}
              >
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: tint }}
                >
                  <Icon className="h-5 w-5" style={{ color: fg }} />
                </div>
                <h3 className="mb-1 text-[0.95rem] font-black" style={{ color: "var(--brand-ink)" }}>{title}</h3>
                <p className="mb-3 text-sm" style={{ color: "var(--brand-muted)" }}>{desc}</p>
                {href ? (
                  <a
                    href={href}
                    className="text-sm font-bold transition-colors"
                    style={{ color: "var(--brand-cyan-deep)" }}
                  >
                    {value}
                  </a>
                ) : (
                  <p className="text-sm font-bold" style={{ color: "var(--brand-ink)" }}>{value}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section className="py-16 md:py-20" style={{ backgroundColor: "white" }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-16 md:grid-cols-[1fr_1.2fr] md:items-start">

            {/* Left copy */}
            <div>
              <span
                className="mb-4 inline-block rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest"
                style={{ backgroundColor: "var(--brand-cyan-tint)", color: "var(--brand-cyan-deep)" }}
              >
                Send us a message
              </span>
              <h2
                className="mb-4 text-3xl font-black leading-tight md:text-[2.1rem]"
                style={{ color: "var(--brand-ink)" }}
              >
                Tell us what you need
              </h2>
              <p className="mb-8 text-base leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                Fill in the form and we'll get back to you within one business day. Select the type of enquiry so we can route it to the right team.
              </p>

              <div className="space-y-4">
                {[
                  "Fast response within 1 business day",
                  "Dedicated support for providers",
                  "Worker onboarding assistance",
                  "Compliance and credential guidance",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--brand-green)" }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--brand-muted)" }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right form */}
            <div
              className="rounded-3xl border p-8"
              style={{ borderColor: "var(--brand-border)", backgroundColor: "var(--brand-canvas)" }}
            >
              {submitted ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div
                    className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: "var(--brand-cyan-tint)" }}
                  >
                    <CheckCircle2 className="h-7 w-7" style={{ color: "var(--brand-cyan-deep)" }} />
                  </div>
                  <h3 className="mb-2 text-xl font-black" style={{ color: "var(--brand-ink)" }}>Message sent!</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                    Thanks for reaching out. We'll get back to you within one business day.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Enquiry type */}
                  <div>
                    <label className="mb-2.5 block text-xs font-black uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>
                      I am a...
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {ENQUIRY_TYPES.map(({ icon: Icon, label, value }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setType(value)}
                          className="flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all"
                          style={{
                            borderColor: type === value ? "var(--brand-cyan-deep)" : "var(--brand-border)",
                            backgroundColor: type === value ? "var(--brand-cyan-tint)" : "white",
                            color: type === value ? "var(--brand-cyan-deep)" : "var(--brand-muted)",
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="text-xs">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-black uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>
                      Your name
                    </label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jane Smith"
                      className="w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none transition-all focus:ring-2"
                      style={{
                        borderColor: "var(--brand-border)",
                        backgroundColor: "white",
                        color: "var(--brand-ink)",
                      }}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-1.5 block text-xs font-black uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>
                      Email address
                    </label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jane@example.com.au"
                      className="w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none transition-all focus:ring-2"
                      style={{
                        borderColor: "var(--brand-border)",
                        backgroundColor: "white",
                        color: "var(--brand-ink)",
                      }}
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="mb-1.5 block text-xs font-black uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us how we can help..."
                      className="w-full resize-none rounded-xl border px-4 py-3 text-sm font-semibold outline-none transition-all focus:ring-2"
                      style={{
                        borderColor: "var(--brand-border)",
                        backgroundColor: "white",
                        color: "var(--brand-ink)",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black text-white transition-all hover:-translate-y-0.5"
                    style={{
                      background: "var(--brand-hero-grad)",
                      boxShadow: "0 6px 20px rgba(43,183,227,0.26)",
                    }}
                  >
                    Send message <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
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
