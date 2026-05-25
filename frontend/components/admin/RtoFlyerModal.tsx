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

const TEAL       = "#0d9488";
const TEAL_MID   = "#0a7a70";
const TEAL_DARK  = "#064e45";
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
  const S = 2;

  // A5-landscape-ish: 794 × 560 logical px
  const W = 794 * S;
  const H = 560 * S;
  const PAD = 48 * S;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── Background ───────────────────────────────────────────────────────────
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 0, 0, W, H, 20 * S);
  ctx.fill();

  // ── Left panel (teal gradient) ───────────────────────────────────────────
  const LEFT_W = 360 * S;
  const grad = ctx.createLinearGradient(0, 0, LEFT_W * 0.4, H);
  grad.addColorStop(0, TEAL_DARK);
  grad.addColorStop(0.6, TEAL_MID);
  grad.addColorStop(1, TEAL);
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, 0, 0, LEFT_W, H, 20 * S);
  ctx.closePath();
  // square off the right side
  ctx.rect(LEFT_W - 20 * S, 0, 20 * S, H);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LEFT_W, H);
  ctx.restore();

  // subtle diagonal stripe texture on left panel
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, 0, 0, LEFT_W, H, 20 * S);
  ctx.closePath();
  ctx.rect(LEFT_W - 20 * S, 0, 20 * S, H);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 28 * S;
  for (let i = -H; i < W + H; i += 56 * S) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  ctx.restore();

  // ── Large decorative circle (bottom-right of left panel) ────────────────
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, 0, 0, LEFT_W, H, 20 * S);
  ctx.closePath();
  ctx.rect(LEFT_W - 20 * S, 0, 20 * S, H);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 2 * S;
  ctx.beginPath();
  ctx.arc(LEFT_W * 0.85, H * 0.9, 160 * S, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(LEFT_W * 0.85, H * 0.9, 110 * S, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // ── Load images ─────────────────────────────────────────────────────────
  let logoImg: HTMLImageElement | null = null;
  let kizaziImg: HTMLImageElement | null = null;
  try { kizaziImg = await loadImage("/kizazi-hire-logo.png"); } catch { /* skip */ }
  if (logoUrl) {
    try { logoImg = await loadImage(logoUrl); } catch { /* skip */ }
  }

  // ── KIZAZI logo top-left ─────────────────────────────────────────────────
  if (kizaziImg) {
    const lh = 30 * S;
    const lw = (kizaziImg.naturalWidth / kizaziImg.naturalHeight) * lh;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(kizaziImg, PAD, PAD, lw, lh);
    ctx.globalAlpha = 1;
  }

  // ── RTO logo (white pill background) ────────────────────────────────────
  if (logoImg) {
    const maxH = 38 * S;
    const maxW = 140 * S;
    let lw = maxW, lh = (logoImg.naturalHeight / logoImg.naturalWidth) * lw;
    if (lh > maxH) { lh = maxH; lw = (logoImg.naturalWidth / logoImg.naturalHeight) * lh; }
    const pillPad = 10 * S;
    const pillX = PAD;
    const pillY = PAD + 46 * S;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ctx, pillX, pillY, lw + pillPad * 2, lh + pillPad * 2, 8 * S);
    ctx.fill();
    ctx.drawImage(logoImg, pillX + pillPad, pillY + pillPad, lw, lh);
  }

  // ── Partner badge ────────────────────────────────────────────────────────
  const badgeY = logoImg ? PAD + 110 * S : PAD + 54 * S;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `600 ${11 * S}px "Arial", sans-serif`;
  ctx.letterSpacing = `${1.5 * S}px`;
  ctx.fillText(partner.name.toUpperCase() + " · STUDENT PATHWAY", PAD, badgeY);
  ctx.letterSpacing = "0px";

  // ── Headline ─────────────────────────────────────────────────────────────
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${38 * S}px "Arial Black", "Arial", sans-serif`;
  const headlineLines = wrapText(ctx, "Get NDIS placement-ready", LEFT_W - PAD * 2);
  const headlineY = badgeY + 18 * S;
  headlineLines.forEach((line, i) => {
    ctx.fillText(line, PAD, headlineY + i * 46 * S);
  });

  // ── Sub-headline ─────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = `400 ${14 * S}px "Arial", sans-serif`;
  const subY = headlineY + headlineLines.length * 46 * S + 10 * S;
  const subLines = wrapText(
    ctx,
    "Build your free compliance profile and connect with NDIS employers — all in one place.",
    LEFT_W - PAD * 2
  );
  subLines.forEach((line, i) => {
    ctx.fillText(line, PAD, subY + i * 20 * S);
  });

  // ── Free tag pill ─────────────────────────────────────────────────────────
  const freeY = H - PAD - 14 * S;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  roundRect(ctx, PAD, freeY - 18 * S, 70 * S, 26 * S, 13 * S);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${10 * S}px "Arial", sans-serif`;
  ctx.letterSpacing = `${1 * S}px`;
  ctx.fillText("100% FREE", PAD + 10 * S, freeY + 2 * S);
  ctx.letterSpacing = "0px";

  // ────────────────────────────────────────────────────────────────────────
  // RIGHT PANEL
  // ────────────────────────────────────────────────────────────────────────
  const RX = LEFT_W + 36 * S;
  const RW = W - LEFT_W - 36 * S - PAD;

  // ── QR code block ────────────────────────────────────────────────────────
  const QR_SIZE = 140 * S;
  const QR_PAD = 10 * S;
  const QR_BLOCK_W = QR_SIZE + QR_PAD * 2 + 2 * S;
  const QR_BLOCK_H = QR_BLOCK_W;
  const QR_X = W - PAD - QR_BLOCK_W;
  const QR_Y = PAD;

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.10)";
  ctx.shadowBlur = 20 * S;
  ctx.shadowOffsetY = 4 * S;
  roundRect(ctx, QR_X, QR_Y, QR_BLOCK_W, QR_BLOCK_H, 14 * S);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 3 * S;
  roundRect(ctx, QR_X, QR_Y, QR_BLOCK_W, QR_BLOCK_H, 14 * S);
  ctx.stroke();

  ctx.drawImage(qrCanvasEl, QR_X + QR_PAD, QR_Y + QR_PAD, QR_SIZE, QR_SIZE);

  ctx.fillStyle = "#6b7280";
  ctx.font = `400 ${9 * S}px "Arial", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Scan to register free", QR_X + QR_BLOCK_W / 2, QR_Y + QR_BLOCK_H + 12 * S);
  ctx.fillStyle = TEAL_MID;
  ctx.font = `600 ${8.5 * S}px "Arial", sans-serif`;
  ctx.fillText(`kizazihire.com.au/rto/${partner.slug}`, QR_X + QR_BLOCK_W / 2, QR_Y + QR_BLOCK_H + 22 * S);
  ctx.textAlign = "left";

  // ── Section title ─────────────────────────────────────────────────────────
  const FEAT_Y = PAD + QR_BLOCK_H + 38 * S;

  ctx.fillStyle = "#111827";
  ctx.font = `700 ${10 * S}px "Arial", sans-serif`;
  ctx.letterSpacing = `${1.2 * S}px`;
  ctx.fillText("WHAT YOU GET — FREE", RX, FEAT_Y);
  ctx.letterSpacing = "0px";

  // divider
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1 * S;
  ctx.beginPath();
  ctx.moveTo(RX, FEAT_Y + 8 * S);
  ctx.lineTo(W - PAD, FEAT_Y + 8 * S);
  ctx.stroke();

  // ── Feature rows ─────────────────────────────────────────────────────────
  FEATURES.forEach((feat, i) => {
    const FY = FEAT_Y + 22 * S + i * 30 * S;
    const CX = RX + 10 * S;
    const CY = FY + 1 * S;
    const CR = 10 * S;

    // circle
    ctx.fillStyle = TEAL;
    ctx.beginPath();
    ctx.arc(CX, CY, CR, 0, Math.PI * 2);
    ctx.fill();

    // check path
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2 * S;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(CX - 5 * S, CY);
    ctx.lineTo(CX - 1 * S, CY + 4 * S);
    ctx.lineTo(CX + 5.5 * S, CY - 4.5 * S);
    ctx.stroke();

    ctx.fillStyle = "#374151";
    ctx.font = `400 ${12 * S}px "Arial", sans-serif`;
    ctx.fillText(feat, RX + 26 * S, FY + 5 * S);
  });

  // ── Referral code box ────────────────────────────────────────────────────
  const CODE_Y = H - PAD - 68 * S;
  const CODE_W = RW;

  ctx.fillStyle = "#f0fdf4";
  ctx.strokeStyle = "#6ee7b7";
  ctx.lineWidth = 1.5 * S;
  roundRect(ctx, RX, CODE_Y, CODE_W, 62 * S, 10 * S);
  ctx.fill();
  ctx.stroke();

  // label
  ctx.fillStyle = "#065f46";
  ctx.font = `700 ${9 * S}px "Arial", sans-serif`;
  ctx.letterSpacing = `${1 * S}px`;
  ctx.fillText("REFERRAL CODE", RX + 16 * S, CODE_Y + 18 * S);
  ctx.letterSpacing = "0px";

  // code value
  ctx.fillStyle = "#064e38";
  ctx.font = `800 ${22 * S}px "Courier New", monospace`;
  ctx.fillText(partner.referralCode, RX + 16 * S, CODE_Y + 44 * S);

  // sub-label
  ctx.fillStyle = "#16a34a";
  ctx.font = `400 ${9.5 * S}px "Arial", sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("Use at kizazihire.com.au", RX + CODE_W - 12 * S, CODE_Y + 44 * S);
  ctx.textAlign = "left";

  // ── Footer ───────────────────────────────────────────────────────────────
  ctx.fillStyle = "#9ca3af";
  ctx.font = `400 ${9 * S}px "Arial", sans-serif`;
  ctx.fillText("kizazihire.com.au · NDIS Workforce Platform", RX, H - 18 * S);
  ctx.textAlign = "right";
  ctx.fillText(`In partnership with ${partner.name}`, W - PAD, H - 18 * S);
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
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-4xl my-4">
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

          {/* Hidden high-res QR for canvas export */}
          <div ref={qrWrapperRef} className="hidden">
            <QRCodeCanvas value={studentUrl} size={400} fgColor="#111827" bgColor="#ffffff" level="H" />
          </div>

          {/* Live preview (HTML) */}
          <div className="overflow-auto rounded-2xl border border-border shadow-md">
            <div
              style={{
                width: 794,
                minWidth: 794,
                height: 560,
                fontFamily: "Arial, Helvetica, sans-serif",
                display: "flex",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              {/* Left panel */}
              <div
                style={{
                  width: 360,
                  flexShrink: 0,
                  background: `linear-gradient(145deg, ${TEAL_DARK} 0%, ${TEAL_MID} 55%, ${TEAL} 100%)`,
                  padding: "36px 40px",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* decorative circles */}
                <div style={{ position: "absolute", right: -60, bottom: -60, width: 280, height: 280, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.08)" }} />
                <div style={{ position: "absolute", right: -30, bottom: -30, width: 180, height: 180, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.06)" }} />

                {/* KIZAZI logo */}
                <div style={{ marginBottom: 20 }}>
                  <img src="/kizazi-hire-logo.png" alt="KIZAZI Hire" style={{ height: 28, objectFit: "contain", opacity: 0.92 }} crossOrigin="anonymous" />
                </div>

                {/* RTO logo */}
                {localLogoUrl && (
                  <div style={{ marginBottom: 16, display: "inline-flex" }}>
                    <div style={{ background: "rgba(255,255,255,0.16)", borderRadius: 8, padding: "8px 12px", display: "inline-block" }}>
                      <img src={localLogoUrl} alt={partner.name} style={{ height: 36, maxWidth: 140, objectFit: "contain" }} crossOrigin="anonymous" />
                    </div>
                  </div>
                )}

                {/* Badge */}
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
                  {partner.name} · Student Pathway
                </div>

                {/* Headline */}
                <div style={{ color: "#ffffff", fontSize: 34, fontWeight: 900, lineHeight: 1.15, marginBottom: 12 }}>
                  Get NDIS<br />placement-ready
                </div>

                {/* Sub */}
                <div style={{ color: "rgba(255,255,255,0.76)", fontSize: 13, lineHeight: 1.65 }}>
                  Build your free compliance profile and connect with NDIS employers — all in one place.
                </div>

                {/* Free pill */}
                <div style={{ marginTop: "auto", paddingTop: 24 }}>
                  <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 14px", fontSize: 10, fontWeight: 700, color: "#ffffff", letterSpacing: 1 }}>
                    100% FREE
                  </div>
                </div>
              </div>

              {/* Right panel */}
              <div style={{ flex: 1, backgroundColor: "#ffffff", padding: "32px 36px", display: "flex", flexDirection: "column", gap: 0 }}>
                {/* QR + label row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", marginBottom: 24 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ border: `2.5px solid ${TEAL}`, borderRadius: 12, padding: 8, backgroundColor: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                      <QRCodeCanvas value={studentUrl} size={120} fgColor="#111827" bgColor="#ffffff" level="M" />
                    </div>
                    <div style={{ fontSize: 9, color: "#9ca3af", textAlign: "center" }}>Scan to register free</div>
                    <div style={{ fontSize: 8.5, color: TEAL_MID, fontWeight: 600, textAlign: "center", maxWidth: 148, wordBreak: "break-all" }}>
                      kizazihire.com.au/rto/{partner.slug}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#111827", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                    What you get — free
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {FEATURES.map((feat, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: TEAL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg viewBox="0 0 12 12" width="11" height="11" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <span style={{ color: "#374151", fontSize: 12.5, lineHeight: 1.4 }}>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Referral code */}
                <div style={{ marginTop: "auto", paddingTop: 18 }}>
                  <div style={{ backgroundColor: "#f0fdf4", border: "1.5px solid #6ee7b7", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#065f46", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Referral Code</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#064e38", fontFamily: "monospace", letterSpacing: 1.5 }}>{partner.referralCode}</div>
                    </div>
                    <div style={{ fontSize: 9.5, color: "#16a34a", textAlign: "right" }}>Use at<br />kizazihire.com.au</div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                  <div style={{ fontSize: 9, color: "#9ca3af" }}>kizazihire.com.au · NDIS Workforce Platform</div>
                  <div style={{ fontSize: 9, color: "#9ca3af" }}>In partnership with {partner.name}</div>
                </div>
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
