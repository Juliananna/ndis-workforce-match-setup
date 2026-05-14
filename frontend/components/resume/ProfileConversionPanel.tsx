import { useState } from "react";
import { UserPlus, CheckCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import backend from "~backend/client";
import { useNavigate } from "react-router-dom";
import type { SessionData } from "./types";

interface Props {
  session: SessionData;
  onConverted: (workerId: string) => void;
}

export function ProfileConversionPanel({ session, onConverted }: Props) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(!!session.convertedWorkerId);

  if (done || session.convertedWorkerId) {
    return (
      <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 text-center space-y-3">
        <CheckCircle size={32} className="text-emerald-500 mx-auto" />
        <h3 className="font-bold text-emerald-800">KizaziHire profile created!</h3>
        <p className="text-sm text-emerald-700">Your information has been converted to a KizaziHire worker profile. Log in to complete your profile and get found by providers.</p>
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

  return (
    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 border border-teal-200 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <UserPlus size={20} className="text-teal-600" />
          <h3 className="font-bold text-slate-800">Join KizaziHire — it's free</h3>
        </div>
        <p className="text-sm text-slate-600">
          Convert your resume data into a KizaziHire worker profile. Your profile stays private until you choose to make it visible to providers.
        </p>
      </div>

      <ul className="space-y-2">
        {[
          "Your resume info pre-fills your profile — no re-entering data",
          "Get matched with NDIS provider job openings",
          "Upload documents and collect references",
          "Control who sees your profile at all times",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle size={15} className="text-teal-500 mt-0.5 shrink-0" />
            {item}
          </li>
        ))}
      </ul>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Create a password for your account
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        onClick={handleConvert}
        disabled={converting || !password}
        className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 text-white font-bold rounded-xl text-sm hover:bg-teal-700 transition-colors disabled:opacity-60"
      >
        {converting ? "Creating profile…" : "Create my KizaziHire profile"}
        {!converting && <ArrowRight size={16} />}
      </button>

      <p className="text-xs text-slate-400 text-center">
        Already have an account?{" "}
        <a href="/login" className="text-teal-600 hover:underline">Log in</a>
      </p>
    </div>
  );
}
