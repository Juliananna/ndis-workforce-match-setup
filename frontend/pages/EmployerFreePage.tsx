import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2, ArrowRight, Loader2, AlertCircle,
  Users, FileCheck, Search, Briefcase, Star,
  Lock, Zap, BadgeCheck, Shield, ChevronRight,
  Building2,
} from "lucide-react";
import backend from "~backend/client";
import { emailError, phoneError } from "../lib/validation";

const FREE_FEATURES = [
  {
    icon: Search,
    title: "Browse 6 verified workers",
    description: "See real worker profiles — verified compliance docs, experience, availability, and skills.",
    free: true,
  },
  {
    icon: Briefcase,
    title: "Post up to 2 job requests",
    description: "Create and publish job postings. Workers matched to your shift will appear immediately.",
    free: true,
  },
  {
    icon: Star,
    title: "See how many workers match",
    description: "For every job you post, we show you exactly how many workers match — with compatibility scores.",
    free: true,
  },
  {
    icon: BadgeCheck,
    title: "Worker verification badges",
    description: "See which workers are fully verified: ID, police check, NDIS screening, references, and more.",
    free: true,
  },
];

const PAID_FEATURES = [
  {
    icon: Users,
    title: "Unlimited worker browsing",
    description: "Access every verified worker on the platform with full profile details.",
  },
  {
    icon: FileCheck,
    title: "View compliance documents",
    description: "Instantly access police checks, NDIS screening, first aid certs, and more.",
  },
  {
    icon: Zap,
    title: "Contact workers & send offers",
    description: "Message workers directly, send job offers, and negotiate rates.",
  },
  {
    icon: Shield,
    title: "Human reference checks",
    description: "Our compliance officers personally conduct structured reference checks.",
  },
  {
    icon: Briefcase,
    title: "Unlimited job postings",
    description: "Post as many shifts and general roles as you need with no caps.",
  },
  {
    icon: Star,
    title: "Priority matching & alerts",
    description: "Get matched faster and receive emergency shift responses within hours.",
  },
];

const TESTIMONIALS = [
  {
    quote: "We trialled it for free, saw 14 workers matching our first shift, and upgraded the same day.",
    name: "Alicia R.",
    org: "Sunrise Support Services",
    color: "from-teal-400 to-emerald-500",
  },
  {
    quote: "The free preview showed us exactly what we'd get. No surprises — we knew it was worth it.",
    name: "Marcus T.",
    org: "Coastal Care Group",
    color: "from-indigo-400 to-purple-500",
  },
];

export default function EmployerFreePage() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [abn, setAbn] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const emailErr = emailTouched ? emailError(email) : null;
  const phoneErr = phoneTouched ? phoneError(phone) : null;

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ email: string } | null>(null);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPhoneTouched(true);
    if (emailError(email)) { setError("Please enter a valid email address."); return; }
    if (phoneError(phone)) { setError("Please enter a valid Australian phone number."); return; }
    if (!agreed) { setError("Please agree to the Terms of Service and Privacy Policy."); return; }
    setError(null);
    setLoading(true);
    try {
      await backend.auth.register({
        email,
        password,
        role: "EMPLOYER",
        name,
        phone,
        organisation_name: organisationName,
        contact_person: contactPerson,
        abn,
      });
      setSuccess({ email });
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f4f5f9] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-5">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-green-50">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're in — for free!</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            We sent a verification link to <strong>{success.email}</strong>. Click it to activate your free account and start exploring workers.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3.5 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-all"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f9] antialiased">

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30 px-5 md:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-extrabold text-gray-900 tracking-tight">Kizazi Hire</Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors hidden sm:block">
            Log in
          </Link>
          <button
            onClick={scrollToForm}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all"
          >
            Start Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-white px-5 md:px-8 pt-10 pb-12 md:pt-16 md:pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Free — no credit card required
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Try NDIS workforce matching<br />
            <span className="text-indigo-600">completely free.</span>
          </h1>
          <p className="text-gray-500 text-base md:text-lg leading-relaxed mb-8 max-w-xl mx-auto">
            Create a free account, post your first jobs, and see exactly which verified workers match — before you spend a single dollar. Upgrade only when you're ready.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={scrollToForm}
              className="flex items-center gap-2 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/25 text-sm"
            >
              Create Free Account <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/login"
              className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              Already have an account? Log in →
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              "No credit card",
              "No commitment",
              "No time limit",
              "Upgrade anytime",
            ].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-xs text-gray-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 md:px-8 pb-16 space-y-14">

        {/* Free vs Paid comparison */}
        <div className="space-y-5">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">What you get for free</h2>
            <p className="text-gray-500 text-sm mt-2">No strings. Explore the platform before you commit.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Free column */}
            <div className="bg-white rounded-3xl border border-emerald-200 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-widest">
                  Free Account
                </span>
                <span className="text-xs text-gray-400">Always free, no expiry</span>
              </div>
              <div className="space-y-3">
                {FREE_FEATURES.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="flex gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={scrollToForm}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
              >
                Get Started Free <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Paid column */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-widest">
                  Paid Plan
                </span>
                <span className="text-xs text-indigo-200">From $200/mo — upgrade anytime</span>
              </div>
              <div className="space-y-3">
                {PAID_FEATURES.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="flex gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="text-xs text-indigo-200 mt-0.5 leading-relaxed">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3 text-center">
                <p className="text-white text-xs font-semibold">Upgrade from inside your free account — no pressure.</p>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">How it works</h2>
            <p className="text-gray-500 text-sm mt-2">From signup to seeing matched workers in under 5 minutes.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: "1", label: "Create free account", desc: "Sign up in under 2 minutes. No card required.", color: "bg-indigo-50 text-indigo-600" },
              { step: "2", label: "Post a job", desc: "Describe your shift or role. Free accounts get 2 posts.", color: "bg-emerald-50 text-emerald-600" },
              { step: "3", label: "See matched workers", desc: "We instantly show you how many workers match your job.", color: "bg-amber-50 text-amber-600" },
              { step: "4", label: "Upgrade when ready", desc: "Like what you see? Upgrade to connect and hire.", color: "bg-purple-50 text-purple-600" },
            ].map(({ step, label, desc, color }, i) => (
              <div key={step} className="relative">
                {i < 3 && (
                  <div className="hidden md:block absolute top-5 left-[calc(100%-0.5rem)] w-4 z-10">
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                )}
                <div className="bg-white rounded-2xl p-5 h-full">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-extrabold text-lg mb-3 ${color}`}>
                    {step}
                  </div>
                  <p className="font-bold text-gray-900 text-sm mb-1">{label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Proof section */}
        <div className="grid md:grid-cols-2 gap-5">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.org}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-white rounded-3xl p-6 md:p-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { value: "5,000+", label: "Verified workers" },
              { value: "500+", label: "NDIS providers" },
              { value: "48hr", label: "Avg. shift fill time" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl md:text-4xl font-extrabold text-indigo-600">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lock transparency section */}
        <div className="rounded-3xl bg-gray-900 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-1">Completely transparent — no dark patterns</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your free account never expires and doesn't auto-upgrade. We'll clearly show you what's locked and why.
              When you're ready to connect with workers, upgrading takes 30 seconds inside your account.
            </p>
          </div>
          <button
            onClick={scrollToForm}
            className="shrink-0 px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl text-sm hover:bg-gray-100 transition-all"
          >
            Start Free →
          </button>
        </div>

        {/* Signup form */}
        <div id="signup" ref={formRef} className="md:grid md:grid-cols-2 md:gap-10 md:items-start">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="mb-5">
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
                <CheckCircle2 className="h-3 w-3" /> Free — no credit card
              </span>
              <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Create your free account</h2>
              <p className="text-sm text-gray-400 mt-1">Takes 2 minutes. No commitment to upgrade.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 mb-4">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Your Full Name</label>
                  <input
                    type="text"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Organisation Name</label>
                  <input
                    type="text"
                    placeholder="Sunshine Care Pty Ltd"
                    value={organisationName}
                    onChange={(e) => setOrganisationName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Contact Person / Role</label>
                <input
                  type="text"
                  placeholder="Operations Manager"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Phone</label>
                  <input
                    type="tel"
                    placeholder="04XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => setPhoneTouched(true)}
                    required
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm ${
                      phoneErr ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-indigo-500"
                    }`}
                  />
                  {phoneErr && <p className="mt-1 text-xs text-red-500">{phoneErr}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">ABN</label>
                  <input
                    type="text"
                    placeholder="XX XXX XXX XXX"
                    value={abn}
                    onChange={(e) => setAbn(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="admin@yourorg.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  required
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm ${
                    emailErr ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-indigo-500"
                  }`}
                />
                {emailErr && <p className="mt-1 text-xs text-red-500">{emailErr}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Password</label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                />
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                />
                <label htmlFor="agree" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                  By creating an account you agree to our{" "}
                  <a href="/privacy-policy" className="text-indigo-600 hover:underline font-medium">Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy-policy" className="text-indigo-600 hover:underline font-medium">Privacy Policy</a>.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Creating account…" : "Create Free Account →"}
              </button>

              <p className="text-center text-xs text-gray-400">
                No credit card · No commitment · Upgrade only if you choose to
              </p>
            </form>

            <p className="text-center text-xs text-gray-400 mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo-600 hover:underline font-semibold">Log in</Link>
            </p>
            <p className="text-center text-xs text-gray-400 mt-2">
              Looking for work?{" "}
              <Link to="/gethired" className="text-indigo-600 hover:underline">Join as a Support Worker</Link>
            </p>
          </div>

          {/* Side content */}
          <div className="mt-6 md:mt-0 space-y-5">
            <div className="bg-white rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">What's included free</p>
              <div className="space-y-3">
                {[
                  { label: "Browse 6 verified worker profiles", included: true },
                  { label: "Post up to 2 job requests", included: true },
                  { label: "See matched worker count + scores", included: true },
                  { label: "Worker verification badges", included: true },
                  { label: "View full compliance documents", included: false },
                  { label: "Contact workers & send offers", included: false },
                  { label: "Unlimited browsing & job posts", included: false },
                  { label: "Human-conducted reference checks", included: false },
                ].map(({ label, included }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    {included ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-300 shrink-0" />
                    )}
                    <span className={`text-sm ${included ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                      {label}
                    </span>
                    {!included && (
                      <span className="ml-auto text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                        Paid
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Paid plans from $200/month</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Month-to-month, 6-month, or annual. No lock-in. Cancel anytime.
                    Upgrade from within your free account whenever you're ready.
                  </p>
                  <Link
                    to="/hirenow#pricing"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 mt-2 hover:underline"
                  >
                    See pricing <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center px-4 pb-10">
        <p className="font-bold text-gray-900 text-sm">Kizazi Hire</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <a href="/privacy-policy" className="text-xs text-gray-400 hover:text-gray-600">Privacy</a>
          <a href="/hirenow" className="text-xs text-gray-400 hover:text-gray-600">Pricing</a>
          <Link to="/login" className="text-xs text-gray-400 hover:text-gray-600">Log in</Link>
        </div>
        <p className="text-xs text-gray-400 mt-1">© 2025 Kizazi Hire. Built for Australia's care sector.</p>
      </div>
    </div>
  );
}
