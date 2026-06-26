import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import backend from "~backend/client";
import { useToast } from "@/components/ui/use-toast";
import { Download, ArrowLeft, Sparkles, RefreshCw, Mail, CheckCircle, Crown } from "lucide-react";
import { ResumePreviewCard } from "../components/resume/ResumePreviewCard";
import type { ResumeTheme } from "../components/resume/ResumePreviewCard";
import { ResumeStrengthMeter } from "../components/resume/ResumeStrengthMeter";
import { EmailConsentForm } from "../components/resume/EmailConsentForm";
import { DocumentUploadSection } from "../components/resume/DocumentUploadSection";
import { RefereeSection } from "../components/resume/RefereeSection";
import { GetHiredFasterModal } from "../components/resume/GetHiredFasterModal";
import { ResumePhotoUpload } from "../components/resume/ResumePhotoUpload";
import { ResumeThemePicker } from "../components/resume/ResumeThemePicker";
import type { SessionData } from "../components/resume/types";
import type { RefereeRecord } from "~backend/resume/types";

const defaultSession = (): SessionData => ({
  id: "", stepCompleted: 0, email: null, firstName: null, lastName: null, phone: null,
  suburb: null, state: null, postcode: null, travelRadiusKm: null, targetRole: null,
  experienceLevel: null, experienceYears: null, supportSettings: [], supportTasks: [],
  supportStyle: null, capabilityStories: [], availability: [], driversLicence: false, ownVehicle: false,
  languages: [], workHistory: [], qualifications: [], training: [], checks: [], ndisScreeningNumber: null,
  resumeStrengthScore: null, scoreBreakdown: null, aiSummary: null, aiBullets: [], aiBio: null,
  aiSearchCard: null, aiInterviewPrompts: [], aiGenerationCount: 0, convertedWorkerId: null, status: "draft",
});

export default function ResumeBuilderPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [session, setSession] = useState<SessionData>(defaultSession());
  const [referees, setReferees] = useState<RefereeRecord[]>([]);
  const [scoreData, setScoreData] = useState<{ score: number; breakdown: any; suggestions: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showHiredModal, setShowHiredModal] = useState(false);
  const [profileJustCreated, setProfileJustCreated] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [isPremium, setIsPremium] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ResumeTheme>("classic_free");
  const [premiumLoading, setPremiumLoading] = useState(true);

  const loadSession = async () => {
    if (!id) return;
    try {
      const { session: s, referees: r } = await backend.resume.getSession({ id });
      setSession(s as SessionData);
      setReferees(r as RefereeRecord[]);
    } catch {
      toast({ title: "Session not found", variant: "destructive" });
      navigate("/resume-builder");
    } finally {
      setLoading(false);
    }
  };

  const loadPremium = async () => {
    if (!id) return;
    try {
      const { isPremium: p, selectedTheme: t } = await backend.resume.getResumePremiumStatus({ id });
      setIsPremium(p);
      setSelectedTheme((t as ResumeTheme) || "classic_free");
    } catch {
    } finally {
      setPremiumLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
    loadPremium();
  }, [id]);

  useEffect(() => {
    const premiumParam = searchParams.get("premium");
    if (premiumParam === "success") {
      toast({ title: "Premium unlocked! 🎉", description: "You now have access to all resume designs and your PDF will have no KizaziHire branding." });
      setIsPremium(true);
      setSearchParams({}, { replace: true });
      loadPremium();
    } else if (premiumParam === "cancelled") {
      toast({ title: "Upgrade cancelled", description: "You can upgrade anytime from the design picker." });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

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
      const result = await backend.resume.emailCapture({ id, email, ...consents });
      setSession(result.session as SessionData);
      setShowEmailForm(false);
      if (result.profileCreated) {
        setProfileJustCreated(true);
        toast({ title: "Profile created!", description: "Check your email to set your password and log in." });
      } else {
        toast({ title: "Email saved!", description: "You can now download your resume." });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Could not save email", variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDownload = () => {
    const el = document.getElementById("resume-preview");
    if (!el) return;
    const fullName = [session.firstName, session.lastName].filter(Boolean).join(" ") || "Resume";

    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) {
      toast({ title: "Popup blocked", description: "Please allow popups for this site, then try again.", variant: "destructive" });
      return;
    }

    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((l) => `<link rel="stylesheet" href="${(l as HTMLLinkElement).href}">`)
      .join("\n");

    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${fullName} – NDIS Support Worker Resume</title>
  ${links}
  <style>
    @page { size: A4; margin: 12mm 10mm; }
    html, body { margin: 0; padding: 0; background: white; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    #resume-root { max-width: 680px; margin: 0 auto; }
    @media screen { body { padding: 20px; } }
  </style>
</head>
<body>
  <div id="resume-root">${el.outerHTML}<\/div>
  <script>
    window.onload = function() {
      document.title = "${fullName} – NDIS Support Worker Resume";
      setTimeout(function() { window.print(); }, 400);
      window.onafterprint = function() { window.close(); };
    };
  <\/script>
</body>
</html>`);
    printWin.document.close();
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
  const hasProfile = !!session.convertedWorkerId;
  const AI_LIMIT = 3;
  const generationsLeft = Math.max(0, AI_LIMIT - (session.aiGenerationCount ?? 0));
  const atLimit = generationsLeft === 0;

  return (
    <>
    <GetHiredFasterModal open={showHiredModal} onOpenChange={setShowHiredModal} sessionId={id} hasEmail={hasEmail} />
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/resume-builder/session/${id}`)} className="text-slate-500 hover:text-slate-700">
              <ArrowLeft size={20} />
            </button>
            <img src="/kizazi-hire-logo.png" alt="KizaziHire" className="h-7 w-auto" />
            <span className="text-sm font-medium text-slate-500 hidden sm:block">Resume Preview</span>
            {isPremium && (
              <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <Crown size={11} /> Premium
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHiredModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-teal-700 border border-teal-200 rounded-xl hover:bg-teal-50 transition-colors"
            >
              <span>⚡</span> Get hired faster
            </button>
            {hasEmail ? (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold text-sm rounded-xl hover:bg-teal-700 transition-colors"
              >
                <Download size={16} />
                Download PDF
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
          <button
            onClick={() => setShowHiredModal(true)}
            className="w-full flex items-center justify-between gap-3 px-5 py-3.5 bg-white border border-teal-200 rounded-2xl shadow-sm hover:border-teal-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-sm">Find out how to get hired faster</p>
                <p className="text-xs text-slate-500">See how a KizaziHire profile gets you in front of providers</p>
              </div>
            </div>
            <span className="text-teal-600 font-bold text-sm group-hover:translate-x-0.5 transition-transform">→</span>
          </button>

          {!hasAiContent && (
            <div className={`rounded-2xl p-5 flex items-center justify-between gap-4 ${atLimit ? "bg-slate-100 border border-slate-200" : "bg-gradient-to-r from-teal-600 to-emerald-600 text-white"}`}>
              <div>
                <h3 className={`font-bold mb-1 ${atLimit ? "text-slate-700" : ""}`}>Generate AI resume content</h3>
                <p className={`text-sm ${atLimit ? "text-slate-500" : "text-teal-100"}`}>
                  {atLimit
                    ? "You've used all 3 AI generations for this session."
                    : "Get an AI-written professional summary, bullet points and bio — in Australian English."}
                </p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating || atLimit}
                className={`shrink-0 flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 ${atLimit ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-white text-teal-700 hover:shadow-md"}`}
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
              {atLimit ? (
                <span className="text-xs text-slate-400">Limit reached (3/3)</span>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-1 text-xs text-emerald-700 hover:underline disabled:opacity-60"
                >
                  <RefreshCw size={12} className={generating ? "animate-spin" : ""} />
                  Regenerate ({generationsLeft} left)
                </button>
              )}
            </div>
          )}

          <ResumePreviewCard
            session={session}
            photoUrl={photoUrl}
            theme={selectedTheme}
            isPremium={isPremium}
          />

          {hasEmail && (profileJustCreated || hasProfile) && (
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-white/20 p-3 shrink-0">
                  <CheckCircle size={28} className="text-white" />
                </div>
                <div className="w-full">
                  <h3 className="font-extrabold text-xl mb-1">Your resume is ready! 🎉</h3>
                  <p className="text-teal-100 text-sm mb-4">
                    Upload your first compliance document to <strong className="text-white">activate your KizaziHire profile</strong> and claim your free verification package.
                  </p>
                  <div className="bg-white/10 rounded-xl p-4 mb-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-teal-100">
                      <span className="text-white font-bold">1.</span> Check your email — we've sent a set-password link to <strong className="text-white">{session.email}</strong>
                    </div>
                    <div className="flex items-center gap-2 text-teal-100">
                      <span className="text-white font-bold">2.</span> Set your password and log in
                    </div>
                    <div className="flex items-center gap-2 text-teal-100">
                      <span className="text-white font-bold">3.</span> Upload your first compliance document to go live
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="/login?onboarding=compliance"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-teal-700 font-bold rounded-xl text-sm hover:bg-teal-50 transition-colors shadow-md"
                    >
                      Activate my profile →
                    </a>
                    <span className="flex items-center gap-1.5 text-xs text-teal-100 self-center">
                      <Mail size={13} /> Check your email for the set-password link
                    </span>
                  </div>
                </div>
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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            {premiumLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
              </div>
            ) : (
              <ResumeThemePicker
                sessionId={id!}
                isPremium={isPremium}
                selectedTheme={selectedTheme}
                onThemeChange={setSelectedTheme}
                onPremiumUnlocked={() => { setIsPremium(true); loadPremium(); }}
              />
            )}
          </div>

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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <ResumePhotoUpload
              sessionId={id!}
              currentPhotoUrl={photoUrl}
              onPhotoUploaded={(url) => setPhotoUrl(url)}
            />
          </div>

          {hasEmail && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <DocumentUploadSection
                sessionId={id!}
                hasProfile={hasProfile || profileJustCreated}
                hasEmail={hasEmail}
              />
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
                <li>→ Get a free KizaziHire worker profile (no re-entering data)</li>
                <li>→ See your full resume strength score and tips</li>
                <li>→ Upload compliance documents</li>
                <li>→ Add referees</li>
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
    </>
  );
}
