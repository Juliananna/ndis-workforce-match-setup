import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, Mail, Lock, Sparkles, Database } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import backend from "~backend/client";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      await backend.admin.seed();
      setSeeded(true);
    } catch (err: unknown) {
      console.error(err);
      setSeedError(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailNotVerified(false);
    setResendDone(false);
    setLoading(true);
    try {
      const resp = await backend.auth.login({ email, password });
      await login(resp.token);
      navigate("/dashboard");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Login failed. Check your credentials.";
      if (msg.includes("email_not_verified")) {
        setEmailNotVerified(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    setResending(true);
    try {
      await backend.auth.resendVerification({ email: email.trim() });
      setResendDone(true);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-900/40" />
        <div className="relative z-10 text-center max-w-md">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-10">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-white text-sm font-medium tracking-wide uppercase">Verified Marketplace</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Welcome back!{" "}
            <span className="text-blue-200">Connecting</span>{" "}
            the NDIS community together.
          </h1>

          <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-lg mb-4">
              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Match Found</p>
                <p className="text-xs text-gray-500">Perfect fit confirmed</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/80 rounded-xl p-3 shadow">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Schedule Updated</p>
                <p className="text-xs text-gray-500">Your shifts are ready</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 flex items-center gap-2">
          <img
            src="/kizazi-hire-logo.png"
            alt="KizaziHire logo"
            className="h-8 w-8 rounded-lg object-cover opacity-60"
          />
          <span className="text-white/40 text-sm font-bold tracking-widest">KIZAZIHIRE</span>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-8 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Login to your portal</h2>
            <p className="text-gray-500 mt-1">Please enter your credentials to continue.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 mb-6">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {emailNotVerified && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 mb-6">
              <div className="flex items-start gap-2 text-sm text-yellow-800 mb-3">
                <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Your email address hasn't been verified yet. Please check your inbox for the verification link.</span>
              </div>
              {resendDone ? (
                <p className="text-xs text-green-700">A new verification link has been sent to <strong>{email}</strong>.</p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="flex items-center gap-1.5 text-xs font-medium text-yellow-700 hover:text-yellow-900 underline"
                >
                  {resending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Resend verification email
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <RouterLink to="/forgot-password" className="text-sm text-blue-600 hover:underline font-medium">Forgot Password?</RouterLink>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Log In
              {!loading && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Or continue with</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors shadow-sm">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors shadow-sm">
              <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              SSO
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 hover:underline font-semibold">
              Sign up
            </Link>
          </p>

          <div className="flex items-center justify-center gap-6 mt-8 text-xs text-gray-400">
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Support</a>
          </div>

          <div className="mt-6 flex flex-col items-center gap-2">
            <Link
              to="/demo"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors group"
            >
              <Sparkles className="h-3 w-3 group-hover:text-indigo-500 transition-colors" />
              Demo Portal
            </Link>

            {!seeded ? (
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-500 transition-colors group disabled:opacity-50"
                >
                  {seeding ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Database className="h-3 w-3 group-hover:text-orange-400 transition-colors" />
                  )}
                  {seeding ? "Seeding..." : "Seed Database"}
                </button>
                {seedError && <p className="text-xs text-red-500">{seedError}</p>}
              </div>
            ) : (
              <p className="text-xs text-green-600">Database seeded. Use worker1@seeddata.com.au / Password123!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
