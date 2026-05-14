import { useState } from "react";
import { CheckCircle, ArrowRight, Zap, Shield, Users, Star, Loader2 } from "lucide-react";
import backend from "~backend/client";
import { useNavigate } from "react-router-dom";
import type { SessionData } from "./types";

interface Props  {
  session: SessionData;
  onConverted: (workerId: string) => void;
}

const PERKS = [
  { icon: Zap, text: "Resume data pre-fills your profile instantly" },
  { icon: Users, text: "Get matched with NDIS provider job openings" },
  { icon: Shield, text: "You control who sees your profile — always" },
  { icon: Star, text: "Collect references and upload your documents" },
];

export function ProfileConversionPanel({ session, onConverted }: Props) {
  const navigate = useNavigate();
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(!!session.convertedWorkerId);

  if (done || session.convertedWorkerId) {
    return (
      <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 text-center space-y-3">
        <CheckCircle size={36} className="text-emerald-500 mx-auto" />
        <h3 className="font-bold text-emerald-800 text-lg">KizaziHire profile created!</h3>
        <p className="text-sm text-emerald-700">Check your email for the set-password link, then log in to complete your profile and get found by providers.</p>
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
    setConverting(true);
    try {
      const result = await backend.resume.convertToProfile({ id: session.id });
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

        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button
          onClick={handleConvert}
          disabled={converting}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-xl text-sm hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-60 shadow-md hover:shadow-lg"
        >
          {converting ? (
            <><Loader2 size={16} className="animate-spin" /> Creating profile…</>
          ) : (
            <>Create my free KizaziHire profile <ArrowRight size={16} /></>
          )}
        </button>

        <p className="text-xs text-slate-400 text-center">
          Free forever · No credit card · We'll email you a set-password link ·{" "}
          <a href="/login" className="text-teal-600 hover:underline">Already have an account?</a>
        </p>
      </div>
    </div>
  );
}
