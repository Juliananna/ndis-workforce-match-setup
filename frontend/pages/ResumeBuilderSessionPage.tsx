import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import backend from "~backend/client";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, Eye, LayoutDashboard, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { StepAboutYou } from "../components/resume/StepAboutYou";
import { StepTargetRole } from "../components/resume/StepTargetRole";
import { StepWorkHistory } from "../components/resume/StepWorkHistory";
import { StepSupportSkills } from "../components/resume/StepSupportSkills";
import { StepChecks } from "../components/resume/StepChecks";
import { StepQualifications } from "../components/resume/StepQualifications";
import { StepAvailability } from "../components/resume/StepAvailability";
import { StepCapabilities } from "../components/resume/StepCapabilities";
import type { SessionData } from "../components/resume/types";
import { STEPS } from "../components/resume/types";
import { storeSessionToken, getSessionToken } from "../lib/sessionToken";

const RESUME_MAX_STEP = 8;

const defaultSession = (): SessionData => ({
  id: "", stepCompleted: 0, email: null, firstName: null, lastName: null, phone: null,
  suburb: null, state: null, postcode: null, travelRadiusKm: null, targetRole: null,
  experienceLevel: null, experienceYears: null, supportSettings: [], supportTasks: [],
  supportStyle: null, capabilityStories: [], availability: [], driversLicence: false, ownVehicle: false,
  languages: [], workHistory: [], qualifications: [], training: [], checks: [], ndisScreeningNumber: null,
  resumeStrengthScore: null, scoreBreakdown: null, aiSummary: null, aiBullets: [], aiBio: null,
  aiSearchCard: null, aiInterviewPrompts: [], aiGenerationCount: 0, convertedWorkerId: null, status: "draft",
});

export default function ResumeBuilderSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { token, user } = useAuth();
  const isAuthenticated = !!token;
  const [session, setSession] = useState<SessionData>(defaultSession());
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    const sessionToken = getSessionToken(id);
    backend.resume.getSession({ id, sessionToken }).then(({ session: s }) => {
      const sessionData = s as SessionData;
      if (!sessionData.email && user?.email) {
        sessionData.email = user.email;
      }
      setSession(sessionData);
      setCurrentStep(Math.min(s.stepCompleted ?? 0, STEPS.length - 1));
    }).catch(() => {
      toast({ title: "Session not found", description: "Starting a new session.", variant: "destructive" });
      navigate("/resume-builder");
    }).finally(() => setLoading(false));
  }, [id, user]);

  const saveStep = useCallback(async (data: SessionData, step: number): Promise<boolean> => {
    if (!data.id) return false;
    if (saveInFlightRef.current) return false;

    const clampedStep = Math.min(step, RESUME_MAX_STEP);
    saveInFlightRef.current = true;
    setSaving(true);
    setSaveError(null);

    try {
      const sessionToken = getSessionToken(data.id);
      const { session: updated } = await backend.resume.updateSession({
        id: data.id,
        sessionToken,
        stepCompleted: clampedStep,
        email: data.email ?? undefined,
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
      setSession((prev) => ({ ...prev, stepCompleted: updated.stepCompleted ?? prev.stepCompleted }));
      return true;
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      setSaveError(`Could not save your progress: ${msg}. Your answers are still here — please try again.`);
      return false;
    } finally {
      setSaving(false);
      saveInFlightRef.current = false;
    }
  }, []);

  const handleChange = (field: string, value: any) => {
    setSession((prev) => ({ ...prev, [field]: value }));
    setSaveError(null);
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      if (!session.firstName?.trim() || !session.lastName?.trim()) {
        toast({ title: "Name required", description: "Please enter your first and last name to continue.", variant: "destructive" });
        return;
      }
      if (!session.email?.trim() || !session.email.includes("@")) {
        toast({ title: "Email required", description: "Please enter a valid email address to continue.", variant: "destructive" });
        return;
      }
    }

    const nextStep = currentStep + 1;
    const targetStep = Math.min(nextStep, RESUME_MAX_STEP);
    const saved = await saveStep(session, targetStep);
    if (!saved) {
      return;
    }

    if (nextStep >= STEPS.length - 1) {
      navigate(`/resume-builder/preview/${session.id}`);
    } else {
      setCurrentStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setSaveError(null);
    if (currentStep === 0) {
      navigate(isAuthenticated ? "/dashboard" : "/resume-builder");
    } else {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const progress = (currentStep / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mr-2"
                >
                  <LayoutDashboard size={14} /> Dashboard
                </button>
              )}
              <img src="/kizazi-hire-logo.png" alt="KizaziHire" className="h-7 w-auto" />
              <span className="text-xs text-slate-400 hidden sm:block">Resume Builder</span>
            </div>
            <div className="flex items-center gap-3">
              {saving && <span className="text-xs text-slate-400">Saving…</span>}
              <button
                onClick={() => navigate(`/resume-builder/preview/${session.id}`)}
                className="flex items-center gap-1.5 text-xs text-teal-700 font-medium hover:underline"
              >
                <Eye size={14} /> Preview
              </button>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-teal-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-slate-400">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <span className="text-xs font-medium text-teal-700">{STEPS[currentStep].label}</span>
          </div>
        </div>
      </header>

      <div className="hidden sm:block">
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="flex gap-1">
            {STEPS.map((step, idx) => (
              <button
                key={step.label}
                onClick={() => idx <= Math.max(currentStep, session.stepCompleted ?? 0) && setCurrentStep(idx)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-all ${
                  idx === currentStep
                    ? "bg-teal-50 text-teal-700 font-semibold"
                    : idx <= (session.stepCompleted ?? 0)
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

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          {currentStep === 0 && <StepAboutYou data={session} onChange={handleChange} emailLocked={isAuthenticated} />}
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

        {saveError && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-700">{saveError}</p>
            </div>
            <button
              onClick={() => handleNext()}
              disabled={saving}
              className="flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-900 shrink-0"
            >
              <RefreshCw size={12} className={saving ? "animate-spin" : ""} />
              Retry
            </button>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleBack}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-colors disabled:opacity-60"
          >
            {saving ? (
              <><RefreshCw size={16} className="animate-spin" /> Saving…</>
            ) : currentStep >= STEPS.length - 1 ? (
              <>View My Resume <ChevronRight size={16} /></>
            ) : (
              <>Next <ChevronRight size={16} /></>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Your progress is saved as you go. Return to this page any time using this link.
        </p>
      </main>
    </div>
  );
}
