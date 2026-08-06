import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import backend from "~backend/client";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, Eye, Loader2, ExternalLink } from "lucide-react";
import { StepAboutYou } from "../resume/StepAboutYou";
import { StepTargetRole } from "../resume/StepTargetRole";
import { StepWorkHistory } from "../resume/StepWorkHistory";
import { StepSupportSkills } from "../resume/StepSupportSkills";
import { StepChecks } from "../resume/StepChecks";
import { StepQualifications } from "../resume/StepQualifications";
import { StepAvailability } from "../resume/StepAvailability";
import { StepCapabilities } from "../resume/StepCapabilities";
import type { SessionData } from "../resume/types";
import { STEPS } from "../resume/types";

const defaultSession = (): SessionData => ({
  id: "", stepCompleted: 0, email: null, firstName: null, lastName: null, phone: null,
  suburb: null, state: null, postcode: null, travelRadiusKm: null, targetRole: null,
  experienceLevel: null, experienceYears: null, supportSettings: [], supportTasks: [],
  supportStyle: null, capabilityStories: [], availability: [], driversLicence: false, ownVehicle: false,
  languages: [], workHistory: [], qualifications: [], training: [], checks: [], ndisScreeningNumber: null,
  resumeStrengthScore: null, scoreBreakdown: null, aiSummary: null, aiBullets: [], aiBio: null,
  aiSearchCard: null, aiInterviewPrompts: [], aiGenerationCount: 0, convertedWorkerId: null, status: "draft",
});

interface Props {
  onBack: () => void;
}

export function WorkerResumeTab({ onBack }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<SessionData>(defaultSession());
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backend.resume.workerCreateOrGetSession()
      .then(({ session: s }) => {
        setSession(s as SessionData);
        setCurrentStep(Math.min(s.stepCompleted, STEPS.length - 1));
      })
      .catch(() => {
        toast({ title: "Could not load resume session", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, []);

  const saveStep = useCallback(async (data: SessionData, step: number) => {
    if (!data.id) return;
    setSaving(true);
    try {
      await backend.resume.updateSession({
        id: data.id, stepCompleted: step,
        firstName: data.firstName ?? undefined,
        lastName: data.lastName ?? undefined,
        phone: data.phone ?? undefined,
        suburb: data.suburb ?? undefined,
        state: data.state ?? undefined,
        postcode: data.postcode ?? undefined,
        travelRadiusKm: data.travelRadiusKm ?? undefined,
        targetRole: data.targetRole ?? undefined,
        experienceLevel: data.experienceLevel ?? undefined,
        experienceYears: data.experienceYears ?? undefined,
        supportSettings: data.supportSettings,
        supportTasks: data.supportTasks,
        supportStyle: data.supportStyle ?? undefined,
        capabilityStories: data.capabilityStories,
        availability: data.availability,
        driversLicence: data.driversLicence,
        ownVehicle: data.ownVehicle,
        languages: data.languages,
        workHistory: data.workHistory,
        qualifications: data.qualifications,
        training: data.training,
        checks: data.checks,
        ndisScreeningNumber: data.ndisScreeningNumber ?? undefined,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, []);

  const handleChange = (field: string, value: unknown) => {
    setSession((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    const nextStep = currentStep + 1;
    await saveStep(session, nextStep);
    if (nextStep >= STEPS.length - 1) {
      navigate(`/resume-builder/preview/${session.id}`);
    } else {
      setCurrentStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      onBack();
    } else {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  const progress = (currentStep / (STEPS.length - 1)) * 100;

  return (
    <div className="bg-slate-50 min-h-full">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <img src="/kizazi-hire-logo.png" alt="KizaziHire" className="h-6 w-auto" />
              <span className="text-slate-400 font-normal hidden sm:block">Resume Builder</span>
            </div>
            <div className="flex items-center gap-3">
              {saving && <span className="text-xs text-slate-400">Saving…</span>}
              {session.id && (
                <button
                  onClick={() => navigate(`/resume-builder/preview/${session.id}`)}
                  className="flex items-center gap-1.5 text-xs text-teal-700 font-medium hover:underline"
                >
                  <Eye size={14} /> Preview
                </button>
              )}
              {session.id && (
                <a
                  href={`/resume-builder/session/${session.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                  title="Open in full page"
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-teal-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-slate-400">Step {currentStep + 1} of {STEPS.length}</span>
            <span className="text-xs font-medium text-teal-700">{STEPS[currentStep].label}</span>
          </div>
        </div>
      </div>

      <div className="hidden sm:block">
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="flex gap-1">
            {STEPS.map((step, idx) => (
              <button
                key={step.label}
                onClick={() => idx <= Math.max(currentStep, session.stepCompleted) && setCurrentStep(idx)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-all ${
                  idx === currentStep
                    ? "bg-teal-50 text-teal-700 font-semibold"
                    : idx <= session.stepCompleted
                    ? "text-slate-500 hover:bg-slate-100"
                    : "text-slate-300 cursor-not-allowed"
                }`}
              >
                <span className="text-base">{step.icon}</span>
                <span className="hidden lg:block">{step.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          {currentStep === 0 && <StepAboutYou data={session} onChange={handleChange} />}
          {currentStep === 1 && <StepTargetRole data={session} onChange={handleChange} />}
          {currentStep === 2 && <StepWorkHistory data={session} onChange={handleChange} />}
          {currentStep === 3 && <StepSupportSkills data={session} onChange={handleChange} />}
          {currentStep === 4 && <StepChecks data={session} onChange={handleChange} />}
          {currentStep === 5 && <StepQualifications data={session} onChange={handleChange} />}
          {currentStep === 6 && <StepAvailability data={session} onChange={handleChange} />}
          {currentStep === 7 && <StepCapabilities data={session} onChange={handleChange} />}
          {currentStep === 8 && (
            <div className="text-center space-y-4 py-4">
              <div className="text-5xl mb-2">✅</div>
              <h2 className="text-xl font-bold text-slate-800">You're almost done!</h2>
              <p className="text-sm text-slate-500">
                Click "View My Resume" to see your live preview, get your strength score and download your PDF.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : currentStep >= STEPS.length - 1 ? "View My Resume" : "Next"}
            {!saving && <ChevronRight size={16} />}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Your progress is automatically saved.
        </p>
      </div>
    </div>
  );
}
