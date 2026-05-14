import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import backend from "~backend/client";
import { useToast } from "@/components/ui/use-toast";
import { Download, ArrowLeft, Sparkles, RefreshCw } from "lucide-react";
import { ResumePreviewCard } from "../components/resume/ResumePreviewCard";
import { ResumeStrengthMeter } from "../components/resume/ResumeStrengthMeter";
import { EmailConsentForm } from "../components/resume/EmailConsentForm";
import { DocumentUploadSection } from "../components/resume/DocumentUploadSection";
import { RefereeSection } from "../components/resume/RefereeSection";
import { ProfileConversionPanel } from "../components/resume/ProfileConversionPanel";
import type { SessionData } from "../components/resume/types";
import type { DocumentRecord, RefereeRecord } from "~backend/resume/types";

const defaultSession = (): SessionData => ({
  id: "", stepCompleted: 0, email: null, firstName: null, lastName: null, phone: null,
  suburb: null, state: null, postcode: null, travelRadiusKm: null, targetRole: null,
  experienceLevel: null, experienceYears: null, supportSettings: [], supportTasks: [],
  supportStyle: null, capabilityStories: [], availability: [], driversLicence: false, ownVehicle: false,
  languages: [], workHistory: [], qualifications: [], training: [], checks: [], ndisScreeningNumber: null,
  resumeStrengthScore: null, scoreBreakdown: null, aiSummary: null, aiBullets: [], aiBio: null,
  aiSearchCard: null, aiInterviewPrompts: [], convertedWorkerId: null, status: "draft",
});

export default function ResumeBuilderPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<SessionData>(defaultSession());
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [referees, setReferees] = useState<RefereeRecord[]>([]);
  const [scoreData, setScoreData] = useState<{ score: number; breakdown: any; suggestions: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadSession = async () => {
    if (!id) return;
    try {
      const { session: s, documents: d, referees: r } = await backend.resume.getSession({ id });
      setSession(s as SessionData);
      setDocuments(d as DocumentRecord[]);
      setReferees(r as RefereeRecord[]);
    } catch {
      toast({ title: "Session not found", variant: "destructive" });
      navigate("/resume-builder");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSession(); }, [id]);

  const handleScore = async () => {
    if (!id) return;
    setScoring(true);
    try {
      const result = await backend.resume.scoreSession({ id });
      setScoreData({ score: result.score, breakdown: result.breakdown, suggestions: result.suggestions });
      setSession(result.session as SessionData);
    } catch (err) {
      console.error(err);
      toast({ title: "Scoring failed", variant: "destructive" });
    } finally {
      setScoring(false);
    }
  };

  const handleGenerate = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const { session: s } = await backend.resume.generateResumeContent({ id });
      setSession(s as SessionData);
      toast({ title: "AI content generated!", description: "Your resume has been written in NDIS-aligned Australian English." });
    } catch (err: any) {
      console.error(err);
      const msg = err?.message ?? "";
      if (msg.includes("OpenAIKey")) {
        toast({ title: "AI not configured", description: "Please add your OpenAI API key in Settings to enable AI generation.", variant: "destructive" });
      } else {
        toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleEmailSubmit = async (email: string, consents: any) => {
    if (!id) return;
    setEmailLoading(true);
    try {
      await backend.resume.emailCapture({ id, email, ...consents });
      setSession((prev) => ({ ...prev, email, status: "email_captured" }));
      setShowEmailForm(false);
      toast({ title: "Email saved!", description: "You can now download your resume." });
    } catch (err) {
      console.error(err);
      toast({ title: "Could not save email", variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const el = document.getElementById("resume-preview");
      if (!el) return;
      const fullName = [session.firstName, session.lastName].filter(Boolean).join(" ") || "Resume";
      const style = `
        <style>
          body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; }
          h1 { font-size: 22px; margin: 0 0 4px 0; }
          h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 16px 0 6px 0; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          p, li { font-size: 12px; line-height: 1.5; }
          ul { padding-left: 16px; }
          .header { background: #0d9488; color: white; padding: 24px; }
          .header h1 { color: white; }
          .header p { color: #ccfbf1; font-size: 13px; margin: 0; }
          .body { padding: 20px; }
          .chip { display: inline-block; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; border-radius: 999px; padding: 2px 8px; font-size: 10px; margin: 2px; }
        </style>
      `;
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fullName} – NDIS Resume</title>${style}</head><body>${el.innerHTML}</body></html>`;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fullName.replace(/\s+/g, "_")}_NDIS_Resume.html`;
      a.click();
      URL.revokeObjectURL(url);
      window.print();
      toast({ title: "Resume ready!", description: "Use your browser's Print → Save as PDF to save your resume." });
    } catch (err) {
      console.error(err);
      toast({ title: "Download failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const hasAiContent = !!session.aiSummary;
  const hasEmail = !!session.email;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/resume-builder/session/${id}`)} className="text-slate-500 hover:text-slate-700">
              <ArrowLeft size={20} />
            </button>
            <img src="/kizazi-hire-logo.png" alt="KizaziHire" className="h-7 w-auto" />
            <span className="text-sm font-medium text-slate-500 hidden sm:block">Resume Preview</span>
          </div>
          <div className="flex items-center gap-2">
            {hasEmail ? (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold text-sm rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-60"
              >
                <Download size={16} />
                {downloading ? "Downloading…" : "Download PDF"}
              </button>
            ) : (
              <button
                onClick={() => setShowEmailForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold text-sm rounded-xl hover:bg-teal-700"
              >
                <Download size={16} /> Download PDF
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          {!hasAiContent && (
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold mb-1">Generate AI resume content</h3>
                <p className="text-sm text-teal-100">Get an AI-written professional summary, bullet points and bio — in Australian English.</p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="shrink-0 flex items-center gap-2 bg-white text-teal-700 font-bold px-5 py-2.5 rounded-xl text-sm hover:shadow-md transition-all disabled:opacity-60"
              >
                {generating ? (
                  <><RefreshCw size={16} className="animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles size={16} /> Generate</>
                )}
              </button>
            </div>
          )}

          {hasAiContent && (
            <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
              <span className="text-sm text-emerald-700 font-medium">✓ AI content generated</span>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1 text-xs text-emerald-700 hover:underline"
              >
                <RefreshCw size={12} className={generating ? "animate-spin" : ""} />
                Regenerate
              </button>
            </div>
          )}

          <ResumePreviewCard session={session} />

          {hasEmail && !session.convertedWorkerId && (
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🎉</span>
                    <h3 className="font-extrabold text-xl">Your resume is ready — join KizaziHire free</h3>
                  </div>
                  <p className="text-teal-100 text-sm mb-3">Turn this resume into a live profile and get matched with NDIS provider jobs — no re-entering data.</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-teal-100">
                    <span>✓ Free forever</span>
                    <span>✓ No credit card</span>
                    <span>✓ You control your visibility</span>
                  </div>
                </div>
                <ProfileConversionPanel
                  session={session}
                  onConverted={(wid) => setSession((p) => ({ ...p, convertedWorkerId: wid }))}
                  compact
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {showEmailForm && !hasEmail && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <EmailConsentForm onSubmit={handleEmailSubmit} loading={emailLoading} />
            </div>
          )}

          {!showEmailForm && !hasEmail && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center space-y-3">
              <Download size={28} className="text-teal-600 mx-auto" />
              <h3 className="font-bold text-slate-800">Download your resume</h3>
              <p className="text-sm text-slate-500">Enter your email to download your PDF resume and save your session.</p>
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl text-sm hover:bg-teal-700 transition-colors"
              >
                Enter email & download
              </button>
            </div>
          )}

          {hasEmail && !session.convertedWorkerId && (
            <ProfileConversionPanel session={session} onConverted={(wid) => setSession((p) => ({ ...p, convertedWorkerId: wid }))} />
          )}

          {hasEmail && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800">Resume Strength Score</h3>
                <button
                  onClick={handleScore}
                  disabled={scoring}
                  className="text-xs text-teal-700 font-medium hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={12} className={scoring ? "animate-spin" : ""} />
                  {scoring ? "Calculating…" : (scoreData ? "Recalculate" : "Calculate score")}
                </button>
              </div>
              {scoreData ? (
                <ResumeStrengthMeter score={scoreData.score} breakdown={scoreData.breakdown} suggestions={scoreData.suggestions} />
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">
                  <p>Click "Calculate score" to see how your resume stacks up.</p>
                </div>
              )}
            </div>
          )}

          {hasEmail && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <DocumentUploadSection sessionId={id!} documents={documents} onDocumentsChange={setDocuments} />
            </div>
          )}

          {hasEmail && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <RefereeSection sessionId={id!} referees={referees} onRefereesChange={setReferees} />
            </div>
          )}

          {!hasEmail && (
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
              <h3 className="font-semibold text-blue-800 mb-2 text-sm">After entering your email you can also:</h3>
              <ul className="space-y-1.5 text-xs text-blue-700">
                <li>→ See your full resume strength score and tips</li>
                <li>→ Upload compliance documents</li>
                <li>→ Add referees</li>
                <li>→ Convert to a KizaziHire profile</li>
              </ul>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => navigate(`/resume-builder/session/${id}`)}
              className="text-sm text-slate-500 hover:text-teal-700 hover:underline"
            >
              ← Edit my answers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
