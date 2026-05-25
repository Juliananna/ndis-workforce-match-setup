import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ExternalLink, Loader2, Plus, ChevronRight, Sparkles, BarChart2 } from "lucide-react";
import backend from "~backend/client";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { useToast } from "@/components/ui/use-toast";
import type { ResumeSession } from "~backend/resume/types";
import { STEPS } from "../resume/types";

const STEP_LABELS = STEPS.map((s) => s.label);

function StrengthBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

export function ResumeBuilderSection() {
  const api = useAuthedBackend();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<ResumeSession | null | undefined>(undefined);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!api) return;
    api.resume.getWorkerResumeSession()
      .then((res) => setSession(res.session))
      .catch(() => setSession(null));
  }, [api]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await backend.resume.createSession({});
      navigate(`/resume-builder/${res.session.id}`);
    } catch (err: unknown) {
      console.error(err);
      toast({ title: "Could not start resume builder", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleContinue = () => {
    if (session) navigate(`/resume-builder/${session.id}`);
  };

  const handlePreview = () => {
    if (session) navigate(`/resume-builder/${session.id}/preview`);
  };

  const stepsDone = session ? Math.min(session.stepCompleted, STEP_LABELS.length) : 0;
  const totalSteps = STEP_LABELS.length;
  const progressPct = totalSteps > 0 ? Math.round((stepsDone / totalSteps) * 100) : 0;
  const isComplete = session && session.stepCompleted >= totalSteps;
  const strengthScore = session?.resumeStrengthScore ?? null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="h-7 w-7 rounded-lg bg-purple-50 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-purple-600" />
        </div>
        <h3 className="font-semibold text-gray-900">AI Resume Builder</h3>
      </div>

      <div className="p-5">
        {session === undefined ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : session === null ? (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
              <FileText className="h-7 w-7 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Build your NDIS resume</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                Our AI-powered builder guides you step-by-step to create a professional resume tailored for NDIS support roles.
              </p>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Start Resume Builder
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  isComplete
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {isComplete ? "Complete" : "In Progress"}
                </span>
                <span className="text-xs text-gray-400">
                  {stepsDone} / {totalSteps} steps
                </span>
              </div>
              {strengthScore !== null && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                  <BarChart2 className="h-3.5 w-3.5 text-purple-500" />
                  Strength: {strengthScore}%
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {strengthScore !== null && (
                <div className="pt-1">
                  <p className="text-xs text-gray-400 mb-1">Resume strength</p>
                  <StrengthBar score={strengthScore} />
                </div>
              )}
            </div>

            {!isComplete && session.stepCompleted < totalSteps && (
              <div className="rounded-xl bg-purple-50 border border-purple-100 px-4 py-3">
                <p className="text-xs font-semibold text-purple-700">Next step</p>
                <p className="text-xs text-purple-600 mt-0.5">
                  {STEP_LABELS[session.stepCompleted] ?? "Continue building your resume"}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleContinue}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {isComplete ? "Edit Resume" : "Continue Building"}
                <ChevronRight className="h-4 w-4" />
              </button>
              {isComplete && (
                <button
                  onClick={handlePreview}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Preview
                </button>
              )}
            </div>

            {session.aiSummary && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">AI Summary</p>
                <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">{session.aiSummary}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
