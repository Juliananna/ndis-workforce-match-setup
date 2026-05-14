import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, CheckCircle, AlertTriangle, X, RotateCcw } from "lucide-react";
import backend from "~backend/client";

interface Props {
  open: boolean;
  onClose: () => void;
  onSigned: () => void;
}

type Step = "read" | "sign" | "done";

const COC_SECTIONS = [
  {
    heading: "1. Respect individual rights",
    body: "Act with respect for individual rights to freedom of expression, self-determination and decision-making in accordance with applicable laws and conventions.",
  },
  {
    heading: "2. Respect privacy",
    body: "Respect the privacy of people with disability.",
  },
  {
    heading: "3. Provide safe, competent support",
    body: "Provide supports and services in a safe and competent manner with care and skill.",
  },
  {
    heading: "4. Act with integrity",
    body: "Act with integrity, honesty and transparency.",
  },
  {
    heading: "5. Raise concerns promptly",
    body: "Promptly take steps to raise and act on concerns about matters that might have an impact on the quality and safety of supports.",
  },
  {
    heading: "6. Prevent violence and abuse",
    body: "Take all reasonable steps to prevent and respond to all forms of violence, exploitation, neglect and abuse of people with disability.",
  },
  {
    heading: "7. Prevent sexual misconduct",
    body: "Take all reasonable steps to prevent and respond to sexual misconduct.",
  },
];

function SignaturePad({ onSigned }: { onSigned: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStrokes = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    drawing.current = true;
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    hasStrokes.current = true;
    setIsEmpty(false);
  }, []);

  const endDraw = useCallback(() => { drawing.current = false; }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokes.current = false;
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    onSigned(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Sign with your finger or mouse</p>
        <button
          onClick={clear}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3 w-3" /> Clear
        </button>
      </div>
      <div className="rounded-lg border-2 border-dashed border-border bg-white overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={560}
          height={160}
          className="w-full h-32 cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground/60 border-t border-dashed border-border pt-1">
        — Sign above this line —
      </p>
      <Button className="w-full" disabled={isEmpty} onClick={handleConfirm}>
        Confirm Signature &amp; Submit
      </Button>
    </div>
  );
}

export function NdisCocSigningModal({ open, onClose, onSigned }: Props) {
  const [step, setStep] = useState<Step>("read");
  const [hasScrolled, setHasScrolled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<Date | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setStep("read");
      setHasScrolled(false);
      setError(null);
    }
  }, [open]);

  const handleScroll = () => {
    const el = contentRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) setHasScrolled(true);
  };

  const handleSigned = async (dataUrl: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await backend.workers.signNdisCoc({ signatureDataUrl: dataUrl });
      setSignedAt(res.signedAt);
      setStep("done");
      onSigned();
    } catch (e: unknown) {
      console.error(e);
      setError("Failed to save signature. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">NDIS Code of Conduct</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "done" && (
          <div className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-500/10 p-4">
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
            </div>
            <p className="text-base font-semibold text-foreground">Code of Conduct Signed</p>
            <p className="text-sm text-muted-foreground">
              Your acknowledgement has been recorded and your compliance document updated.
            </p>
            {signedAt && (
              <p className="text-xs text-muted-foreground/60">
                Signed {new Date(signedAt).toLocaleString("en-AU")}
              </p>
            )}
            <Button onClick={onClose} className="w-full">Close</Button>
          </div>
        )}

        {step === "read" && (
          <>
            <div className="px-5 pt-4 pb-2 shrink-0">
              <p className="text-xs text-muted-foreground">
                Read the 7 principles below, then scroll down to sign.
              </p>
            </div>
            <div
              ref={contentRef}
              onScroll={handleScroll}
              className="overflow-y-auto px-5 pb-4 space-y-4"
              style={{ maxHeight: "340px" }}
            >
              <p className="text-xs text-muted-foreground leading-relaxed">
                The NDIS Code of Conduct promotes safe and ethical supports for people with disability. 
                All NDIS workers must comply with the following principles:
              </p>
              {COC_SECTIONS.map((s, i) => (
                <div key={i} className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">{s.heading}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mt-2">
                <p className="text-xs text-foreground font-medium mb-1">Declaration</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By signing below I confirm I have read and understood the NDIS Code of Conduct 
                  and agree to comply with all 7 principles in my work as an NDIS support worker.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border shrink-0">
              {!hasScrolled && (
                <p className="text-xs text-muted-foreground/60 text-center mb-3">
                  Scroll to the bottom to proceed
                </p>
              )}
              <Button
                className="w-full"
                disabled={!hasScrolled}
                onClick={() => setStep("sign")}
              >
                I have read the Code of Conduct — Sign Now
              </Button>
            </div>
          </>
        )}

        {step === "sign" && (
          <div className="p-5 space-y-4">
            <p className="text-xs text-muted-foreground">
              Draw your signature below using your finger or mouse.
            </p>
            {saving ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <SignaturePad onSigned={handleSigned} />
            )}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}
            <button
              onClick={() => setStep("read")}
              className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center"
            >
              Back to read
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
