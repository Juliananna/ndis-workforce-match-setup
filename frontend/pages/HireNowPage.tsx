import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle, CheckCircle2, Loader2, ArrowRight, BadgeCheck,
  Users, ShieldCheck, Zap, Star, ChevronDown, Menu,
  MessageSquare, Settings, Compass, Briefcase, Building2,
  Clock, Search,
} from "lucide-react";
import backend from "~backend/client";
import { emailError, phoneError } from "../lib/validation";

const FEATURES = [
  {
    icon: Search,
    color: "bg-indigo-100 text-indigo-600",
    title: "Smart Worker Matching",
    desc: "Our algorithm surfaces verified, NDIS-compliant workers that fit your exact shift requirements and participant needs.",
  },
  {
    icon: ShieldCheck,
    color: "bg-emerald-100 text-emerald-600",
    title: "Pre-Screened Compliance",
    desc: "Every worker profile includes verified police checks, NDIS screening, first aid certificates and more — all in one place.",
  },
  {
    icon: Clock,
    color: "bg-amber-100 text-amber-600",
    title: "Fill Shifts Fast",
    desc: "Post emergency shifts and get responses within hours. Our urgent-shift notifications reach qualified workers instantly.",
  },
];

const TRUST_ITEMS = [
  "NDIS-registered workers only",
  "Compliance documents verified",
  "Post emergency shifts 24/7",
  "Transparent pricing — no hidden fees",
];

const PLANS = [
  {
    name: "Monthly",
    price: "$200",
    period: "/mo",
    highlight: false,
    perks: ["Unlimited job postings", "Browse all workers", "Messaging & offers", "Email support"],
  },
  {
    name: "6-Month",
    price: "$150",
    period: "/mo",
    highlight: true,
    badge: "Most Popular",
    perks: ["Everything in Monthly", "Priority worker matching", "Emergency shift alerts", "Dedicated account manager"],
  },
  {
    name: "Annual",
    price: "$120",
    period: "/mo",
    highlight: false,
    perks: ["Everything in 6-Month", "Bulk posting discounts", "Compliance reporting", "SLA support"],
  },
];

export default function HireNowPage() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"explore" | "matches" | "messages" | "profile">("explore");

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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account created!</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            We sent a verification link to <strong>{success.email}</strong>. Click it to activate your employer account and start finding workers.
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

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 sticky top-0 z-30">
        <span className="text-lg font-extrabold text-gray-900 tracking-tight">NDIS Match</span>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Pricing</a>
          <a href="#signup" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign Up</a>
          <Link to="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">Log in</Link>
          <button
            onClick={scrollToForm}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all"
          >
            Hire Now
          </button>
        </div>
      </nav>

      {/* Mobile header */}
      <header className="md:hidden bg-white px-5 pt-12 pb-4 flex items-center justify-between">
        <button className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors">
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
        <span className="text-base font-extrabold text-gray-900 tracking-tight">NDIS Match</span>
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-white" />
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white px-5 pt-4 pb-8 md:px-0 md:pt-0 md:pb-0">
        {/* Desktop hero */}
        <div className="hidden md:flex max-w-6xl mx-auto px-8 py-16 gap-12 items-center">
          <div className="flex-1">
            <span className="inline-block bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-4">
              NDIS Providers — Find Workers Today
            </span>
            <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-4">
              The <span className="text-indigo-600">Workforce</span><br />You Can Trust.
            </h1>
            <p className="text-base text-gray-500 mb-8 max-w-md leading-relaxed">
              Access a pool of pre-screened, NDIS-compliant support workers. Post shifts, verify compliance, and hire with confidence — all in one platform.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={scrollToForm}
                className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/25"
              >
                Start Hiring Free <ArrowRight className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["bg-teal-400", "bg-indigo-400", "bg-amber-400"].map((c, i) => (
                    <div key={i} className={`h-7 w-7 rounded-full ${c} border-2 border-white`} />
                  ))}
                </div>
                <span className="text-sm text-gray-500 font-medium">500+ providers on platform</span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 max-w-sm">
              {TRUST_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Hero illustration */}
          <div className="flex-shrink-0 relative w-80 h-80 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl" />

            <div className="relative z-10 w-full h-full p-6 flex flex-col justify-between">
              <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">12 workers matched</p>
                  <p className="text-[10px] text-gray-400">For your weekend shift</p>
                </div>
                <BadgeCheck className="h-5 w-5 text-indigo-500 ml-auto shrink-0" />
              </div>

              <div className="space-y-2">
                {[
                  { name: "Sarah M.", match: 97, tag: "Personal Care", color: "from-pink-400 to-rose-500" },
                  { name: "James K.", match: 94, tag: "Community Support", color: "from-blue-400 to-indigo-500" },
                  { name: "Priya L.", match: 91, tag: "Behaviour Support", color: "from-amber-400 to-orange-400" },
                ].map((w) => (
                  <div key={w.name} className="bg-white rounded-xl shadow-sm px-3 py-2 flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${w.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {w.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">{w.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{w.tag}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0">{w.match}%</span>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-600 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-300 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-white">Emergency shift filled</p>
                  <p className="text-[10px] text-indigo-200">Response in 45 min</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-300 ml-auto shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile hero */}
        <div className="md:hidden">
          <span className="inline-block bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
            NDIS Providers
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
            The <span className="text-indigo-600">Workforce</span><br />You Can Trust.
          </h1>
          <p className="text-sm text-gray-500 mt-2 mb-5 leading-relaxed">
            Access pre-screened, NDIS-compliant support workers. Post shifts and hire with confidence.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {TRUST_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-xs text-gray-600">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-8 md:pb-16">

        {/* Features */}
        <div id="features" className="py-5 md:py-12 space-y-3 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-4 md:p-6 flex gap-4">
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm md:text-base">{title}</p>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Promo banner */}
        <div className="rounded-3xl bg-indigo-600 p-5 md:p-8 relative overflow-hidden mb-5 md:mb-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-6 -translate-x-6" />
          <div className="relative z-10 md:flex md:items-center md:justify-between">
            <div>
              <span className="inline-block bg-amber-400 text-amber-900 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
                Platform Guarantee
              </span>
              <h2 className="text-xl md:text-2xl font-extrabold text-white leading-tight mb-2">
                Fill Your First Shift in 48 Hours
              </h2>
              <p className="text-indigo-100 text-xs md:text-sm leading-relaxed mb-3 md:max-w-md">
                If we don't match you with a qualified worker within 48 hours of your first job posting, your first month is free.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:items-end md:shrink-0">
              {["Compliance docs included", "No lock-in contracts"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-white text-xs font-semibold">
                  <div className="h-4 w-4 rounded-full bg-green-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                  </div>
                  {t}
                </div>
              ))}
              <button
                onClick={scrollToForm}
                className="hidden md:flex items-center gap-2 mt-2 px-5 py-2.5 bg-white text-indigo-700 font-bold rounded-xl text-sm hover:bg-indigo-50 transition-all"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div id="pricing" className="mb-8 md:mb-12">
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-1 text-center">Simple, Transparent Pricing</h2>
          <p className="text-sm text-gray-400 text-center mb-6">No per-hire fees. No surprises.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-5 relative ${
                  plan.highlight
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/25"
                    : "bg-white border border-gray-200"
                }`}
              >
                {plan.highlight && plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <p className={`font-bold text-sm mb-1 ${plan.highlight ? "text-indigo-200" : "text-gray-500"}`}>{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className={`text-3xl font-extrabold ${plan.highlight ? "text-white" : "text-gray-900"}`}>{plan.price}</span>
                  <span className={`text-xs ${plan.highlight ? "text-indigo-200" : "text-gray-400"}`}>{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-5">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${plan.highlight ? "text-green-300" : "text-emerald-500"}`} />
                      <span className={plan.highlight ? "text-indigo-100" : "text-gray-600"}>{perk}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={scrollToForm}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "bg-white text-indigo-700 hover:bg-indigo-50"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Form + social proof */}
        <div id="signup" className="md:grid md:grid-cols-2 md:gap-8 md:items-start">

          {/* Signup form */}
          <div ref={formRef} className="bg-white rounded-3xl p-5 md:p-8 shadow-sm">
            <h2 className="font-extrabold text-gray-900 text-lg md:text-2xl mb-1">Create Your Employer Account</h2>
            <p className="text-xs md:text-sm text-gray-400 mb-5">Free to register — subscription required to contact workers.</p>

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
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Contact Person</label>
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
                {loading ? "Creating account…" : "Create Employer Account →"}
              </button>
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

          {/* Social proof */}
          <div className="mt-5 md:mt-0 space-y-4">
            <div className="rounded-3xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, #e0e7ff 0%, #ede9fe 60%, #dbeafe 100%)" }}>
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-base leading-tight">Trusted by Providers</h3>
                    <p className="text-xs text-gray-500 mt-0.5">500+ NDIS organisations already hiring on the platform.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="flex -space-x-2">
                    {["bg-indigo-400", "bg-teal-400", "bg-rose-400", "bg-amber-400"].map((c, i) => (
                      <div key={i} className={`h-7 w-7 rounded-full ${c} border-2 border-white flex items-center justify-center text-[10px] font-bold text-white`}>
                        {["A", "C", "S", "M"][i]}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 font-medium">+500 providers joined</p>
                </div>

                <div className="space-y-3">
                  {[
                    { quote: "Filled 3 emergency shifts in one day. The compliance docs were all pre-verified.", name: "Alicia R.", org: "Sunrise Support Services" },
                    { quote: "We replaced our agency spend almost entirely. Workers are better matched and pre-screened.", name: "Marcus T.", org: "Coastal Care Group" },
                  ].map((t) => (
                    <div key={t.name} className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex gap-0.5 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed mb-2">"{t.quote}"</p>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{t.name}</p>
                        <p className="text-[10px] text-gray-400">{t.org}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">By the Numbers</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { value: "500+", label: "Providers" },
                  { value: "5,000+", label: "Workers" },
                  { value: "48hr", label: "Avg. fill time" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-xl font-extrabold text-indigo-600">{stat.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center px-4 pb-24 md:pb-8">
        <p className="font-bold text-gray-900 text-base">NDIS Match</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <a href="/privacy-policy" className="text-xs text-gray-400 hover:text-gray-600">Privacy</a>
          <a href="#" className="text-xs text-gray-400 hover:text-gray-600">Terms</a>
          <a href="#" className="text-xs text-gray-400 hover:text-gray-600">Support</a>
        </div>
        <p className="text-xs text-gray-400 mt-1">© 2024 NDIS Workforce Match. Built for Australia's care sector.</p>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex items-center">
        {([
          { id: "explore", label: "Explore", icon: Compass },
          { id: "matches", label: "Workers", icon: Users },
          { id: "messages", label: "Messages", icon: MessageSquare },
          { id: "profile", label: "Account", icon: Settings },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors ${
              activeTab === id ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className={`text-[10px] font-semibold ${activeTab === id ? "text-indigo-600" : "text-gray-400"}`}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
