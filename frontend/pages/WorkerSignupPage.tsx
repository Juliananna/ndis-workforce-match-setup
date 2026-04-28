import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Tag,
  X,
  ChevronRight,
  Shield,
  Zap,
  Users,
  Star,
  BadgeCheck,
} from "lucide-react";
import backend from "~backend/client";

type PromoState = "idle" | "checking" | "valid" | "invalid";

interface PromoResult {
  description: string | null;
  discountType: "percent" | "fixed_aud_cents";
  discountValue: number;
}

function formatDiscount(result: PromoResult): string {
  if (result.discountType === "percent") {
    return `${result.discountValue}% off`;
  }
  return `$${(result.discountValue / 100).toFixed(2)} off`;
}

const BENEFITS = [
  { icon: Zap, text: "Get matched to NDIS jobs near you instantly" },
  { icon: Shield, text: "Verified profile badges build employer trust" },
  { icon: Users, text: "Join 5,000+ workers already on the platform" },
  { icon: Star, text: "Receive reviews that boost your profile" },
];

export default function WorkerSignupPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [promoCode, setPromoCode] = useState("");
  const [promoState, setPromoState] = useState<PromoState>("idle");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const promoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ email: string } | null>(null);

  const handlePromoInput = (val: string) => {
    setPromoCode(val);
    setPromoResult(null);
    if (!val.trim()) {
      setPromoState("idle");
      return;
    }
    setPromoState("checking");
    if (promoDebounce.current) clearTimeout(promoDebounce.current);
    promoDebounce.current = setTimeout(async () => {
      try {
        const res = await backend.sales.validatePromo({ code: val.trim() });
        if (res.valid) {
          setPromoState("valid");
          setPromoResult({
            description: res.description,
            discountType: res.discountType,
            discountValue: res.discountValue,
          });
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

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError("Please agree to the Terms and Conditions.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const resp = await backend.auth.register({
        email,
        password,
        role: "WORKER",
        name,
        phone,
      });
      setSuccess({ email });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="flex justify-center mb-5">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're in!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your account has been created. Verify your email to unlock all features.
          </p>
          <p className="text-gray-500 text-sm mb-2">
            We sent a verification link to:
          </p>
          <p className="font-semibold text-gray-800 mb-5">{success.email}</p>
          <p className="text-xs text-gray-400 mb-6">
            Click the link in your email to verify your account. Check your spam folder if you don't see it.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-indigo-300 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-12">
            <BadgeCheck className="h-4 w-4 text-blue-200" />
            <span className="text-white text-sm font-medium">Built for NDIS Support Workers</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight mb-5">
            Your next<br />
            NDIS role<br />
            <span className="text-blue-200">starts here.</span>
          </h1>

          <p className="text-blue-100 text-base mb-10 leading-relaxed">
            Create your free profile, get matched with providers, and build a career you're proud of.
          </p>

          <div className="space-y-4">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-blue-50 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <img
            src="/create-account-image.png"
            alt="Support workers"
            className="w-full rounded-2xl object-cover opacity-90"
          />
          <div className="absolute bottom-4 left-4 right-4 bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-green-400/80 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Free to join as a worker</p>
              <p className="text-xs text-blue-200">Upgrade anytime for premium features</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-7/12 flex flex-col items-center justify-center px-6 py-12 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">Support Worker Signup</p>
            <h2 className="text-3xl font-bold text-gray-900">Create your free account</h2>
            <p className="text-gray-500 mt-1.5 text-sm">Get matched with NDIS providers in minutes.</p>
          </div>

          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step >= s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? "text-gray-800" : "text-gray-400"}`}>
                  {s === 1 ? "Your Details" : "Confirm & Join"}
                </span>
                {s < 2 && <ChevronRight className="h-4 w-4 text-gray-300" />}
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 mb-5">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  placeholder="04XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Promotional Code{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter code e.g. WELCOME20"
                    value={promoCode}
                    onChange={(e) => handlePromoInput(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 font-mono uppercase focus:outline-none focus:ring-2 transition-all ${
                      promoState === "valid"
                        ? "border-green-400 focus:ring-green-400"
                        : promoState === "invalid"
                        ? "border-red-300 focus:ring-red-300"
                        : "border-gray-200 focus:ring-blue-500"
                    }`}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {promoState === "checking" && (
                      <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                    )}
                    {promoState === "valid" && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {promoState === "invalid" && (
                      <AlertCircle className="h-4 w-4 text-red-400" />
                    )}
                    {promoState === "idle" && promoCode && (
                      <button type="button" onClick={clearPromo}>
                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>

                {promoState === "valid" && promoResult && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-green-700">
                        {formatDiscount(promoResult)} applied!
                      </span>
                      {promoResult.description && (
                        <span className="text-xs text-green-600 ml-1.5">— {promoResult.description}</span>
                      )}
                    </div>
                  </div>
                )}
                {promoState === "invalid" && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    This code is invalid or has expired.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 mt-2"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Account Summary</p>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <span className="text-gray-500">Name</span>
                  <span className="text-gray-900 font-medium text-right">{name}</span>
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-900 font-medium text-right truncate">{email}</span>
                  <span className="text-gray-500">Phone</span>
                  <span className="text-gray-900 font-medium text-right">{phone}</span>
                  <span className="text-gray-500">Account type</span>
                  <span className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5">
                      <Shield className="h-3 w-3" />
                      Support Worker
                    </span>
                  </span>
                  {promoState === "valid" && promoResult && (
                    <>
                      <span className="text-gray-500">Promo code</span>
                      <span className="text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5">
                          <Tag className="h-3 w-3" />
                          {promoCode.toUpperCase()} · {formatDiscount(promoResult)}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="agree" className="text-sm text-gray-600 leading-relaxed">
                  I agree to the{" "}
                  <a href="#" className="text-blue-600 hover:underline font-medium">Terms and Conditions</a>
                  {" "}and{" "}
                  <a href="#" className="text-blue-600 hover:underline font-medium">Privacy Policy</a>.
                  I understand this is a free worker account.
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); }}
                  className="flex-none px-5 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-all text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Create My Account
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline font-semibold">
              Sign In
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            Looking to hire?{" "}
            <Link to="/register" className="text-blue-600 hover:underline">
              Register as an Employer
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            © 2024 Kizazi Hire. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
