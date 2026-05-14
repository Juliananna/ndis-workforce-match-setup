import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, CheckCircle, AlertTriangle, X, RotateCcw, Download } from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";

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

async function downloadSignedDocument(signatureDataUrl: string | null, signedAt: Date | null) {
  const W = 794;
  const MARGIN = 56;
  const contentWidth = W - MARGIN * 2;

  const canvas = document.createElement("canvas");
  canvas.width = W;

  const tmpCtx = canvas.getContext("2d")!;

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number) => {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const measureHeight = (ctx: CanvasRenderingContext2D) => {
    let y = MARGIN;
    y += 32;
    y += 12;
    y += 20;
    y += 8;
    const introLines = wrapText(ctx, "The NDIS Code of Conduct promotes safe and ethical supports for people with disability. All NDIS workers must comply with the following principles:", contentWidth, 18);
    y += introLines.length * 18 + 20;
    for (const s of COC_SECTIONS) {
      y += 16;
      const bodyLines = wrapText(ctx, s.body, contentWidth, 16);
      y += bodyLines.length * 16 + 14;
    }
    y += 20;
    y += 16;
    const declLines = wrapText(ctx, "By signing below I confirm I have read and understood the NDIS Code of Conduct and agree to comply with all 7 principles in my work as an NDIS support worker.", contentWidth, 16);
    y += declLines.length * 16 + 28;
    y += 14;
    y += signatureDataUrl ? 100 : 60;
    y += 18;
    y += 16;
    y += MARGIN;
    return y;
  };

  tmpCtx.font = "14px sans-serif";
  const H = measureHeight(tmpCtx);
  canvas.height = H;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  let y = MARGIN;

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("NDIS Code of Conduct", MARGIN, y + 22);
  y += 32;

  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("SIGNED & VERIFIED", MARGIN, y + 12);
  y += 20;

  if (signedAt) {
    ctx.fillStyle = "#64748b";
    ctx.font = "11px sans-serif";
    ctx.fillText(new Date(signedAt).toLocaleString("en-AU"), MARGIN, y + 12);
    y += 18;
  }

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, y + 8);
  ctx.lineTo(W - MARGIN, y + 8);
  ctx.stroke();
  y += 20;

  ctx.fillStyle = "#475569";
  ctx.font = "13px sans-serif";
  const introLines = wrapText(ctx, "The NDIS Code of Conduct promotes safe and ethical supports for people with disability. All NDIS workers must comply with the following principles:", contentWidth, 18);
  for (const line of introLines) { ctx.fillText(line, MARGIN, y + 14); y += 18; }
  y += 20;

  for (const s of COC_SECTIONS) {
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(s.heading, MARGIN, y + 14);
    y += 16;
    ctx.fillStyle = "#475569";
    ctx.font = "13px sans-serif";
    const bodyLines = wrapText(ctx, s.body, contentWidth, 16);
    for (const line of bodyLines) { ctx.fillText(line, MARGIN + 12, y + 13); y += 16; }
    y += 14;
  }

  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(MARGIN, y + 8);
  ctx.lineTo(W - MARGIN, y + 8);
  ctx.stroke();
  y += 20;

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("Declaration", MARGIN, y + 14);
  y += 16;
  ctx.fillStyle = "#475569";
  ctx.font = "12px sans-serif";
  const declLines = wrapText(ctx, "By signing below I confirm I have read and understood the NDIS Code of Conduct and agree to comply with all 7 principles in my work as an NDIS support worker.", contentWidth, 16);
  for (const line of declLines) { ctx.fillText(line, MARGIN, y + 13); y += 16; }
  y += 28;

  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";
  ctx.fillText("SIGNATURE", MARGIN, y + 12);
  y += 14;

  const sigBoxH = signatureDataUrl ? 90 : 50;
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.strokeRect(MARGIN, y, contentWidth, sigBoxH);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(MARGIN + 1, y + 1, contentWidth - 2, sigBoxH - 2);

  const finalize = (sigImg: HTMLImageElement | null) => {
    if (sigImg) {
      const maxW = contentWidth - 16;
      const maxH = sigBoxH - 8;
      const ratio = sigImg.naturalWidth / sigImg.naturalHeight;
      let drawW = maxW;
      let drawH = drawW / ratio;
      if (drawH > maxH) { drawH = maxH; drawW = drawH * ratio; }
      const drawX = MARGIN + 8 + (maxW - drawW) / 2;
      const drawY = y + 4 + (maxH - drawH) / 2;
      ctx.drawImage(sigImg, drawX, drawY, drawW, drawH);
    }
    let yy = y + sigBoxH + 8;

    if (signedAt) {
      ctx.fillStyle = "#64748b";
      ctx.font = "11px sans-serif";
      ctx.fillText(`Signed electronically on ${new Date(signedAt).toLocaleString("en-AU")}`, MARGIN, yy + 14);
      yy += 18;
    }

    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(MARGIN, yy + 8, contentWidth, 1);
    yy += 14;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.fillText("Generated by NDIS Workforce Match Platform", MARGIN, yy + 12);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "ndis-code-of-conduct-signed.png";
    link.click();
  };

  if (signatureDataUrl) {
    const sigImg = new Image();
    sigImg.onload = () => finalize(sigImg);
    sigImg.src = signatureDataUrl;
  } else {
    finalize(null);
  }
}

export function NdisCocSigningModal({ open, onClose, onSigned }: Props) {
  const api = useAuthedBackend();
  const [step, setStep] = useState<Step>("read");
  const [hasScrolled, setHasScrolled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<Date | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setStep("read");
      setHasScrolled(false);
      setError(null);
      return;
    }
    if (!api) return;
    setLoading(true);
    api.workers.getNdisCocStatus().then((res) => {
      if (res.signed && res.signedAt) {
        setSignedAt(res.signedAt);
        setSignatureDataUrl(res.signatureDataUrl);
        setStep("done");
      } else {
        setStep("read");
        setHasScrolled(false);
      }
    }).catch(() => {
      setStep("read");
    }).finally(() => setLoading(false));
  }, [open, api]);

  const handleScroll = () => {
    const el = contentRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) setHasScrolled(true);
  };

  const handleSigned = async (dataUrl: string) => {
    setSaving(true);
    setError(null);
    try {
      if (!api) throw new Error("Not authenticated");
      const res = await api.workers.signNdisCoc({ signatureDataUrl: dataUrl });
      setSignedAt(res.signedAt);
      setSignatureDataUrl(dataUrl);
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

  if (loading) return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div className="rounded-xl border border-border bg-card shadow-2xl p-8 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );

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
          <div className="flex flex-col overflow-hidden">
            <div className="overflow-y-auto px-5 py-4 space-y-4" style={{ maxHeight: "70vh" }}>
              <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2.5">
                <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-green-400">Signed &amp; Verified</p>
                  {signedAt && (
                    <p className="text-xs text-muted-foreground/70">
                      {new Date(signedAt).toLocaleString("en-AU")}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">NDIS Code of Conduct</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The NDIS Code of Conduct promotes safe and ethical supports for people with disability.
                  All NDIS workers must comply with the following principles:
                </p>
              </div>

              {COC_SECTIONS.map((s, i) => (
                <div key={i} className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">{s.heading}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs text-foreground font-medium mb-1">Declaration</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By signing below I confirm I have read and understood the NDIS Code of Conduct
                  and agree to comply with all 7 principles in my work as an NDIS support worker.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground/60 uppercase tracking-wide">Signature</p>
                {signatureDataUrl ? (
                  <div className="rounded-lg border border-border bg-white p-3">
                    <img src={signatureDataUrl} alt="Signature" className="w-full h-auto max-h-24 object-contain" />
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/30 h-16 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground/40">Signature on file</p>
                  </div>
                )}
                {signedAt && (
                  <p className="text-xs text-muted-foreground/60">
                    Signed electronically on {new Date(signedAt).toLocaleString("en-AU")}
                  </p>
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-border text-foreground hover:bg-muted gap-1.5"
                onClick={() => downloadSignedDocument(signatureDataUrl, signedAt)}
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
              <Button onClick={onClose} className="flex-1">Close</Button>
            </div>
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
