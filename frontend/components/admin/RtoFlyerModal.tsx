import { useRef, useState, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { X, Download, Loader2, Upload, CheckCircle, ImageIcon } from "lucide-react";
import { useProxyUpload } from "../../hooks/useProxyUpload";
import type { RtoPartner } from "~backend/rto/types";

interface Props {
  partner: RtoPartner;
  open: boolean;
  onClose: () => void;
  onLogoUpdated: (logoUrl: string) => void;
}

const ACCENT = "#0d9488";
const ACCENT_DARK = "#065f46";
const PREVIEW_BASE = "https://ndis-workforce-match-setup-d6t4j0c82vjgmsb23vrg.lp.dev";

function getStudentUrl(partner: RtoPartner) {
  return `${PREVIEW_BASE}/rto/${partner.slug}`;
}

const FEATURES = [
  "Upload & manage compliance documents",
  "Request referee checks online",
  "Build a verified support worker profile",
  "Connect with employers open to placement",
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function renderFlyerToCanvas(
  qrCanvasEl: HTMLCanvasElement,
  partner: RtoPartner,
  logoUrl: string | null
): Promise<HTMLCanvasElement> {
  const SCALE = 2;
  const W = 560 * SCALE;
  const MARGIN = 44 * SCALE;
  const CONTENT_W = W - MARGIN * 2;
  const HEADER_H = 210 * SCALE;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = (HEADER_H + 310 * SCALE);
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, W, HEADER_H);
  grad.addColorStop(0, ACCENT);
  grad.addColorStop(1, ACCENT_DARK);
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, W, canvas.height, 16 * SCALE);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 0, HEADER_H - 16 * SCALE, W, canvas.height - HEADER_H + 16 * SCALE + 1, 0);
  ctx.fill();

  let logoImg: HTMLImageElement | null = null;
  let kizaziImg: HTMLImageElement | null = null;

  try { kizaziImg = await loadImage("/kizazi-hire-logo.png"); } catch { /* skip */ }
  if (logoUrl) {
    try { logoImg = await loadImage(logoUrl); } catch { /* skip */ }
  }

  if (kizaziImg) {
    const lh = 28 * SCALE;
    const lw = (kizaziImg.naturalWidth / kizaziImg.naturalHeight) * lh;
    ctx.globalAlpha = 1;
    ctx.drawImage(kizaziImg, MARGIN, 28 * SCALE, lw, lh);
  }

  if (logoImg) {
    const maxH = 32 * SCALE;
    const maxW = 120 * SCALE;
    let lw = maxW, lh = (logoImg.naturalHeight / logoImg.naturalWidth) * lw;
    if (lh > maxH) { lh = maxH; lw = (logoImg.naturalWidth / logoImg.naturalHeight) * lh; }
    ctx.drawImage(logoImg, W - MARGIN - lw, 24 * SCALE, lw, lh);
  }

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = `${600} ${10 * SCALE}px Arial`;
  const badge = `${partner.name.toUpperCase()} · STUDENT PATHWAY`;
  ctx.fillText(badge, MARGIN, 78 * SCALE);

  ctx.fillStyle = "#ffffff";
  ctx.font = `${800} ${22 * SCALE}px Arial`;
  const titleLines = wrapText(ctx, "Get NDIS placement-ready", CONTENT_W - 160 * SCALE);
  titleLines.forEach((line, i) => ctx.fillText(line, MARGIN, (94 + i * 26) * SCALE));

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = `${400} ${11 * SCALE}px Arial`;
  const desc = "Build your free compliance profile and connect with NDIS employers — all in one place.";
  const descLines = wrapText(ctx, desc, CONTENT_W - 160 * SCALE);
  const descY = (94 + titleLines.length * 26 + 10) * SCALE;
  descLines.forEach((line, i) => ctx.fillText(line, MARGIN, descY + i * 16 * SCALE));

  const QR_SIZE = 120 * SCALE;
  const QR_X = W - MARGIN - QR_SIZE - 6 * SCALE;
  const QR_Y = 62 * SCALE;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3 * SCALE;
  roundRect(ctx, QR_X - 8 * SCALE, QR_Y - 8 * SCALE, QR_SIZE + 16 * SCALE, QR_SIZE + 16 * SCALE, 8 * SCALE);
  ctx.fill();
  ctx.stroke();
  ctx.drawImage(qrCanvasEl, QR_X, QR_Y, QR_SIZE, QR_SIZE);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `${400} ${8 * SCALE}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText("Scan to get started", QR_X + QR_SIZE / 2, QR_Y + QR_SIZE + 16 * SCALE);
  ctx.font = `${600} ${7.5 * SCALE}px Arial`;
  ctx.fillText(`kizazihire.com.au/rto/${partner.slug}`, QR_X + QR_SIZE / 2, QR_Y + QR_SIZE + 24 * SCALE);
  ctx.textAlign = "left";

  const BODY_Y = HEADER_H + 20 * SCALE;
  const LEFT_W = CONTENT_W - 160 * SCALE - 16 * SCALE;

  ctx.fillStyle = "#111827";
  ctx.font = `${700} ${8.5 * SCALE}px Arial`;
  ctx.letterSpacing = "0.5px";
  ctx.fillText("WHAT YOU GET — FREE", MARGIN, BODY_Y + 14 * SCALE);
  ctx.letterSpacing = "0px";

  FEATURES.forEach((feat, i) => {
    const FY = BODY_Y + (28 + i * 36) * SCALE;
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(MARGIN + 8 * SCALE, FY + 8 * SCALE, 8 * SCALE, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `${700} ${8 * SCALE}px Arial`;
    ctx.fillText("✓", MARGIN + 4 * SCALE, FY + 12 * SCALE);
    ctx.fillStyle = "#374151";
    ctx.font = `${400} ${10.5 * SCALE}px Arial`;
    const featLines = wrapText(ctx, feat, LEFT_W - 24 * SCALE);
    featLines.forEach((line, li) => ctx.fillText(line, MARGIN + 22 * SCALE, FY + (8 + li * 14) * SCALE));
  });

  const CODE_X = W - MARGIN - 152 * SCALE;
  const CODE_Y = BODY_Y;
  ctx.fillStyle = "#f0fdf4";
  ctx.strokeStyle = "#bbf7d0";
  ctx.lineWidth = 1 * SCALE;
  roundRect(ctx, CODE_X, CODE_Y, 152 * SCALE, 70 * SCALE, 8 * SCALE);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#15803d";
  ctx.font = `${700} ${8 * SCALE}px Arial`;
  ctx.letterSpacing = "0.5px";
  ctx.fillText("REFERRAL CODE", CODE_X + 10 * SCALE, CODE_Y + 16 * SCALE);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#065f46";
  ctx.font = `${800} ${14 * SCALE}px monospace`;
  ctx.letterSpacing = "1px";
  ctx.fillText(partner.referralCode, CODE_X + 10 * SCALE, CODE_Y + 38 * SCALE);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#16a34a";
  ctx.font = `${400} ${8.5 * SCALE}px Arial`;
  ctx.fillText("Use at kizazihire.com.au", CODE_X + 10 * SCALE, CODE_Y + 54 * SCALE);

  const FOOTER_Y = canvas.height - 30 * SCALE;
  ctx.fillStyle = "#f9fafb";
  ctx.fillRect(0, FOOTER_Y - 10 * SCALE, W, 40 * SCALE);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1 * SCALE;
  ctx.beginPath();
  ctx.moveTo(0, FOOTER_Y - 10 * SCALE);
  ctx.lineTo(W, FOOTER_Y - 10 * SCALE);
  ctx.stroke();
  ctx.fillStyle = "#9ca3af";
  ctx.font = `${400} ${8 * SCALE}px Arial`;
  ctx.fillText("kizazihire.com.au · NDIS Workforce Platform", MARGIN, FOOTER_Y + 10 * SCALE);
  ctx.textAlign = "right";
  ctx.fillText(`In partnership with ${partner.name}`, W - MARGIN, FOOTER_Y + 10 * SCALE);
  ctx.textAlign = "left";

  return canvas;
}

export function RtoFlyerModal({ partner, open, onClose, onLogoUpdated }: Props) {
  const qrWrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadRtoLogo } = useProxyUpload();

  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(partner.logoUrl);

  const studentUrl = getStudentUrl(partner);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const { logoUrl } = await uploadRtoLogo(file, partner.rtoPartnerId);
      setLocalLogoUrl(logoUrl);
      onLogoUpdated(logoUrl);
    } catch (err) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [partner.rtoPartnerId, uploadRtoLogo, onLogoUpdated]);

  const handleDownloadPng = useCallback(async () => {
    const qrCanvasEl = qrWrapperRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!qrCanvasEl) return;
    setDownloading(true);
    try {
      const partnerWithLogo = { ...partner, logoUrl: localLogoUrl };
      const canvas = await renderFlyerToCanvas(qrCanvasEl, partnerWithLogo, localLogoUrl);
      const link = document.createElement("a");
      link.download = `kizazi-rto-flyer-${partner.slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }, [partner, localLogoUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8">
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">QR Code &amp; Flyer</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{partner.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-60"
            >
              {uploading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : localLogoUrl
                  ? <CheckCircle className="h-4 w-4 text-teal-600" />
                  : <ImageIcon className="h-4 w-4" />
              }
              {uploading ? "Uploading…" : localLogoUrl ? "Replace logo" : "Upload RTO logo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
            {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
            {localLogoUrl && !uploading && (
              <img src={localLogoUrl} alt="logo preview" className="h-8 object-contain rounded border border-border bg-muted/20 px-2" crossOrigin="anonymous" />
            )}
            <div className="ml-auto">
              <button
                onClick={handleDownloadPng}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download PNG
              </button>
            </div>
          </div>

          <div ref={qrWrapperRef} className="hidden">
            <QRCodeCanvas
              value={studentUrl}
              size={300}
              fgColor="#111827"
              bgColor="#ffffff"
              level="M"
            />
          </div>

          <div className="overflow-auto">
            <div
              style={{
                width: 560,
                minWidth: 560,
                fontFamily: "Arial, Helvetica, sans-serif",
                backgroundColor: "#ffffff",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
              }}
            >
              <div style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`, padding: "36px 40px 32px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <img
                    src="/kizazi-hire-logo.png"
                    alt="KIZAZI Hire"
                    style={{ height: 32, objectFit: "contain", filter: "brightness(0) invert(1)" }}
                    crossOrigin="anonymous"
                  />
                  {localLogoUrl && (
                    <img
                      src={localLogoUrl}
                      alt={partner.name}
                      style={{ height: 40, maxWidth: 140, objectFit: "contain", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 8px" }}
                      crossOrigin="anonymous"
                    />
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                      {partner.name} · Student Pathway
                    </div>
                    <div style={{ color: "#ffffff", fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginBottom: 8 }}>
                      Get NDIS placement-ready
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 1.6 }}>
                      Build your free compliance profile and connect with NDIS employers — all in one place.
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <div style={{ padding: 10, backgroundColor: "#ffffff", border: `3px solid ${ACCENT}`, borderRadius: 12 }}>
                      <QRCodeCanvas
                        value={studentUrl}
                        size={110}
                        fgColor="#111827"
                        bgColor="#ffffff"
                        level="M"
                      />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>Scan to get started</div>
                      <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.85)", fontWeight: 600, maxWidth: 130, wordBreak: "break-all" }}>
                        kizazihire.com.au/rto/{partner.slug}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: "24px 40px", display: "flex", gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#111827", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    What you get — free
                  </div>
                  {FEATURES.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span style={{ color: "#374151", fontSize: 12, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>

                <div style={{ flexShrink: 0, width: 148 }}>
                  <div style={{ padding: "12px 14px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 }}>
                    <div style={{ fontSize: 9, color: "#15803d", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
                      Referral code
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#065f46", fontFamily: "monospace", letterSpacing: 1 }}>
                      {partner.referralCode}
                    </div>
                    <div style={{ fontSize: 9, color: "#16a34a", marginTop: 4 }}>Use at kizazihire.com.au</div>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: "#f9fafb", borderTop: "1px solid #e5e7eb", padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>kizazihire.com.au · NDIS Workforce Platform</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>In partnership with {partner.name}</div>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground">Student landing page URL</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1.5 flex-1 break-all select-all">
                {studentUrl}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(studentUrl)}
                className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted/50 transition-colors shrink-0"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Share this link or QR code in course handbooks, orientation packs, or on your LMS.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
