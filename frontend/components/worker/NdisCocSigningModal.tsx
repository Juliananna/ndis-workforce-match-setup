import { useState, useEffect, useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, CheckCircle, AlertTriangle, ExternalLink, X } from "lucide-react";
import backend from "~backend/client";
import type { NdisCocSigningStatus } from "~backend/signing/status";

interface Props {
  open: boolean;
  onClose: () => void;
  onSigned: () => void;
}

type Step = "loading" | "info" | "signing" | "done" | "error";

const NDIS_COC_CONTENT = [
  {
    heading: "What is the NDIS Code of Conduct?",
    body: "The NDIS Code of Conduct promotes safe and ethical supports and services for people with disability. It applies to all NDIS providers and their workers.",
  },
  {
    heading: "The 7 Principles You Must Follow",
    body: null,
    list: [
      "Act with respect for individual rights to freedom of expression, self-determination and decision-making.",
      "Respect the privacy of people with disability.",
      "Provide supports and services in a safe and competent manner with care and skill.",
      "Act with integrity, honesty and transparency.",
      "Promptly raise and act on concerns about matters that might impact quality and safety of supports.",
      "Take all reasonable steps to prevent and respond to all forms of violence, exploitation, neglect and abuse.",
      "Take all reasonable steps to prevent and respond to sexual misconduct.",
    ],
  },
  {
    heading: "Your Reporting Obligations",
    body: "You must report any reasonable belief that a person with disability has experienced or is at risk of experiencing abuse or neglect. Reports should be made to the NDIS Quality and Safeguards Commission: 1800 035 544 or www.ndiscommission.gov.au",
  },
  {
    heading: "Confidentiality",
    body: "You must maintain the confidentiality of all information relating to participants and their supports. This includes not sharing personal information without consent.",
  },
  {
    heading: "Social Media",
    body: "Do not post photos or information about participants on social media, or contact participants via personal social media accounts without consent.",
  },
  {
    heading: "Consequences of Non-Compliance",
    body: "Failure to comply may result in a finding of non-compliance by the NDIS Quality and Safeguards Commission. The Commission can take regulatory action including banning orders.",
  },
];

export function NdisCocSigningModal({ open, onClose, onSigned }: Props) {
  const [step, setStep] = useState<Step>("loading");
  const [status, setStatus] = useState<NdisCocSigningStatus | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasReadAll, setHasReadAll] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setStep("loading");
      setHasReadAll(false);
      setSigningUrl(null);
      setError(null);
      return;
    }
    loadStatus();
  }, [open]);

  async function loadStatus() {
    setStep("loading");
    try {
      const s = await backend.signing.getNdisCocStatus();
      setStatus(s);
      if (s.status === "completed") {
        setStep("done");
      } else {
        setStep("info");
      }
    } catch (e: unknown) {
      console.error(e);
      setError("Failed to load signing status. Please try again.");
      setStep("error");
    }
  }

  function handleScroll() {
    const el = contentRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (atBottom) setHasReadAll(true);
  }

  async function handleInitiateSigning() {
    setInitiating(true);
    setError(null);
    try {
      const result = await backend.signing.initiateNdisCocSigning({
        redirectUrl: window.location.origin + "/dashboard",
      });

      if (result.alreadySigned) {
        setStep("done");
        onSigned();
        return;
      }

      setSigningUrl(result.signingUrl);
      setStep("signing");
    } catch (e: unknown) {
      console.error(e);
      setError("Failed to initiate signing. Please try again.");
    } finally {
      setInitiating(false);
    }
  }

  function handleOpenSigningTab() {
    if (signingUrl) {
      window.open(signingUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function handleCheckCompletion() {
    try {
      const s = await backend.signing.getNdisCocStatus();
      setStatus(s);
      if (s.status === "completed") {
        setStep("done");
        onSigned();
      } else {
        setError("Signing not yet completed. Please complete the signing in the Annature window and then click Check Status again.");
      }
    } catch (e: unknown) {
      console.error(e);
      setError("Failed to check status.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${open ? "" : "hidden"}`}
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2.5">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">NDIS Code of Conduct</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {step === "loading" && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {step === "error" && (
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
                <Button onClick={loadStatus} className="w-full">Try Again</Button>
              </div>
            )}

            {step === "done" && (
              <div className="p-6 space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-500/10 p-4">
                    <CheckCircle className="h-10 w-10 text-green-400" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Code of Conduct Signed</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have successfully acknowledged and signed the NDIS Code of Conduct. 
                    This has been added to your compliance documents.
                  </p>
                </div>
                {status?.signedAt && (
                  <p className="text-xs text-muted-foreground">
                    Signed on {new Date(status.signedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
                <Button onClick={onClose} className="w-full">Close</Button>
              </div>
            )}

            {step === "info" && (
              <div className="flex flex-col h-full">
                <div className="px-6 pt-4 pb-2 shrink-0">
                  <p className="text-sm text-muted-foreground">
                    Please read the NDIS Code of Conduct carefully before signing. Scroll to the bottom to proceed.
                  </p>
                </div>
                <div
                  ref={contentRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto px-6 pb-4 space-y-5"
                >
                  {NDIS_COC_CONTENT.map((section, i) => (
                    <div key={i} className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">{section.heading}</h3>
                      {section.body && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
                      )}
                      {section.list && (
                        <ol className="space-y-1.5 list-decimal list-inside">
                          {section.list.map((item, j) => (
                            <li key={j} className="text-sm text-muted-foreground leading-relaxed">{item}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ))}

                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm font-medium text-foreground mb-1">Declaration</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      By proceeding to sign, I confirm that I have read and understood the NDIS Code of Conduct,
                      agree to comply with the Code in all my work as an NDIS support worker, understand the
                      consequences of non-compliance, and will report any concerns about the safety or quality of NDIS supports.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === "signing" && (
              <div className="p-6 space-y-5">
                <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                  <FileText className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Ready to sign</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Click the button below to open the Annature signing portal in a new tab. 
                      After signing, return here and click &ldquo;Check Status&rdquo;.
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleOpenSigningTab}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Signing Portal
                </Button>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400">{error}</p>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCheckCompletion}
                >
                  Check Status
                </Button>
              </div>
            )}
          </div>

          {step === "info" && (
            <div className="px-6 py-4 border-t border-border shrink-0 space-y-3">
              {!hasReadAll && (
                <p className="text-xs text-muted-foreground text-center">
                  Scroll to the bottom to enable signing
                </p>
              )}
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}
              <Button
                className="w-full"
                disabled={!hasReadAll || initiating}
                onClick={handleInitiateSigning}
              >
                {initiating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {initiating ? "Preparing Document..." : "Proceed to Sign"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
