import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ChevronRight, ChevronLeft, CheckCircle, AlertTriangle, Phone,
  ClipboardList, Star, ShieldAlert, Loader2, X, TrendingUp,
} from "lucide-react";
import type { AdminReferenceView } from "~backend/admin/workers";
import type {
  ReferenceCheckResult, ReferenceCheckScores, SubmitReferenceCheckRequest,
} from "~backend/admin/reference_check";

interface Props {
  reference: AdminReferenceView;
  workerName: string;
  existingCheck: ReferenceCheckResult | null;
  onSubmit: (req: SubmitReferenceCheckRequest) => Promise<ReferenceCheckResult>;
  onClose: () => void;
}

type Step = "opening" | "verification" | "scoring" | "qualitative" | "result";

const SCORE_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Below Average",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

const RISK_CONFIG = {
  HIGH_RISK: { color: "bg-red-500/15 text-red-400 border-red-500/30", label: "High Risk – Do Not Hire", icon: "🔴" },
  CAUTION:   { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", label: "Caution – Review Required", icon: "🟡" },
  STRONG:    { color: "bg-green-500/15 text-green-400 border-green-500/30", label: "Strong Candidate", icon: "🟢" },
  EXCEPTIONAL: { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "Exceptional Candidate", icon: "🌟" },
};

function ScoreButton({ value, selected, onClick, label }: { value: number; selected: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
        selected
          ? "border-primary bg-primary/20 text-primary"
          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      <span>{value}</span>
      <span className="text-xs font-normal">{label ?? SCORE_LABELS[value]}</span>
    </button>
  );
}

function ScoreRow({
  label,
  question,
  weight,
  critical,
  scoreKey,
  scores,
  onChange,
  customLabels,
}: {
  label: string;
  question: string;
  weight: number;
  critical?: boolean;
  scoreKey: keyof ReferenceCheckScores;
  scores: Partial<ReferenceCheckScores>;
  onChange: (key: keyof ReferenceCheckScores, val: number) => void;
  customLabels?: Record<number, string>;
}) {
  return (
    <div className="space-y-2 pb-4 border-b border-border last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {critical && <span className="text-xs text-yellow-400">⭐ Critical</span>}
            <span className="text-xs text-muted-foreground/60">×{weight}</span>
          </div>
          <p className="text-xs text-muted-foreground italic">"{question}"</p>
        </div>
        {scores[scoreKey] !== undefined && (
          <span className="text-xs font-medium text-primary shrink-0">
            {scores[scoreKey]} × {weight} = {(scores[scoreKey] as number) * weight} pts
          </span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map((v) => (
          <ScoreButton
            key={v}
            value={v}
            label={customLabels?.[v]}
            selected={scores[scoreKey] === v}
            onClick={() => onChange(scoreKey, v)}
          />
        ))}
      </div>
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

const CONCERNS_LABELS: Record<number, string> = {
  1: "Significant concerns",
  2: "Notable concerns",
  3: "Minor concerns (resolved)",
  4: "Minimal concerns",
  5: "No concerns",
};

const REHIRE_LABELS: Record<number, string> = {
  1: "No",
  2: "Probably not",
  3: "Maybe / depends",
  4: "Yes, likely",
  5: "Yes, without hesitation",
};

export function ReferenceCheckWizard({ reference, workerName, existingCheck, onSubmit, onClose }: Props) {
  const [step, setStep] = useState<Step>(existingCheck ? "result" : "opening");
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
  const [result, setResult] = useState<ReferenceCheckResult | null>(existingCheck);
  const [error, setError] = useState<string | null>(null);

  const setScore = (key: keyof ReferenceCheckScores, val: number) => {
    setScores((prev) => ({ ...prev, [key]: val }));
  };

  const scoringComplete =
    scores.workPerformance !== undefined &&
    scores.reliability !== undefined &&
    scores.punctuality !== undefined &&
    scores.professionalism !== undefined &&
    scores.qualityOfCare !== undefined &&
    scores.documentation !== undefined &&
    scores.teamwork !== undefined &&
    scores.initiative !== undefined &&
    scores.concerns !== undefined &&
    scores.rehire !== undefined;

  const verificationComplete = relationship.trim() && capacity.trim() && employmentDates.trim();

  const handleSubmit = async () => {
    if (!scoringComplete) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await onSubmit({
        referenceId: reference.id,
        conductedBy: conductedBy.trim() || "Admin",
        relationship,
        capacity,
        employmentDates,
        reasonForLeaving,
        scores: scores as ReferenceCheckScores,
        strengths,
        developmentAreas,
        additionalComments,
      });
      setResult(res);
      setStep("result");
    } catch (e: unknown) {
      console.error("Reference check submit failed:", e);
      setError(e instanceof Error ? e.message : "Failed to submit reference check");
    } finally {
      setSubmitting(false);
    }
  };

  const steps: Step[] = ["opening", "verification", "scoring", "qualitative", "result"];
  const stepIdx = steps.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl flex flex-col max-h-[92vh]">

        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">Reference Check – {reference.refereeName}</p>
              <p className="text-xs text-muted-foreground">for {workerName} · {reference.refereeOrganisation}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step !== "result" && (
          <div className="flex gap-1 px-4 pt-3 shrink-0">
            {[
              { id: "opening", label: "Intro" },
              { id: "verification", label: "Verification" },
              { id: "scoring", label: "Scoring" },
              { id: "qualitative", label: "Notes" },
            ].map((s, i) => (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <div className={`h-1.5 flex-1 rounded-full transition-all ${
                  i < stepIdx ? "bg-primary" : i === stepIdx ? "bg-primary/60" : "bg-muted"
                }`} />
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">

          {step === "opening" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                  <Phone className="h-4 w-4" />Call Opening Script
                </div>
                <div className="text-sm text-blue-200/80 space-y-2">
                  <p>"Hi, my name is <span className="text-blue-300 font-medium">[Your Name]</span> from <span className="text-blue-300 font-medium">Whole Care Solutions</span>. I'm calling to complete a reference check for <span className="text-blue-300 font-medium">{workerName}</span>."</p>
                  <p>"Is now a good time? It should take about 10 minutes."</p>
                  <p>"Are you happy to provide a reference for them?"</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Referee Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground font-medium">{reference.refereeName}</span></div>
                  <div><span className="text-muted-foreground">Organisation:</span> <span className="text-foreground font-medium">{reference.refereeOrganisation}</span></div>
                  <div><span className="text-muted-foreground">Title:</span> <span className="text-foreground font-medium">{reference.refereeTitle}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground font-medium">{reference.refereePhone ?? "—"}</span></div>
                  {reference.refereeEmail && (
                    <div className="col-span-2"><span className="text-muted-foreground">Email:</span> <span className="text-foreground font-medium">{reference.refereeEmail}</span></div>
                  )}
                </div>
              </div>

              <TextField
                label="Your name (conducting this check)"
                value={conductedBy}
                onChange={setConductedBy}
                placeholder="e.g. Sarah – Whole Care Solutions"
              />

              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-300/80">
                <p className="font-medium text-yellow-300 mb-1">Scoring Guide</p>
                <p>"I'll ask a few questions rated from 1 to 5, where:</p>
                <p>1 = Poor &nbsp;·&nbsp; 2 = Below Average &nbsp;·&nbsp; 3 = Average &nbsp;·&nbsp; 4 = Good &nbsp;·&nbsp; 5 = Excellent"</p>
              </div>
            </div>
          )}

          {step === "verification" && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />Section 4 – Applicant Verification
              </p>
              <p className="text-xs text-muted-foreground">These questions are not scored.</p>
              <TextField
                label="What is your relationship to the applicant?"
                value={relationship}
                onChange={setRelationship}
                placeholder="e.g. Direct supervisor"
                required
              />
              <TextField
                label="In what capacity was the applicant employed?"
                value={capacity}
                onChange={setCapacity}
                placeholder="e.g. Support Worker (full time)"
                required
              />
              <TextField
                label="What were their employment dates?"
                value={employmentDates}
                onChange={setEmploymentDates}
                placeholder="e.g. Jan 2021 – Dec 2023"
                required
              />
              <TextField
                label="What was their reason for leaving?"
                value={reasonForLeaving}
                onChange={setReasonForLeaving}
                placeholder="e.g. Seeking new opportunities"
              />
            </div>
          )}

          {step === "scoring" && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />Sections 6 & 7 – Scored Questions
              </p>
              <p className="text-xs text-muted-foreground">Rate each item 1–5. Weighted scores are calculated automatically.</p>

              <div className="space-y-4">
                <ScoreRow label="Overall Work Performance" question="How would you rate their overall work performance?" weight={2} scoreKey="workPerformance" scores={scores} onChange={setScore} />
                <ScoreRow label="Reliability" question="How reliable were they in completing tasks and responsibilities?" weight={2} scoreKey="reliability" scores={scores} onChange={setScore} />
                <ScoreRow label="Punctuality & Attendance" question="How would you rate their punctuality and attendance?" weight={1} scoreKey="punctuality" scores={scores} onChange={setScore} />
                <ScoreRow label="Professionalism" question="How professional were they in communication, behaviour, and boundaries?" weight={2} scoreKey="professionalism" scores={scores} onChange={setScore} />
                <ScoreRow label="Quality of Care" question="How would you rate the quality of care they provided to clients?" weight={3} critical scoreKey="qualityOfCare" scores={scores} onChange={setScore} />
                <ScoreRow label="Documentation & Compliance" question="How well did they complete documentation and follow procedures?" weight={1} scoreKey="documentation" scores={scores} onChange={setScore} />
                <ScoreRow label="Teamwork" question="How well did they work with other staff and supervisors?" weight={1} scoreKey="teamwork" scores={scores} onChange={setScore} />
                <ScoreRow label="Initiative" question="How would you rate their initiative and problem-solving ability?" weight={1} scoreKey="initiative" scores={scores} onChange={setScore} />
              </div>

              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-4">
                <p className="text-sm font-semibold text-red-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" />Section 7 – Risk Assessment
                </p>
                <ScoreRow label="Performance Concerns" question="Have you had any concerns with their performance?" weight={3} scoreKey="concerns" scores={scores} onChange={setScore} customLabels={CONCERNS_LABELS} />
                <ScoreRow label="Would You Rehire?" question="Would you rehire this person?" weight={4} critical scoreKey="rehire" scores={scores} onChange={setScore} customLabels={REHIRE_LABELS} />
              </div>

              {scoringComplete && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-center">
                  <p className="text-muted-foreground text-xs mb-1">Preliminary Score</p>
                  <p className="text-2xl font-bold text-primary">
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
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />Section 8 – Qualitative Notes
              </p>
              <p className="text-xs text-muted-foreground">Limit answers to 1–2 sentences per question.</p>
              <TextArea
                label="What are the applicant's key strengths?"
                value={strengths}
                onChange={setStrengths}
                placeholder="e.g. Excellent rapport with clients, proactive communicator"
              />
              <TextArea
                label="What are their development areas?"
                value={developmentAreas}
                onChange={setDevelopmentAreas}
                placeholder="e.g. Could improve documentation timeliness"
              />
              <TextArea
                label="Any additional comments we should be aware of?"
                value={additionalComments}
                onChange={setAdditionalComments}
                placeholder="e.g. Outstanding performance during a particularly challenging period"
              />

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />{error}
                </div>
              )}
            </div>
          )}

          {step === "result" && result && (
            <ResultView result={result} reference={reference} workerName={workerName} />
          )}

        </div>

        <div className="flex items-center justify-between p-4 border-t border-border shrink-0 gap-3">
          {step !== "opening" && step !== "result" && (
            <Button variant="outline" size="sm" onClick={() => setStep(steps[stepIdx - 1] as Step)} className="h-8 text-xs">
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />Back
            </Button>
          )}
          {step === "result" && (
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
          )}
          {step === "opening" && (
            <>
              <div className="flex-1" />
              <Button size="sm" onClick={() => setStep("verification")} className="h-8 text-xs">
                Start Check<ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </>
          )}
          {step === "verification" && (
            <>
              <div className="flex-1" />
              <Button size="sm" onClick={() => setStep("scoring")} disabled={!verificationComplete} className="h-8 text-xs">
                Next: Scoring<ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </>
          )}
          {step === "scoring" && (
            <>
              <div className="flex-1" />
              <Button size="sm" onClick={() => setStep("qualitative")} disabled={!scoringComplete} className="h-8 text-xs">
                Next: Notes<ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </>
          )}
          {step === "qualitative" && (
            <>
              <div className="flex-1" />
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !scoringComplete}
                className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
                Submit & Verify
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultView({ result, reference, workerName }: { result: ReferenceCheckResult; reference: AdminReferenceView; workerName: string }) {
  const risk = RISK_CONFIG[result.riskLevel];
  const isHighRisk = result.riskLevel === "HIGH_RISK";
  const flagRehire = result.scores.rehire <= 2;
  const flagConcerns = result.scores.concerns <= 2;

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-5 text-center space-y-2 ${risk.color}`}>
        <p className="text-3xl">{risk.icon}</p>
        <p className="text-2xl font-bold">{result.totalScore}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
        <p className="font-semibold text-sm">{risk.label}</p>
        <Badge className={`text-sm px-3 py-1 ${
          result.recommendation === "Do Not Hire"
            ? "bg-red-500/20 text-red-300 border-red-500/30"
            : result.recommendation === "Hire with Caution"
            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
            : "bg-green-500/20 text-green-300 border-green-500/30"
        }`}>
          Recommendation: {result.recommendation}
        </Badge>
      </div>

      {(flagRehire || flagConcerns) && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-1">
          <p className="text-sm font-semibold text-red-400 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" />Automatic Flags Triggered
          </p>
          {flagRehire && <p className="text-xs text-red-300/80">🚨 Rehire score ≤ 2 – auto flag raised</p>}
          {flagConcerns && <p className="text-xs text-red-300/80">🚨 Concerns score ≤ 2 – performance concerns flagged</p>}
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" />Score Breakdown
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          {([
            ["Work Performance", result.scores.workPerformance, 2],
            ["Reliability", result.scores.reliability, 2],
            ["Punctuality", result.scores.punctuality, 1],
            ["Professionalism", result.scores.professionalism, 2],
            ["Quality of Care ⭐", result.scores.qualityOfCare, 3],
            ["Documentation", result.scores.documentation, 1],
            ["Teamwork", result.scores.teamwork, 1],
            ["Initiative", result.scores.initiative, 1],
            ["Concerns 🚨", result.scores.concerns, 3],
            ["Rehire 🚨", result.scores.rehire, 4],
          ] as [string, number, number][]).map(([label, score, weight]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground truncate">{label}</span>
              <span className="font-medium text-foreground shrink-0">{score}/5 ×{weight} = {score * weight}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Applicant Verification</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <div><span className="text-muted-foreground">Relationship:</span> <span className="text-foreground ml-1">{result.relationship}</span></div>
          <div><span className="text-muted-foreground">Capacity:</span> <span className="text-foreground ml-1">{result.capacity}</span></div>
          <div><span className="text-muted-foreground">Dates:</span> <span className="text-foreground ml-1">{result.employmentDates}</span></div>
          {result.reasonForLeaving && <div><span className="text-muted-foreground">Reason left:</span> <span className="text-foreground ml-1">{result.reasonForLeaving}</span></div>}
        </div>
      </div>

      {(result.strengths || result.developmentAreas || result.additionalComments) && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qualitative Notes</p>
          {result.strengths && <div className="text-xs"><span className="text-muted-foreground font-medium">Strengths: </span><span className="text-foreground">{result.strengths}</span></div>}
          {result.developmentAreas && <div className="text-xs"><span className="text-muted-foreground font-medium">Development: </span><span className="text-foreground">{result.developmentAreas}</span></div>}
          {result.additionalComments && <div className="text-xs"><span className="text-muted-foreground font-medium">Additional: </span><span className="text-foreground">{result.additionalComments}</span></div>}
        </div>
      )}

      <p className="text-xs text-muted-foreground/60 text-center">
        Conducted by {result.conductedBy} · {new Date(result.conductedAt).toLocaleString()}
      </p>
    </div>
  );
}
