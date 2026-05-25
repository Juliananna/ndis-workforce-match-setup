import { useNavigate, useSearchParams } from "react-router-dom";
import backend from "~backend/client";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { CheckCircle, FileText, Star, Users, ShieldCheck, Download, ArrowRight, Sparkles, GraduationCap } from "lucide-react";

const BENEFITS = [
  { icon: FileText, title: "Free Professional Resume", desc: "Tailored for NDIS support worker roles in Australia" },
  { icon: Sparkles, title: "AI-Powered Content", desc: "Smart summaries written in NDIS-aligned Australian English" },
  { icon: Star, title: "Resume Strength Score", desc: "See how your profile compares and get tips to improve" },
  { icon: Download, title: "Instant PDF Download", desc: "Download your resume immediately, no account required" },
  { icon: Users, title: "Connect with Providers", desc: "Convert to a KizaziHire profile and get found by providers" },
  { icon: ShieldCheck, title: "Privacy First", desc: "You control who sees what — every field has visibility settings" },
];

const STEPS = [
  { num: "1", label: "Answer a quick questionnaire", sub: "About 10 minutes" },
  { num: "2", label: "Preview your resume", sub: "Live preview as you go" },
  { num: "3", label: "Get your strength score", sub: "Personalised tips included" },
  { num: "4", label: "Download your PDF", sub: "Free, no account needed" },
  { num: "5", label: "Join KizaziHire (optional)", sub: "Convert to a worker profile" },
];

export default function ResumeBuilderLandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const sourceParam = searchParams.get("source") ?? "";
  const rtoCode = searchParams.get("rtoCode") ?? "";
  const rtoId = searchParams.get("rtoId") ?? "";
  const isRtoSource = sourceParam === "rto";

  const handleStart = async () => {
    setLoading(true);
    try {
      const { session } = await backend.resume.createSession({});
      const params = new URLSearchParams({ id: session.id });
      if (isRtoSource) {
        params.set("source", "rto");
        if (rtoCode) params.set("rtoCode", rtoCode);
        if (rtoId) params.set("rtoId", rtoId);
      }
      navigate(`/resume-builder/session/${session.id}${isRtoSource ? `?source=rto&rtoCode=${rtoCode}&rtoId=${rtoId}` : ""}`);
    } catch (err) {
      console.error(err);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/kizazi-hire-logo.png" alt="KizaziHire" className="h-8 w-auto" />
            <span className="text-sm font-medium text-slate-500 hidden sm:block">Resume Builder</span>
          </div>
          <a href="/login" className="text-sm text-teal-700 font-medium hover:underline">
            Already have an account?
          </a>
        </div>
      </header>

      <section className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {isRtoSource && rtoCode && (
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-2 text-sm font-medium mb-4">
              <GraduationCap size={14} className="text-teal-200" />
              <span>Student pathway · RTO referral code: {rtoCode}</span>
            </div>
          )}
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Sparkles size={14} />
            <span>Free for NDIS Support Workers</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 leading-tight">
            Build Your NDIS Support Worker Resume in Minutes
          </h1>
          <p className="text-lg text-teal-100 mb-8 max-w-2xl mx-auto">
            Answer a few questions, get an AI-written professional resume in Australian English — then download your PDF or convert to a KizaziHire profile.
          </p>
          <button
            onClick={handleStart}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-white text-teal-700 font-bold px-8 py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-60"
          >
            {loading ? "Starting…" : "Start Building My Resume"}
            {!loading && <ArrowRight size={20} />}
          </button>
          <p className="text-teal-200 text-sm mt-4">No account required · Takes about 10 minutes</p>
        </div>
      </section>

      <section className="py-14 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-10">
            Everything you need to land your next role
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-teal-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
                <p className="text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-10">How it works</h2>
          <div className="space-y-4">
            {STEPS.map((step) => (
              <div key={step.num} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  {step.num}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{step.label}</div>
                  <div className="text-sm text-slate-500">{step.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button
              onClick={handleStart}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-teal-600 text-white font-bold px-8 py-4 rounded-xl text-lg hover:bg-teal-700 transition-colors disabled:opacity-60"
            >
              {loading ? "Starting…" : "Get Started — It's Free"}
              {!loading && <ArrowRight size={20} />}
            </button>
          </div>
        </div>
      </section>

      <section className="bg-teal-50 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { stat: "100%", label: "Free for workers" },
              { stat: "NDIS-aligned", label: "Australian English content" },
              { stat: "Privacy-first", label: "You control your data" },
            ].map(({ stat, label }) => (
              <div key={label}>
                <div className="text-2xl font-bold text-teal-700">{stat}</div>
                <div className="text-sm text-slate-600 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <span>© {new Date().getFullYear()} KizaziHire. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="/privacy-policy" className="hover:text-slate-600">Privacy Policy</a>
            <a href="/contact" className="hover:text-slate-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
