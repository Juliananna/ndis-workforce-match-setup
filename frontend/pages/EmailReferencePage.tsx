import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle, AlertTriangle, Loader2, ChevronRight, ChevronLeft,
  Star, ShieldAlert, ClipboardList, Building2, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import backend from "~backend/client";
import type { EmailReferenceFormData } from "~backend/admin/email_reference_form";
import type { ReferenceCheckScores } from "~backend/admin/reference_check";

type Step = "intro" | "verification" | "scoring" | "qualitative" | "done";

const SCORE_LABELS: Record<number, string> = { 1: "Poor", 2: "Below Average", 3: "Average", 4: "Good", 5: "Excellent" };
const CONCERNS_LABELS: Record<number, string> = {
  1: "Significant concerns", 2: "Notable concerns", 3: "Minor concerns (resolved)",
  4: "Minimal concerns", 5: "No concerns",
};
const REHIRE_LABELS: Record<number, string> = {
  1: "No", 2: "Probably not", 3: "Maybe / depends", 4: "Yes, likely", 5: "Yes, without hesitation",
};

function ScoreButton({ value, selected, label, onClick }: { value: number; selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
        selected
          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
          : "border-gray-200 bg-white text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
      }`}
    >
      <span>{value}</span>
      <span className="text-xs font-normal">{label}</span>
    </button>
  );
}

function ScoreRow({
  label, question, weight, critical, scoreKey, scores, onChange, customLabels,
}: {
  label: string; question: string; weight: number; critical?: boolean;
  scoreKey: keyof ReferenceCheckScores; scores: Partial<ReferenceCheckScores>;
  onChange: (k: keyof ReferenceCheckScores, v: number) => void;
  customLabels?: Record<number, string>;
}) {
  return (
    <div className="space-y-2 pb-5 border-b border-gray-100 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            {critical && <span className="text-xs text-amber-600 font-medium">★ Critical</span>}
            <span className="text-xs text-gray-400">×{weight}</span>
          </div>
          <p className="text-xs text-gray-500 italic">"{question}"</p>
        </div>
        {scores[scoreKey] !== undefined && (
          <span className="text-xs font-medium text-indigo-600 shrink-0">
            {scores[scoreKey]} × {weight} = {(scores[scoreKey] as number) * weight} pts
          </span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map((v) => (
          <ScoreButton
            key={v} value={v}
            label={customLabels?.[v] ?? SCORE_LABELS[v]}
            selected={scores[scoreKey] === v}
            onClick={() => onChange(scoreKey, v)}
          />
        ))}
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function FieldTextArea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />
    </div>
  );
}

export default function EmailReferencePage() {
  const { token } = useParams<{ token: string }>();
  const [formData, setFormData] = useState<EmailReferenceFormData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>("intro");
  const [conductedBy, setConductedBy] = useState("");
  const [relationship, setRelationship] = useState("");
  const [capacity, setCapacity] = useState("");
  const [employmentDates, setEmploymentDates] = useState("");
  const [reasonForLeaving, setReasonForLeaving] = useState("");
  const [scores, setScores] = useState<Partial<ReferenceCheckScores>>({});
  const [strengths, setStrengths] = useState("");
  const [developmentAreas, setDevelopmentAreas] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    backend.admin.publicGetEmailReferenceForm({ token })
      .then((data) => {
        setFormData(data);
        if (data.alreadyCompleted) setStep("done");
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Unable to load this reference form.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const setScore = (key: keyof ReferenceCheckScores, val: number) => {
    setScores((prev) => ({ ...prev, [key]: val }));
  };

  const scoringComplete =
    scores.workPerformance !== undefined && scores.reliability !== undefined &&
    scores.punctuality !== undefined && scores.professionalism !== undefined &&
    scores.qualityOfCare !== undefined && scores.documentation !== undefined &&
    scores.teamwork !== undefined && scores.initiative !== undefined &&
    scores.concerns !== undefined && scores.rehire !== undefined;

  const verificationComplete = relationship.trim() && capacity.trim() && employmentDates.trim();

  const handleSubmit = async () => {
    if (!token || !scoringComplete) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await backend.admin.publicSubmitEmailReferenceForm({
        token,
        conductedBy: conductedBy.trim() || (formData?.refereeName ?? "Referee"),
        relationship,
        capacity,
        employmentDates,
        reasonForLeaving,
        scores: scores as ReferenceCheckScores,
        strengths,
        developmentAreas,
        additionalComments,
      });
      setStep("done");
    } catch (e: unknown) {
      console.error("Failed to submit reference form:", e);
      setSubmitError(e instanceof Error ? e.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const steps: Step[] = ["intro", "verification", "scoring", "qualitative", "done"];
  const stepIdx = steps.indexOf(step);

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-500">Loading reference form…</p>
        </div>
      </PageShell>
    );
  }

  if (loadError) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">Link Unavailable</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">{loadError}</p>
          </div>
          <p className="text-xs text-gray-400 max-w-sm">
            If you believe this is an error, please contact <a href="mailto:compliance@kizazihire.com.au" className="text-indigo-600 underline">compliance@kizazihire.com.au</a>.
          </p>
        </div>
      </PageShell>
    );
  }

  if (step === "done") {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-xl">Thank you!</p>
            <p className="text-sm text-gray-600 mt-2 max-w-sm">
              Your reference has been submitted successfully for <strong>{formData?.workerName}</strong>.
              Your response has been securely filed and our compliance team will review it shortly.
            </p>
          </div>
          <p className="text-xs text-gray-400 max-w-sm mt-2">
            You may now close this tab. If you have any questions, contact us at <a href="mailto:compliance@kizazihire.com.au" className="text-indigo-600 underline">compliance@kizazihire.com.au</a>.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-900">Reference Check for {formData?.workerName}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-indigo-700">
                <Building2 className="h-3.5 w-3.5" />
                <span>{formData?.refereeTitle} at {formData?.refereeOrganisation}</span>
              </div>
            </div>
          </div>
        </div>

        {(step as string) !== "done" && (
          <div className="flex gap-1">
            {[
              { id: "intro", label: "Introduction" },
              { id: "verification", label: "Verification" },
              { id: "scoring", label: "Performance" },
              { id: "qualitative", label: "Comments" },
            ].map((s, i) => (
              <div key={s.id} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all ${
                  i < stepIdx ? "bg-indigo-500" : i === stepIdx ? "bg-indigo-300" : "bg-gray-200"
                }`} />
                <p className={`text-xs mt-1 text-center hidden sm:block ${i <= stepIdx ? "text-indigo-600 font-medium" : "text-gray-400"}`}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          {step === "intro" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
                <h2 className="font-bold text-gray-900 text-lg">Welcome to the Reference Check Form</h2>
              </div>
              <p className="text-sm text-gray-600">
                You have been listed as a referee for <strong>{formData?.workerName}</strong> who has applied through
                Kizazi Hire, a platform connecting disability support workers with NDIS service providers.
              </p>
              <p className="text-sm text-gray-600">
                We appreciate you taking the time to complete this reference. It should take approximately 10 minutes and
                covers questions about their work performance, reliability, and professionalism.
              </p>
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">Before you begin:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>All responses are confidential and stored securely</li>
                  <li>Scores are on a scale of 1 (Poor) to 5 (Excellent)</li>
                  <li>Please answer honestly — your feedback helps ensure quality care in the NDIS sector</li>
                  <li>This form can only be submitted once</li>
                </ul>
              </div>
              <FieldInput
                label="Your name"
                value={conductedBy}
                onChange={setConductedBy}
                placeholder={`e.g. ${formData?.refereeName ?? "Jane Smith"}`}
              />
            </div>
          )}

          {step === "verification" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
                <h2 className="font-bold text-gray-900">Applicant Verification</h2>
              </div>
              <p className="text-xs text-gray-500">These questions confirm the applicant's employment history. They are not scored.</p>
              <FieldInput label="What is your relationship to the applicant?" value={relationship} onChange={setRelationship} placeholder="e.g. Direct supervisor" required />
              <FieldInput label="In what capacity was the applicant employed?" value={capacity} onChange={setCapacity} placeholder="e.g. Support Worker (full time)" required />
              <FieldInput label="What were their employment dates?" value={employmentDates} onChange={setEmploymentDates} placeholder="e.g. Jan 2021 – Dec 2023" required />
              <FieldInput label="What was their reason for leaving? (optional)" value={reasonForLeaving} onChange={setReasonForLeaving} placeholder="e.g. Seeking new opportunities" />
            </div>
          )}

          {step === "scoring" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-indigo-600" />
                <h2 className="font-bold text-gray-900">Performance Scoring</h2>
              </div>
              <p className="text-xs text-gray-500">Rate each item from 1 (Poor) to 5 (Excellent). All items are required.</p>
              <div className="space-y-5">
                <ScoreRow label="Overall Work Performance" question="How would you rate their overall work performance?" weight={2} scoreKey="workPerformance" scores={scores} onChange={setScore} />
                <ScoreRow label="Reliability" question="How reliable were they in completing tasks and responsibilities?" weight={2} scoreKey="reliability" scores={scores} onChange={setScore} />
                <ScoreRow label="Punctuality & Attendance" question="How would you rate their punctuality and attendance?" weight={1} scoreKey="punctuality" scores={scores} onChange={setScore} />
                <ScoreRow label="Professionalism" question="How professional were they in communication, behaviour, and boundaries?" weight={2} scoreKey="professionalism" scores={scores} onChange={setScore} />
                <ScoreRow label="Quality of Care" question="How would you rate the quality of care they provided to clients?" weight={3} critical scoreKey="qualityOfCare" scores={scores} onChange={setScore} />
                <ScoreRow label="Documentation & Compliance" question="How well did they complete documentation and follow procedures?" weight={1} scoreKey="documentation" scores={scores} onChange={setScore} />
                <ScoreRow label="Teamwork" question="How well did they work with other staff and supervisors?" weight={1} scoreKey="teamwork" scores={scores} onChange={setScore} />
                <ScoreRow label="Initiative" question="How would you rate their initiative and problem-solving ability?" weight={1} scoreKey="initiative" scores={scores} onChange={setScore} />
              </div>

              <div className="rounded-lg border border-red-100 bg-red-50 p-4 space-y-5">
                <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" />Risk Assessment
                </p>
                <ScoreRow label="Performance Concerns" question="Have you had any concerns with their performance?" weight={3} scoreKey="concerns" scores={scores} onChange={setScore} customLabels={CONCERNS_LABELS} />
                <ScoreRow label="Would You Rehire?" question="Would you rehire this person?" weight={4} critical scoreKey="rehire" scores={scores} onChange={setScore} customLabels={REHIRE_LABELS} />
              </div>

              {scoringComplete && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-center">
                  <p className="text-xs text-indigo-500 mb-1">Your preliminary score</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {scores.workPerformance! * 2 + scores.reliability! * 2 + scores.punctuality! +
                      scores.professionalism! * 2 + scores.qualityOfCare! * 3 + scores.documentation! +
                      scores.teamwork! + scores.initiative! + scores.concerns! * 3 + scores.rehire! * 4}/100
                  </p>
                </div>
              )}
            </div>
          )}

          {step === "qualitative" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
                <h2 className="font-bold text-gray-900">Additional Comments</h2>
              </div>
              <p className="text-xs text-gray-500">Please keep answers brief — 1 to 2 sentences per field.</p>
              <FieldTextArea label="What are the applicant's key strengths?" value={strengths} onChange={setStrengths} placeholder="e.g. Excellent rapport with clients, proactive communicator" />
              <FieldTextArea label="What are their development areas?" value={developmentAreas} onChange={setDevelopmentAreas} placeholder="e.g. Could improve documentation timeliness" />
              <FieldTextArea label="Any additional comments we should be aware of?" value={additionalComments} onChange={setAdditionalComments} placeholder="e.g. Outstanding performance during a particularly challenging period" />
              {submitError && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />{submitError}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          {step !== "intro" && (
            <Button variant="outline" size="sm" onClick={() => setStep(steps[stepIdx - 1] as Step)} className="h-9 text-sm">
              <ChevronLeft className="h-4 w-4 mr-1" />Back
            </Button>
          )}
          <div className="flex-1" />
          {step === "intro" && (
            <Button size="sm" onClick={() => setStep("verification")} className="h-9 text-sm bg-indigo-600 hover:bg-indigo-700 text-white">
              Start Reference Check<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === "verification" && (
            <Button size="sm" onClick={() => setStep("scoring")} disabled={!verificationComplete} className="h-9 text-sm bg-indigo-600 hover:bg-indigo-700 text-white">
              Next: Performance<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === "scoring" && (
            <Button size="sm" onClick={() => setStep("qualitative")} disabled={!scoringComplete} className="h-9 text-sm bg-indigo-600 hover:bg-indigo-700 text-white">
              Next: Comments<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === "qualitative" && (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !scoringComplete}
              className="h-9 text-sm bg-green-600 hover:bg-green-700 text-white gap-1.5"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Submit Reference
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-gray-400">
          Kizazi Hire · Reference ID: {formData?.referenceId?.slice(0, 8)}…
        </p>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src="/kizazi-hire-logo.png" alt="Kizazi Hire" className="h-8" />
          <div className="h-5 w-px bg-gray-200" />
          <span className="text-sm font-medium text-gray-600">Secure Reference Check Form</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
