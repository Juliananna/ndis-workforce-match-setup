import { useState } from "react";
import { CheckCircle, ArrowRight, Eye, EyeOff, Zap, Shield, Users, Star } from "lucide-react";
import backend from "~backend/client";
import { useNavigate } from "react-router-dom";
import type { SessionData } from "./types";

interface Props {
  session: SessionData;
  onConverted: (workerId: string) => void;
  compact?: boolean;
}

const PERKS = [
  { icon: Zap, text: "Resume data pre-fills your profile instantly" },
  { icon: Users, text: "Get matched with NDIS provider job openings" },
  { icon: Shield, text: "You control who sees your profile — always" },
  { icon: Star, text: "Collect references and upload your documents" },
];

export function ProfileConversionPanel({ session, onConverted, compact = false }: Props) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(!!session.convertedWorkerId);

  if (done || session.convertedWorkerId) {
    return (
      <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 text-center space-y-3">
        <CheckCircle size={36} className="text-emerald-500 mx-auto" />
        <h3 className="font-bold text-emerald-800 text-lg">KizaziHire profile created!</h3>
        <p className="text-sm text-emerald-700">Your resume has been converted to a KizaziHire worker profile. Log in to complete your profile and get found by providers.</p>
        <button
          onClick={() => navigate("/login")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-bold rounded-xl text-sm hover:bg-teal-700 transition-colors"
        >
          Log in to my profile <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  const handleConvert = async () => {
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setConverting(true);
    try {
      const result = await backend.resume.convertToProfile({ id: session.id, password });
      setDone(true);
      onConverted(result.workerId);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setConverting(false);
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password (8+ characters)"
            className="w-full px-3 py-2.5 pr-10 rounded-lg border border-white/30 bg-white/20 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error && <p className="text-xs text-red-200">{error}</p>}
        <button
          onClick={handleConvert}
          disabled={converting || !password}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white text-teal-700 font-bold rounded-xl text-sm hover:bg-teal-50 transition-colors disabled:opacity-60 shadow-md"
        >
          {converting ? "Creating profile…" : "Create my free profile"}
          {!converting && <ArrowRight size={16} />}
        </button>
        <p className="text-xs text-white/60 text-center">
          Account email: {session.email} ·{" "}
          <a href="/login" className="underline hover:text-white">Already have an account?</a>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-teal-200 shadow-lg">
      <div className="bg-gradient-to-br from-teal-600 to-emerald-600 px-6 pt-6 pb-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🎉</span>
          <h3 className="font-extrabold text-xl">Your resume is ready!</h3>
        </div>
        <p className="text-teal-100 text-sm">Join KizaziHire free and turn your resume into a live worker profile.</p>
      </div>

      <div className="bg-white px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {PERKS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-2 text-sm text-slate-700">
              <Icon size={15} className="text-teal-500 mt-0.5 shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Create a password for your account
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConvert()}
              placeholder="At least 8 characters"
              className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">Account email: {session.email}</p>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button
          onClick={handleConvert}
          disabled={converting || !password}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-xl text-sm hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-60 shadow-md hover:shadow-lg"
        >
          {converting ? "Creating profile…" : "Create my free KizaziHire profile"}
          {!converting && <ArrowRight size={16} />}
        </button>

        <p className="text-xs text-slate-400 text-center">
          Free forever · No credit card · Cancel anytime ·{" "}
          <a href="/login" className="text-teal-600 hover:underline">Already have an account?</a>
        </p>
      </div>
    </div>
  );
}
