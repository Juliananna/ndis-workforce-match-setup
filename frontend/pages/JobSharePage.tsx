import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  MapPin, Clock, Zap, Loader2, AlertCircle,
  Lock, Mail, CheckCircle2, Users, TrendingUp, HeartHandshake,
  ShieldCheck, BadgeCheck, Bell, HelpCircle,
} from "lucide-react";
import backend from "~backend/client";
import { useAuth } from "../contexts/AuthContext";
import type { PublicJobDetails } from "~backend/jobs/public_get";

type Tab = "signup" | "login";

function formatDate(d: string | Date | null) {
  if (!d) return null;
  const str = d instanceof Date ? d.toISOString().slice(0, 10) : String(d);
  const [y, m, day] = str.split("-");
  return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function timeAgo(d: Date) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function JobSharePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { token, login } = useAuth();

  const [job, setJob] = useState<PublicJobDetails | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("signup");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    setLoadingJob(true);
    backend.jobs.getPublicJob({ jobId })
      .then(setJob)
      .catch((e) => setJobError(e instanceof Error ? e.message : "Job not found"))
      .finally(() => setLoadingJob(false));
  }, [jobId]);

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true });
  }, [token, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const resp = await backend.auth.login({ email: loginEmail, password: loginPassword });
      await login(resp.token);
      navigate("/dashboard");
    } catch (err: unknown) {
      console.error(err);
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegLoading(true);
    try {
      await backend.auth.register({
        email: regEmail,
        password: regPassword,
        role: "WORKER",
        name: regName,
        phone: regPhone,
      });
      setRegSuccess(true);
    } catch (err: unknown) {
      console.error(err);
      setRegError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setRegLoading(false);
    }
  };

  const jobTitle = job?.jobTitle ?? (job?.jobType === "general" ? "Support Worker" : "Shift Support Worker");
  const shiftDate = job?.shiftDate ? formatDate(job.shiftDate) : null;

  return (
    <div className="min-h-screen bg-[#eef0f6] flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Kizazi<span className="text-indigo-600">Hire</span></span>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
              <span className="hover:text-gray-900 cursor-pointer font-medium">Find Jobs</span>
              <span className="hover:text-gray-900 cursor-pointer font-medium">For Providers</span>
              <span className="hover:text-gray-900 cursor-pointer font-medium">Resources</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
              <HelpCircle className="h-4 w-4" />
            </button>
            <button className="h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
              <Bell className="h-4 w-4" />
            </button>
            <button
              onClick={() => setTab("signup")}
              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              Join Kizazi Hire
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* Left: Job Card */}
          <div className="w-full lg:w-[310px] lg:shrink-0 space-y-4">
            {loadingJob ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-center min-h-56">
                <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
              </div>
            ) : jobError || !job ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{jobError ?? "This job is no longer available."}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-l-4 border-indigo-500 border-t-gray-200 border-r-gray-200 border-b-gray-200 overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: "#4f46e5" }}>
                  <div className="p-5">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">
                        Featured Job
                      </span>
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3" />Verified Employer
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-1">{jobTitle}</h2>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
                      <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span>{job.location}</span>
                    </div>

                    {/* Salary box */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Salary Range</p>
                        <p className="text-2xl font-extrabold text-gray-900">
                          ${job.weekdayRate}{job.weekendRate !== job.weekdayRate ? `–${job.weekendRate}` : ""}
                          <span className="text-sm font-semibold text-gray-500">/hr</span>
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="space-y-2.5 text-sm mb-5">
                      {job.jobType === "general" ? (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                          <span>Full-time &amp; Casual available</span>
                        </div>
                      ) : (
                        shiftDate && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                            <span>{shiftDate}{job.shiftStartTime ? ` · ${job.shiftStartTime}` : ""}{job.shiftDurationHours ? ` · ${job.shiftDurationHours}h` : ""}</span>
                          </div>
                        )
                      )}
                      <div className="flex items-center gap-2 text-gray-400">
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Posted {timeAgo(job.createdAt)}</span>
                      </div>
                      {job.isEmergency && (
                        <div className="flex items-center gap-2 text-orange-500">
                          <Zap className="h-4 w-4 shrink-0" />
                          <span className="font-semibold">Emergency Shift</span>
                        </div>
                      )}
                    </div>

                    {/* Tags teaser */}
                    {job.supportTypeTags.length > 0 && (
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs text-gray-400 italic mb-2">"Sign up to see the full schedule and requirements"</p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.supportTypeTags.slice(0, 3).map((t) => (
                            <span key={t} className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">{t}</span>
                          ))}
                          {job.supportTypeTags.length > 3 && (
                            <span className="text-xs text-gray-400 self-center">+{job.supportTypeTags.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Social proof */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-indigo-600" />
                  </div>
                  <p className="text-sm text-indigo-700 font-medium leading-snug">
                    Over 500+ workers joined this week in{" "}
                    {job.location.split(",")[0] || "your area"}.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Right: Hero + Form */}
          <div className="flex-1 w-full">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex flex-col lg:flex-row min-h-[560px]">

                {/* Hero copy */}
                <div className="flex-1 p-8 lg:p-10 relative overflow-hidden">
                  <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-[1.1] mb-4">
                    Find Your Next{" "}
                    <span className="text-indigo-600 italic">Meaningful</span>
                    {" "}Role with{" "}
                    Kizazi Hire
                  </h1>
                  <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-sm">
                    Unlock This Opportunity and join thousands of dedicated professionals who are redefining the NDIS marketplace experience.
                  </p>

                  <div className="space-y-3 mb-8 relative z-10">
                    {[
                      { icon: <HeartHandshake className="h-4 w-4 text-indigo-500" />, text: "Direct connection with employers" },
                      { icon: <TrendingUp className="h-4 w-4 text-indigo-500" />, text: "Higher pay rates & transparent earnings" },
                      { icon: <Users className="h-4 w-4 text-indigo-500" />, text: "Supportive community & resource hub" },
                    ].map((item) => (
                      <div key={item.text} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          {item.icon}
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{item.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                    <button
                      onClick={() => setTab("signup")}
                      className="py-3.5 px-7 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-indigo-200 text-center"
                    >
                      Create Free Account
                    </button>
                    <button
                      onClick={() => setTab("login")}
                      className="py-3.5 px-7 text-gray-700 hover:text-gray-900 font-semibold rounded-xl text-sm transition-colors text-center"
                    >
                      Already a member? Log In
                    </button>
                  </div>

                  {/* Floating illustration — bottom right */}
                  <div className="absolute bottom-0 right-0 w-56 h-56 lg:w-72 lg:h-72 pointer-events-none select-none">
                    <img
                      src="/Gemini_Generated_Image_3s76j33s76j33s76.png"
                      alt="NDIS support workers"
                      className="w-full h-full object-contain object-bottom"
                    />
                  </div>
                </div>

                {/* Auth panel */}
                <div className="lg:w-[330px] shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 bg-gray-50/70 p-7">
                  <div className="flex gap-1 mb-6 bg-gray-200/60 rounded-xl p-1">
                    <button
                      onClick={() => setTab("signup")}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                        tab === "signup" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Sign Up
                    </button>
                    <button
                      onClick={() => setTab("login")}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                        tab === "login" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Log In
                    </button>
                  </div>

                  {tab === "login" ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      {loginError && (
                        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="email"
                            required
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold text-gray-600">Password</label>
                          <Link to="/forgot-password" className="text-xs text-indigo-600 hover:underline">Forgot?</Link>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="password"
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-indigo-200 disabled:opacity-60"
                      >
                        {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log In & Apply"}
                      </button>
                      <p className="text-center text-xs text-gray-500">
                        New here?{" "}
                        <button type="button" onClick={() => setTab("signup")} className="text-indigo-600 hover:underline font-semibold">
                          Create free account
                        </button>
                      </p>
                    </form>
                  ) : regSuccess ? (
                    <div className="text-center py-6 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                      <p className="font-bold text-gray-900">Account created!</p>
                      <p className="text-xs text-gray-500">
                        Check <strong>{regEmail}</strong> to verify your email, then log in to apply.
                      </p>
                      <button
                        onClick={() => { setRegSuccess(false); setTab("login"); }}
                        className="text-sm text-indigo-600 hover:underline font-semibold"
                      >
                        Go to login
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSignup} className="space-y-3">
                      {regError && (
                        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{regError}</span>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Jane Smith"
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                        <input
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="04XX XXX XXX"
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="password"
                            required
                            minLength={8}
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Min 8 characters"
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={regLoading}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-indigo-200 disabled:opacity-60 mt-1"
                      >
                        {regLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Free Account"}
                      </button>
                      <p className="text-center text-xs text-gray-500">
                        Already a member?{" "}
                        <button type="button" onClick={() => setTab("login")} className="text-indigo-600 hover:underline font-semibold">
                          Log in
                        </button>
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center mb-3">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5">Verified &amp; Secure</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  All providers and employers undergo a multi-step verification process to ensure the highest standards of care and safety.
                </p>
              </div>

              <div className="bg-indigo-700 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex -space-x-2">
                    {["#a78bfa", "#818cf8", "#6366f1"].map((c, i) => (
                      <div
                        key={i}
                        className="h-8 w-8 rounded-full border-2 border-indigo-700 flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: c }}
                      >
                        {["A", "B", "C"][i]}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-bold bg-indigo-500 px-2 py-0.5 rounded-full">12k</span>
                </div>
                <h3 className="font-bold text-white mb-1.5">Join Our Network</h3>
                <p className="text-sm text-indigo-200 leading-relaxed">
                  Be part of the largest network of independent NDIS professionals in Australia.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">© 2024 Kizazi Hire. Empowering the NDIS community.</p>
          <div className="flex items-center gap-5 text-xs text-gray-400">
            <Link to="/privacy-policy" className="hover:text-gray-600">Privacy Policy</Link>
            <a href="#" className="hover:text-gray-600">Terms of Service</a>
            <a href="#" className="hover:text-gray-600">Contact Us</a>
            <a href="#" className="hover:text-gray-600">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
