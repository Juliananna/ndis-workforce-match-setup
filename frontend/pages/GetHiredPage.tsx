import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle, CheckCircle2, Loader2, X, ArrowRight, BadgeCheck,
  Menu, DollarSign, Calendar, Compass, Star, ChevronDown,
  MessageSquare, Settings, Shield, Tag,
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

const FEATURES = [
  {
    icon: DollarSign,
    color: "bg-indigo-100 text-indigo-600",
    title: "Set Your Own Rates",
    desc: "You're in control. Average providers earn 20% more than industry standard benchmarks.",
  },
  {
    icon: Calendar,
    color: "bg-emerald-100 text-emerald-600",
    title: "Total Flexibility",
    desc: "Manage your schedule with our intuitive mobile app. Work as much or as little as you want.",
  },
  {
    icon: Compass,
    color: "bg-amber-100 text-amber-600",
    title: "Smart Matching",
    desc: "Our AI curator connects you with participants based on shared hobbies and personalities.",
  },
];

export default function GetHiredPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"explore" | "matches" | "messages" | "profile">("explore");

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
      <div className="min-h-screen bg-[#f4f5f9] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-5">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-green-50">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're in!</h2>
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">
            We sent a verification link to <strong>{success.email}</strong>. Click the link to activate your account.
          </p>
          {success.promoGrants && success.promoGrants.length > 0 && (
            <div className="mb-5 rounded-xl bg-green-50 border border-green-200 p-3 text-left">
              <p className="text-xs font-bold text-green-700 mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />Promo code applied!
              </p>
              <ul className="space-y-0.5">
                {success.promoGrants.map((g) => (
                  <li key={g} className="text-xs text-green-600 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-green-500 shrink-0" />{g}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
          <a href="#signup" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign Up</a>
          <Link to="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">Log in</Link>
          <button
            onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Mobile header */}
      <header className="md:hidden bg-white px-5 pt-12 pb-4 flex items-center justify-between">
        <button className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors">
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
        <span className="text-base font-extrabold text-gray-900 tracking-tight">NDIS Match</span>
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
          <span className="text-white text-sm font-bold">J</span>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white px-5 pt-4 pb-8 md:px-0 md:pt-0 md:pb-0">
        {/* Desktop hero — two column */}
        <div className="hidden md:flex max-w-6xl mx-auto px-8 py-16 gap-12 items-center">
          <div className="flex-1">
            <span className="inline-block bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-4">
              Limited Time — Free Verification
            </span>
            <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-4">
              Be the <span className="text-indigo-600">Support</span><br />They Deserve.
            </h1>
            <p className="text-base text-gray-500 mb-8 max-w-md leading-relaxed">
              Join Australia's most empathetic workforce. Set your rates, choose your hours, and match with participants who share your values.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/25"
              >
                Create Free Account <ArrowRight className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                <span className="text-sm font-semibold text-gray-700">4.9/5</span>
                <span className="text-sm text-gray-400">avg. satisfaction</span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 relative w-72 h-72 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-b from-teal-100 to-emerald-100 rounded-3xl" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-64 flex items-end justify-center">
              <svg viewBox="0 0 160 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="80" cy="185" rx="50" ry="10" fill="#d1fae5" opacity="0.6"/>
                <circle cx="80" cy="50" r="32" fill="#f9a8d4"/>
                <ellipse cx="80" cy="52" rx="20" ry="22" fill="#fecdd3"/>
                <path d="M55 80 Q80 140 105 80" fill="#6366f1"/>
                <path d="M62 82 L45 130 Q50 145 55 130 L62 100" fill="#6366f1"/>
                <path d="M98 82 L115 130 Q110 145 105 130 L98 100" fill="#6366f1"/>
                <path d="M62 140 L58 185 L72 185 L80 155 L88 185 L102 185 L98 140 Z" fill="#4338ca"/>
                <circle cx="80" cy="48" r="14" fill="#fda4af"/>
                <path d="M66 48 Q80 35 94 48" fill="#881337" opacity="0.4"/>
                <circle cx="72" cy="50" r="2.5" fill="#1e1b4b"/>
                <circle cx="88" cy="50" r="2.5" fill="#1e1b4b"/>
                <path d="M75 58 Q80 62 85 58" stroke="#be123c" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-md px-3 py-2 flex items-center gap-2 w-44 z-10">
              <div className="h-7 w-7 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">4.9/5 Rating</p>
                <p className="text-[10px] text-gray-400">Avg. worker satisfaction</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile hero */}
        <div className="md:hidden">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-1">
            Be the <span className="text-indigo-600">Support</span> They<br />Deserve.
          </h1>
          <p className="text-sm text-gray-500 mt-2 mb-6">
            Join Australia's most empathetic workforce. Set your rates, choose your hours, and match with participants who share your values.
          </p>

          <div className="flex justify-center">
            <div className="relative w-48 h-56">
              <div className="absolute inset-0 bg-gradient-to-b from-teal-100 to-emerald-100 rounded-3xl" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-48 flex items-end justify-center">
                <svg viewBox="0 0 160 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="80" cy="185" rx="50" ry="10" fill="#d1fae5" opacity="0.6"/>
                  <circle cx="80" cy="50" r="32" fill="#f9a8d4"/>
                  <ellipse cx="80" cy="52" rx="20" ry="22" fill="#fecdd3"/>
                  <path d="M55 80 Q80 140 105 80" fill="#6366f1"/>
                  <path d="M62 82 L45 130 Q50 145 55 130 L62 100" fill="#6366f1"/>
                  <path d="M98 82 L115 130 Q110 145 105 130 L98 100" fill="#6366f1"/>
                  <path d="M62 140 L58 185 L72 185 L80 155 L88 185 L102 185 L98 140 Z" fill="#4338ca"/>
                  <circle cx="80" cy="48" r="14" fill="#fda4af"/>
                  <path d="M66 48 Q80 35 94 48" fill="#881337" opacity="0.4"/>
                  <circle cx="72" cy="50" r="2.5" fill="#1e1b4b"/>
                  <circle cx="88" cy="50" r="2.5" fill="#1e1b4b"/>
                  <path d="M75 58 Q80 62 85 58" stroke="#be123c" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-md px-3 py-2 flex items-center gap-2 w-44">
                <div className="h-7 w-7 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">4.9/5 Rating</p>
                  <p className="text-[10px] text-gray-400">Avg. worker satisfaction</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content wrapper */}
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
              <span className="inline-block bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
                Limited Time Offer
              </span>
              <h2 className="text-xl md:text-2xl font-extrabold text-white leading-tight mb-2">
                Get Verified for Free
              </h2>
              <p className="text-indigo-100 text-xs md:text-sm leading-relaxed mb-3 md:max-w-md">
                We've waived the $45 background check fee for new applicants this month. Start your journey with zero upfront costs.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:items-end md:shrink-0">
              <div className="flex items-center gap-2 text-white text-xs font-semibold">
                <div className="h-4 w-4 rounded-full bg-green-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                </div>
                ID &amp; Police Check Included
              </div>
              <button
                onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="hidden md:flex items-center gap-2 mt-2 px-5 py-2.5 bg-white text-indigo-700 font-bold rounded-xl text-sm hover:bg-indigo-50 transition-all"
              >
                Claim Now <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop two-column: form + social proof */}
        <div id="signup" className="md:grid md:grid-cols-2 md:gap-8 md:items-start">

          {/* Signup form */}
          <div ref={formRef} className="bg-white rounded-3xl p-5 md:p-8 shadow-sm">
            <h2 className="font-extrabold text-gray-900 text-lg md:text-2xl mb-1">Start Your Application</h2>
            <p className="text-xs md:text-sm text-gray-400 mb-5">Takes less than 3 minutes to start</p>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 mb-4">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="Jane Cooper"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Phone</label>
                <input
                  type="tel"
                  placeholder="04XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Primary Skill</label>
                <div className="relative">
                  <select
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    className="w-full appearance-none px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm pr-10"
                  >
                    {SKILLS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
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

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Promo / Discount Code <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span></label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Tag className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={promoCode}
                    onChange={(e) => handlePromoInput(e.target.value)}
                    className={`w-full pl-9 pr-10 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm uppercase tracking-widest ${
                      promoState === "valid"
                        ? "border-green-400 focus:ring-green-400"
                        : promoState === "invalid"
                        ? "border-red-300 focus:ring-red-300"
                        : "border-gray-200 focus:ring-indigo-500"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {promoState === "checking" && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
                    {promoState === "valid" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {promoState === "invalid" && <AlertCircle className="h-4 w-4 text-red-400" />}
                    {promoState === "idle" && promoCode && (
                      <button type="button" onClick={clearPromo}>
                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
                {promoState === "valid" && promoResult && (
                  <p className="mt-1.5 text-xs text-green-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {formatDiscount(promoResult)} applied{promoResult.description ? ` — ${promoResult.description}` : ""}
                  </p>
                )}
                {promoState === "invalid" && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
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
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                />
                <label htmlFor="agree" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                  By clicking "Create My Account" you agree to our{" "}
                  <a href="https://ndis.gov.au/about-us/policies/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">Terms of Service</a>
                  {" "}and{" "}
                  <a href="https://ndis.gov.au/about-us/policies/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">Privacy Policy</a>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Creating account…" : "Create My Account →"}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo-600 hover:underline font-semibold">Log in</Link>
            </p>
          </div>

          {/* Social proof */}
          <div className="mt-5 md:mt-0 rounded-3xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 50%, #ede9fe 100%)" }}>
            <div className="p-6 pb-0">
              <div className="flex items-start gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base leading-tight">Join the Movement</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Empowering 96,000+ support workers across Australia.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 mb-1">
                <div className="flex -space-x-2">
                  {["bg-blue-400", "bg-purple-400", "bg-pink-400", "bg-amber-400"].map((c, i) => (
                    <div key={i} className={`h-7 w-7 rounded-full ${c} border-2 border-white flex items-center justify-center text-[10px] font-bold text-white`}>
                      {["S", "J", "M", "A"][i]}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 font-medium">+96,000 workers joined</p>
              </div>
            </div>

            <div className="flex justify-center mt-2">
              <svg viewBox="0 0 260 140" className="w-full max-w-xs" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="30" y="70" width="60" height="65" rx="8" fill="#6366f1" opacity="0.15"/>
                <rect x="170" y="55" width="60" height="80" rx="8" fill="#8b5cf6" opacity="0.15"/>
                <circle cx="60" cy="52" r="22" fill="#fda4af"/>
                <ellipse cx="60" cy="54" rx="14" ry="15" fill="#fecdd3"/>
                <path d="M38 75 Q60 120 82 75" fill="#6366f1"/>
                <path d="M44 77 L32 115 Q36 128 42 115 L46 90" fill="#6366f1"/>
                <path d="M76 77 L88 115 Q84 128 78 115 L74 90" fill="#6366f1"/>
                <path d="M44 118 L41 138 L52 138 L60 122 L68 138 L79 138 L76 118 Z" fill="#4338ca"/>
                <circle cx="60" cy="50" r="10" fill="#fda4af"/>
                <circle cx="55" cy="52" r="1.8" fill="#1e1b4b"/>
                <circle cx="65" cy="52" r="1.8" fill="#1e1b4b"/>

                <circle cx="200" cy="36" r="22" fill="#93c5fd"/>
                <ellipse cx="200" cy="38" rx="14" ry="15" fill="#bfdbfe"/>
                <path d="M178 59 Q200 104 222 59" fill="#7c3aed"/>
                <path d="M184 61 L172 99 Q176 112 182 99 L186 74" fill="#7c3aed"/>
                <path d="M216 61 L228 99 Q224 112 218 99 L214 74" fill="#7c3aed"/>
                <path d="M184 102 L181 122 L192 122 L200 106 L208 122 L219 122 L216 102 Z" fill="#5b21b6"/>
                <circle cx="200" cy="34" r="10" fill="#93c5fd"/>
                <circle cx="195" cy="36" r="1.8" fill="#1e1b4b"/>
                <circle cx="205" cy="36" r="1.8" fill="#1e1b4b"/>

                <rect x="95" y="90" width="70" height="5" rx="2.5" fill="#e0e7ff"/>
                <rect x="95" y="90" width="56" height="5" rx="2.5" fill="#6366f1"/>
                <rect x="105" y="100" width="50" height="4" rx="2" fill="#e0e7ff"/>
                <rect x="105" y="100" width="35" height="4" rx="2" fill="#8b5cf6"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center px-4 pb-24 md:pb-8">
        <p className="font-bold text-gray-900 text-base">NDIS Match</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <a href="#" className="text-xs text-gray-400 hover:text-gray-600">Privacy</a>
          <a href="#" className="text-xs text-gray-400 hover:text-gray-600">Terms</a>
          <a href="#" className="text-xs text-gray-400 hover:text-gray-600">Support</a>
        </div>
        <p className="text-xs text-gray-400 mt-1">© 2024 NDIS Workforce Match. Built with empathy.</p>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex items-center">
        {([
          { id: "explore", label: "Explore", icon: Compass },
          { id: "matches", label: "Matches", icon: BadgeCheck },
          { id: "messages", label: "Messages", icon: MessageSquare },
          { id: "profile", label: "Profile", icon: Settings },
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
