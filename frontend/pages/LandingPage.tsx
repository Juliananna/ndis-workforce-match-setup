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
  Building2,
  HeartHandshake,
  BadgeCheck,
  Clock3,
  Sparkles,
  FileCheck2,
  MapPin,
} from "lucide-react";

const STATS = [
  { value: "96,000+", label: "Support workers in reach" },
  { value: "4.9/5", label: "Average satisfaction" },
  { value: "3 min", label: "To get started" },
  { value: "100%", label: "Verification focused" },
];

const TRUST_SIGNALS = [
  { icon: BadgeCheck, label: "NDIS worker screening" },
  { icon: FileCheck2, label: "Credential checks" },
  { icon: Shield, label: "Safer hiring workflow" },
];

const FEATURES_WORKER = [
  { icon: DollarSign, color: "bg-brand-mint text-brand-teal", title: "Set Your Own Rates", desc: "Stay in control of your availability, rates and the kind of support work you want to do." },
  { icon: Calendar, color: "bg-brand-sky text-brand-blue", title: "Total Flexibility", desc: "Choose shifts that fit your life, from regular participant support to urgent provider requests." },
  { icon: Compass, color: "bg-brand-warm text-brand-orange", title: "Smart Matching", desc: "Match with participants and providers by skills, location, interests and care needs." },
];

const FEATURES_EMPLOYER = [
  { icon: Shield, color: "bg-brand-sky text-brand-blue", title: "Pre-Verified Workers", desc: "See workers with the documents, checks and experience needed for safer NDIS support." },
  { icon: Users, color: "bg-brand-lavender text-brand-purple", title: "Browse & Match", desc: "Search by location, skills, availability and support preferences to find a better fit." },
  { icon: Zap, color: "bg-brand-rose text-brand-roseText", title: "Emergency Shifts", desc: "Post urgent shifts and reach qualified workers when reliability matters most." },
];

const TESTIMONIALS = [
  { name: "Sarah M.", role: "Support Worker", avatar: "bg-brand-coral", quote: "I went from zero clients to a full schedule in 2 weeks. The matching is genuinely impressive." },
  { name: "James T.", role: "NDIS Provider", avatar: "bg-brand-blue", quote: "We filled 3 emergency shifts within an hour. KizaziHire has been a game changer for our organisation." },
  { name: "Aisha K.", role: "Support Worker", avatar: "bg-brand-orange", quote: "I love that I can set my own rates and choose who I work with. True independence." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-canvas text-brand-ink antialiased">
      <nav className="sticky top-0 z-30 border-b border-brand-border/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-teal text-white shadow-lg shadow-brand-teal/20">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <span className="text-xl font-black tracking-tight text-brand-ink">KizaziHire</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#workers" className="text-sm font-medium text-brand-muted transition-colors hover:text-brand-ink">For Workers</a>
            <a href="#employers" className="text-sm font-medium text-brand-muted transition-colors hover:text-brand-ink">For Providers</a>
            <a href="#testimonials" className="text-sm font-medium text-brand-muted transition-colors hover:text-brand-ink">Reviews</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-bold text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-ink">
              Log in
            </Link>
            <Link to="/gethired" className="rounded-xl bg-brand-teal px-4 py-2 text-sm font-bold text-white shadow-lg shadow-brand-teal/20 transition-all hover:-translate-y-0.5 hover:bg-brand-tealDark">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_#e5fbf4,_transparent_34%),linear-gradient(135deg,_#ffffff_0%,_#f5fbfa_52%,_#fff5ec_100%)]">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-brand-warm blur-3xl opacity-70" />
        <div className="absolute -bottom-24 left-8 h-72 w-72 rounded-full bg-brand-sky blur-3xl opacity-70" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24">
          <div className="text-center md:text-left">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-teal/15 bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-brand-teal shadow-sm">
              <Shield className="h-3.5 w-3.5" />
              Australia's NDIS workforce marketplace
            </span>
            <h1 className="mb-6 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight text-brand-ink md:text-6xl">
              Find the right support worker — not just any worker.
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-brand-muted md:mx-0 md:text-xl">
              KizaziHire helps NDIS providers and support workers connect through safer verification, smarter matching and a more human hiring experience.
            </p>

            <div className="mb-7 flex flex-col items-center justify-center gap-4 sm:flex-row md:justify-start">
              <Link to="/register" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-teal px-7 py-4 font-black text-white shadow-xl shadow-brand-teal/25 transition-all hover:-translate-y-1 hover:bg-brand-tealDark sm:w-auto">
                Find support workers <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/gethired" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-border bg-white px-7 py-4 font-black text-brand-ink shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg sm:w-auto">
                <Sparkles className="h-4 w-4 text-brand-orange" />
                Join as a worker
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center justify-center gap-2 rounded-2xl border border-brand-border bg-white/80 px-3 py-3 text-sm font-bold text-brand-ink shadow-sm md:justify-start">
                  <Icon className="h-4 w-4 text-brand-teal" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -left-6 top-8 z-10 rounded-3xl bg-white p-4 shadow-2xl shadow-brand-blue/10">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-mint text-brand-teal">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-brand-ink">Match found</p>
                  <p className="text-xs text-brand-muted">Skills, location and fit aligned</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-5 bottom-10 z-10 rounded-3xl bg-white p-4 shadow-2xl shadow-brand-orange/10">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-warm text-brand-orange">
                  <Clock3 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-brand-ink">Urgent shift ready</p>
                  <p className="text-xs text-brand-muted">Qualified workers notified</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-white bg-white p-3 shadow-2xl shadow-brand-teal/15">
              <div className="rounded-[1.6rem] bg-gradient-to-br from-brand-teal via-brand-blue to-brand-purple p-6 text-white">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/75">Recommended worker</p>
                    <p className="text-2xl font-black">Maya Johnson</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur">
                    <Star className="h-4 w-4 fill-white" /> 4.9
                  </div>
                </div>
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 text-2xl font-black">MJ</div>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Melbourne, VIC</p>
                    <p className="flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> Screening verified</p>
                    <p className="flex items-center gap-2"><HeartHandshake className="h-4 w-4" /> Complex care experience</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['Behaviour support', 'Night shifts', 'Personal care', 'Community access'].map((skill) => (
                    <span key={skill} className="rounded-2xl bg-white/15 px-3 py-2 text-center text-xs font-bold backdrop-blur">{skill}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-brand-border bg-white py-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 md:grid-cols-4">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-black text-brand-teal md:text-4xl">{value}</p>
              <p className="mt-1 text-sm font-medium text-brand-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workers" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <span className="mb-4 inline-block rounded-full bg-brand-mint px-3 py-1.5 text-xs font-black uppercase tracking-widest text-brand-teal">For Support Workers</span>
            <h2 className="mb-4 text-3xl font-black text-brand-ink md:text-4xl">Work on your own terms</h2>
            <p className="mx-auto max-w-xl text-brand-muted">Join an NDIS workforce platform built around flexibility, safety and better matching.</p>
          </div>
          <div className="mb-10 grid gap-6 md:grid-cols-3">
            {FEATURES_WORKER.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-base font-black text-brand-ink">{title}</h3>
                <p className="text-sm leading-relaxed text-brand-muted">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link to="/gethired" className="inline-flex items-center gap-2 rounded-2xl bg-brand-teal px-8 py-4 font-black text-white shadow-lg shadow-brand-teal/20 transition-all hover:-translate-y-1 hover:bg-brand-tealDark">
              Apply as a support worker <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="employers" className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <span className="mb-4 inline-block rounded-full bg-brand-sky px-3 py-1.5 text-xs font-black uppercase tracking-widest text-brand-blue">For NDIS Providers</span>
            <h2 className="mb-4 text-3xl font-black text-brand-ink md:text-4xl">Find verified talent, fast</h2>
            <p className="mx-auto max-w-xl text-brand-muted">Browse pre-screened support workers ready for safer, more reliable participant support.</p>
          </div>
          <div className="mb-10 grid gap-6 md:grid-cols-3">
            {FEATURES_EMPLOYER.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="rounded-3xl border border-brand-border bg-brand-surface p-6 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-xl">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-base font-black text-brand-ink">{title}</h3>
                <p className="text-sm leading-relaxed text-brand-muted">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link to="/register" className="inline-flex items-center gap-2 rounded-2xl bg-brand-ink px-8 py-4 font-black text-white shadow-lg transition-all hover:-translate-y-1 hover:bg-brand-tealDark">
              Register as a provider <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-black text-brand-ink md:text-4xl">Loved by workers & providers</h2>
            <p className="text-brand-muted">Real stories from real people using KizaziHire every day.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map(({ name, role, avatar, quote }) => (
              <div key={name} className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${avatar} text-sm font-black text-white`}>
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-black text-brand-ink">{name}</p>
                    <p className="text-xs text-brand-muted">{role}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-brand-orange text-brand-orange" />
                    ))}
                  </div>
                </div>
                <p className="text-sm italic leading-relaxed text-brand-muted">&quot;{quote}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-brand-teal via-brand-blue to-brand-purple py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-black text-white md:text-4xl">Ready to build better care teams?</h2>
          <p className="mb-8 text-lg text-white/80">Start with safer matching, clearer verification and a platform that feels human.</p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 font-black text-brand-teal shadow-lg transition-all hover:-translate-y-1 hover:bg-brand-mint sm:w-auto">
              Find support workers <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/gethired" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-8 py-4 font-black text-white transition-all hover:-translate-y-1 hover:bg-white/20 sm:w-auto">
              <Building2 className="h-4 w-4" />
              Join as a worker
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-brand-border bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <span className="text-lg font-black tracking-tight text-brand-ink">KizaziHire</span>
          <div className="flex items-center gap-6 text-sm text-brand-muted">
            <Link to="/privacy-policy" className="transition-colors hover:text-brand-ink">Privacy Policy</Link>
            <a href="#" className="transition-colors hover:text-brand-ink">Terms of Service</a>
            <a href="#" className="transition-colors hover:text-brand-ink">Support</a>
          </div>
          <p className="text-xs text-brand-muted">© 2024 NDIS Workforce Match. Built with empathy.</p>
        </div>
      </footer>
    </div>
  );
}
