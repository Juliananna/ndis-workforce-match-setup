import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, User, Building2, Mail } from "lucide-react";
import backend from "~backend/client";
import { emailError, phoneError } from "../lib/validation";

type Role = "WORKER" | "EMPLOYER";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("WORKER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [abn, setAbn] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ email: string } | null>(null);

  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const emailErr = emailTouched ? emailError(email) : null;
  const phoneErr = phoneTouched ? phoneError(phone) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPhoneTouched(true);

    if (emailError(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (phoneError(phone)) {
      setError("Please enter a valid Australian phone number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms and Conditions.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await backend.auth.register({
        email,
        password,
        role,
        name,
        phone,
        ...(role === "EMPLOYER" && {
          organisation_name: organisationName,
          contact_person: contactPerson,
          abn,
        }),
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm mb-2">
            We sent a verification link to:
          </p>
          <p className="font-semibold text-gray-800 mb-6">{success.email}</p>
          <p className="text-gray-400 text-xs mb-6">
            Click the link in the email to verify your account, then sign in. Check your spam folder if you don't see it.
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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col items-start justify-start p-12 relative overflow-hidden">
        <div className="relative z-10 w-full flex flex-col h-full">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-10 self-start">
            <div className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-white text-sm font-medium">Join 5,000+ Providers & Workers</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Join the<br />community.<br />
            <span className="text-blue-200">Find your perfect<br />match.</span>
          </h1>

          <p className="text-blue-100 text-base mb-auto">
            Empowering the NDIS workforce with intuitive<br />
            matching technology built on empathy and trust.
          </p>

          <div className="mt-8 relative">
            <img
              src="/create account image 1.png"
              alt="NDIS workforce team"
              className="w-full rounded-2xl object-cover"
            />
            <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Verified Provider</p>
                <p className="text-xs text-blue-200">Ready to hire</p>
                <div className="mt-1 h-1 rounded-full bg-white/20 w-24">
                  <div className="h-1 rounded-full bg-gradient-to-r from-pink-400 to-indigo-300 w-4/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-8 py-12 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Create an account</h2>
            <p className="text-gray-500 mt-1">Start your journey with Kizazi Hire today.</p>
          </div>

          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setRole("WORKER")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                role === "WORKER"
                  ? "bg-white text-blue-600 shadow-sm border border-blue-100"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <User className="h-4 w-4" />
              I am a Support Worker
            </button>
            <button
              type="button"
              onClick={() => setRole("EMPLOYER")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                role === "EMPLOYER"
                  ? "bg-white text-blue-600 shadow-sm border border-blue-100"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Building2 className="h-4 w-4" />
              I am an Employer
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 mb-4">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
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
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                required
                className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  emailErr ? "border-red-400 focus:ring-red-400" : "border-gray-200 focus:ring-blue-500"
                }`}
              />
              {emailErr && <p className="mt-1 text-xs text-red-600">{emailErr}</p>}
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

            {role === "WORKER" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  placeholder="04XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => setPhoneTouched(true)}
                  required
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    phoneErr ? "border-red-400 focus:ring-red-400" : "border-gray-200 focus:ring-blue-500"
                  }`}
                />
                {phoneErr && <p className="mt-1 text-xs text-red-600">{phoneErr}</p>}
              </div>
            )}

            {role === "EMPLOYER" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Organisation Name</label>
                  <input
                    type="text"
                    placeholder="Sunshine Care Pty Ltd"
                    value={organisationName}
                    onChange={(e) => setOrganisationName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Person</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                    <input
                      type="tel"
                      placeholder="04XX XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={() => setPhoneTouched(true)}
                      required
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        phoneErr ? "border-red-400 focus:ring-red-400" : "border-gray-200 focus:ring-blue-500"
                      }`}
                    />
                    {phoneErr && <p className="mt-1 text-xs text-red-600">{phoneErr}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">ABN</label>
                    <input
                      type="text"
                      placeholder="XX XXX XXX XXX"
                      value={abn}
                      onChange={(e) => setAbn(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex items-start gap-3 pt-1">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="agree" className="text-sm text-gray-600">
                I agree to the{" "}
                <a href="#" className="text-blue-600 hover:underline font-medium">Terms and Conditions</a>
                {" "}and{" "}
                <a href="#" className="text-blue-600 hover:underline font-medium">Privacy Policy</a>.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Account
              {!loading && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline font-semibold">
              Log In
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2024 Kizazi Hire. All rights reserved.{" "}
            <a href="#" className="hover:underline">Help Center</a>
            {" · "}
            <a href="#" className="hover:underline">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}
