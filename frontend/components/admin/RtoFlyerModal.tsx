import { useRef, useState, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { X, Download, Loader2, CheckCircle, ImageIcon } from "lucide-react";
import { useProxyUpload } from "../../hooks/useProxyUpload";
import type { RtoPartner } from "~backend/rto/types";

interface Props {
  partner: RtoPartner;
  open: boolean;
  onClose: () => void;
  onLogoUpdated: (logoUrl: string) => void;
}

const TEAL      = "#0d9488";
const TEAL_MID  = "#0a7a70";
const TEAL_DARK = "#063d36";
const TEAL_TEXT = "#0d7a6e";
const PREVIEW_BASE = "https://kizazihire.com.au";

function getStudentUrl(partner: RtoPartner) {
  return `${PREVIEW_BASE}/rto/${partner.slug}`;
}

const FEATURES = [
  { icon: "doc",    bold: "Upload", rest: " & manage compliance documents" },
  { icon: "shield", bold: "Request", rest: " referee checks online" },
  { icon: "person", bold: "Build", rest: " a verified support worker profile" },
  { icon: "brief",  bold: "Connect", rest: " with employers open to placement" },
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
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else { line = test; }
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
  const W = 900 * S;
  const H = 640 * S;
  const LEFT_W = 400 * S;
  const PAD = 40 * S;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── White background ────────────────────────────────────────────────────
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 0, 0, W, H, 20 * S);
  ctx.fill();

  // ── Left panel gradient ─────────────────────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, LEFT_W * 0.3, H);
  grad.addColorStop(0, "#041f1b");
  grad.addColorStop(0.5, TEAL_DARK);
  grad.addColorStop(1, "#0a5c53");
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, 0, 0, LEFT_W, H, 20 * S);
  ctx.rect(LEFT_W - 20 * S, 0, 20 * S, H);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LEFT_W, H);

  // dot grid pattern
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let gy = 16 * S; gy < H; gy += 22 * S) {
    for (let gx = LEFT_W * 0.55; gx < LEFT_W - 10; gx += 22 * S) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.5 * S, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // decorative circle bottom-right of left panel
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1.5 * S;
  ctx.beginPath(); ctx.arc(LEFT_W * 0.88, H * 0.88, 160 * S, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(LEFT_W * 0.88, H * 0.88, 110 * S, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // ── Load images ─────────────────────────────────────────────────────────
  let logoImg: HTMLImageElement | null = null;
  let kizaziImg: HTMLImageElement | null = null;
  try { kizaziImg = await loadImage("/kizazi-hire-logo.png"); } catch { /* skip */ }
  if (logoUrl) { try { logoImg = await loadImage(logoUrl); } catch { /* skip */ } }

  // ── KIZAZI logo ─────────────────────────────────────────────────────────
  let curY = PAD;
  if (kizaziImg) {
    const lh = 28 * S;
    const lw = (kizaziImg.naturalWidth / kizaziImg.naturalHeight) * lh;
    ctx.drawImage(kizaziImg, PAD, curY, lw, lh);
    curY += lh + 18 * S;
  } else {
    curY += 46 * S;
  }

  // ── RTO logo white card ──────────────────────────────────────────────────
  if (logoImg) {
    const maxH = 52 * S, maxW = 220 * S;
    let lw = maxW, lh = (logoImg.naturalHeight / logoImg.naturalWidth) * lw;
    if (lh > maxH) { lh = maxH; lw = (logoImg.naturalWidth / logoImg.naturalHeight) * lh; }
    const cardW = Math.min(lw + 28 * S, 240 * S);
    const cardH = lh + 20 * S;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, PAD, curY, cardW, cardH, 10 * S);
    ctx.fill();
    ctx.drawImage(logoImg, PAD + (cardW - lw) / 2, curY + 10 * S, lw, lh);
    curY += cardH + 22 * S;
  } else {
    curY += 10 * S;
  }

  // ── Headline ─────────────────────────────────────────────────────────────
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${34 * S}px Arial`;
  ctx.fillText("Get NDIS", PAD, curY + 34 * S);

  ctx.fillStyle = TEAL;
  ctx.font = `900 ${34 * S}px Arial`;
  ctx.fillText("placement-ready", PAD, curY + 34 * S + 40 * S);

  // teal underline
  ctx.fillStyle = TEAL;
  ctx.fillRect(PAD, curY + 34 * S + 46 * S, 44 * S, 4 * S);

  curY += 34 * S + 60 * S;

  // ── Description ──────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = `400 ${12.5 * S}px Arial`;
  const descLines = wrapText(ctx, "Build your free compliance profile and connect with NDIS employers — all in one place.", LEFT_W - PAD * 2);
  descLines.forEach((line, i) => { ctx.fillText(line, PAD, curY + i * 18 * S); });
  curY += descLines.length * 18 * S + 22 * S;

  // ── Feature rows ─────────────────────────────────────────────────────────
  const FEAT_ICONS = ["doc", "shield", "person", "brief"];
  const FEAT_BOLD = ["Upload", "Request", "Build", "Connect"];
  const FEAT_REST = [
    " & manage compliance documents",
    " referee checks online",
    " a verified support worker profile",
    " with employers open to placement",
  ];

  FEAT_ICONS.forEach((_, i) => {
    const FY = curY + i * 38 * S;
    const ICON_SIZE = 28 * S;

    // icon tile
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx, PAD, FY, ICON_SIZE, ICON_SIZE, 8 * S);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1 * S;
    roundRect(ctx, PAD, FY, ICON_SIZE, ICON_SIZE, 8 * S);
    ctx.stroke();

    // simple icon shapes
    ctx.strokeStyle = "#5eead4";
    ctx.lineWidth = 1.5 * S;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const IC = { x: PAD + ICON_SIZE / 2, y: FY + ICON_SIZE / 2 };
    ctx.beginPath();
    if (i === 0) {
      roundRect(ctx, IC.x - 6 * S, IC.y - 8 * S, 12 * S, 15 * S, 2 * S);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(IC.x - 4 * S, IC.y - 2 * S); ctx.lineTo(IC.x + 4 * S, IC.y - 2 * S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(IC.x - 4 * S, IC.y + 2 * S); ctx.lineTo(IC.x + 2 * S, IC.y + 2 * S); ctx.stroke();
    } else if (i === 1) {
      ctx.moveTo(IC.x, IC.y - 8 * S); ctx.lineTo(IC.x + 6 * S, IC.y - 4 * S); ctx.lineTo(IC.x + 6 * S, IC.y + 2 * S);
      ctx.quadraticCurveTo(IC.x + 6 * S, IC.y + 8 * S, IC.x, IC.y + 9 * S);
      ctx.quadraticCurveTo(IC.x - 6 * S, IC.y + 8 * S, IC.x - 6 * S, IC.y + 2 * S);
      ctx.lineTo(IC.x - 6 * S, IC.y - 4 * S); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(IC.x - 3 * S, IC.y); ctx.lineTo(IC.x - 0.5 * S, IC.y + 3 * S); ctx.lineTo(IC.x + 3.5 * S, IC.y - 3 * S); ctx.stroke();
    } else if (i === 2) {
      ctx.arc(IC.x, IC.y - 4 * S, 4.5 * S, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(IC.x - 7 * S, IC.y + 9 * S);
      ctx.quadraticCurveTo(IC.x - 6 * S, IC.y + 3 * S, IC.x, IC.y + 3 * S);
      ctx.quadraticCurveTo(IC.x + 6 * S, IC.y + 3 * S, IC.x + 7 * S, IC.y + 9 * S); ctx.stroke();
    } else {
      roundRect(ctx, IC.x - 7 * S, IC.y - 4 * S, 14 * S, 10 * S, 2 * S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(IC.x - 3 * S, IC.y - 4 * S); ctx.lineTo(IC.x - 3 * S, IC.y - 7 * S); ctx.lineTo(IC.x + 3 * S, IC.y - 7 * S); ctx.lineTo(IC.x + 3 * S, IC.y - 4 * S); ctx.stroke();
    }
    ctx.lineCap = "butt";

    // bold + rest text
    ctx.font = `700 ${12 * S}px Arial`;
    ctx.fillStyle = "#ffffff";
    const boldW = ctx.measureText(FEAT_BOLD[i]).width;
    ctx.fillText(FEAT_BOLD[i], PAD + ICON_SIZE + 10 * S, FY + 18 * S);
    ctx.font = `400 ${12 * S}px Arial`;
    ctx.fillStyle = "rgba(255,255,255,0.80)";
    ctx.fillText(FEAT_REST[i], PAD + ICON_SIZE + 10 * S + boldW, FY + 18 * S);
  });

  curY += FEAT_ICONS.length * 38 * S + 12 * S;

  // ── 100% FREE box ────────────────────────────────────────────────────────
  const freeBoxY = H - PAD - 50 * S;
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1 * S;
  roundRect(ctx, PAD, freeBoxY, LEFT_W - PAD * 2, 50 * S, 10 * S);
  ctx.fill();
  ctx.stroke();

  // shield icon circle
  ctx.fillStyle = "rgba(13,148,136,0.35)";
  ctx.beginPath(); ctx.arc(PAD + 20 * S, freeBoxY + 25 * S, 16 * S, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5 * S;
  ctx.beginPath();
  ctx.moveTo(PAD + 20 * S, freeBoxY + 11 * S);
  ctx.lineTo(PAD + 28 * S, freeBoxY + 15 * S); ctx.lineTo(PAD + 28 * S, freeBoxY + 22 * S);
  ctx.quadraticCurveTo(PAD + 28 * S, freeBoxY + 32 * S, PAD + 20 * S, freeBoxY + 36 * S);
  ctx.quadraticCurveTo(PAD + 12 * S, freeBoxY + 32 * S, PAD + 12 * S, freeBoxY + 22 * S);
  ctx.lineTo(PAD + 12 * S, freeBoxY + 15 * S); ctx.closePath(); ctx.stroke();

  ctx.fillStyle = TEAL;
  ctx.font = `800 ${14 * S}px Arial`;
  ctx.fillText("100% FREE", PAD + 44 * S, freeBoxY + 22 * S);
  ctx.fillStyle = "rgba(255,255,255,0.60)";
  ctx.font = `400 ${10 * S}px Arial`;
  ctx.fillText("No lock-ins. No hidden fees.", PAD + 44 * S, freeBoxY + 36 * S);

  // ────────────────────────────────────────────────────────────────────────
  // RIGHT PANEL
  // ────────────────────────────────────────────────────────────────────────
  const RX = LEFT_W + PAD;
  const RW = W - LEFT_W - PAD * 2;
  let ry = PAD;

  // ── QR code ──────────────────────────────────────────────────────────────
  const QR_SIZE = 180 * S;
  const QR_PAD  = 10 * S;
  const QR_BLOCK = QR_SIZE + QR_PAD * 2;
  const QR_X = RX + (RW - QR_BLOCK) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 18 * S;
  ctx.shadowOffsetY = 3 * S;
  roundRect(ctx, QR_X, ry, QR_BLOCK, QR_BLOCK, 14 * S);
  ctx.fill();
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = "#d1fae5";
  ctx.lineWidth = 2 * S;
  roundRect(ctx, QR_X, ry, QR_BLOCK, QR_BLOCK, 14 * S);
  ctx.stroke();
  ctx.drawImage(qrCanvasEl, QR_X + QR_PAD, ry + QR_PAD, QR_SIZE, QR_SIZE);
  ry += QR_BLOCK + 12 * S;

  // ── Scan label row ───────────────────────────────────────────────────────
  // phone icon circle
  const scanCX = RX + 18 * S;
  const scanCY = ry + 10 * S;
  ctx.fillStyle = "#e6faf8";
  ctx.beginPath(); ctx.arc(scanCX, scanCY, 14 * S, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5 * S; ctx.lineCap = "round";
  // phone icon
  roundRect(ctx, scanCX - 5 * S, scanCY - 9 * S, 10 * S, 17 * S, 2.5 * S); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(scanCX - 2 * S, scanCY + 5 * S); ctx.lineTo(scanCX + 2 * S, scanCY + 5 * S); ctx.stroke();
  ctx.lineCap = "butt";

  ctx.fillStyle = "#111827";
  ctx.font = `600 ${12 * S}px Arial`;
  ctx.fillText("Scan to register free", RX + 38 * S, ry + 8 * S);
  ctx.fillStyle = TEAL_TEXT;
  ctx.font = `600 ${11.5 * S}px Arial`;
  ctx.fillText(`kizazihire.com.au/rto/${partner.slug}`, RX + 38 * S, ry + 22 * S);
  ry += 38 * S;

  // ── "WHAT YOU GET — FREE" section ────────────────────────────────────────
  // gift icon circle
  const giftCX = RX + 18 * S;
  const giftCY = ry + 13 * S;
  ctx.fillStyle = "#e6faf8";
  ctx.beginPath(); ctx.arc(giftCX, giftCY, 14 * S, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5 * S; ctx.lineCap = "round";
  // gift box shape
  ctx.beginPath();
  roundRect(ctx, giftCX - 7 * S, giftCY - 2 * S, 14 * S, 10 * S, 2 * S);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(giftCX - 7 * S, giftCY - 2 * S); ctx.lineTo(giftCX + 7 * S, giftCY - 2 * S);
  ctx.moveTo(giftCX, giftCY - 2 * S); ctx.lineTo(giftCX, giftCY - 8 * S);
  ctx.moveTo(giftCX - 4 * S, giftCY - 5 * S);
  ctx.bezierCurveTo(giftCX - 4 * S, giftCY - 10 * S, giftCX, giftCY - 8 * S, giftCX, giftCY - 5 * S);
  ctx.moveTo(giftCX + 4 * S, giftCY - 5 * S);
  ctx.bezierCurveTo(giftCX + 4 * S, giftCY - 10 * S, giftCX, giftCY - 8 * S, giftCX, giftCY - 5 * S);
  ctx.stroke();
  ctx.lineCap = "butt";

  ctx.fillStyle = "#111827";
  ctx.font = `800 ${13 * S}px Arial`;
  ctx.letterSpacing = `${0.5 * S}px`;
  ctx.fillText("WHAT YOU GET — FREE", RX + 40 * S, ry + 16 * S);
  ctx.letterSpacing = "0px";
  ry += 36 * S;

  // ── Feature rows with dividers ────────────────────────────────────────────
  const FEAT_TEXT_BOLD = ["Upload", "Request", "Build", "Connect"];
  const FEAT_TEXT_REST = [
    " & manage compliance documents",
    " referee checks online",
    " a verified support worker profile",
    " with employers open to placement",
  ];

  FEAT_TEXT_BOLD.forEach((bold, i) => {
    const FY = ry + i * 38 * S;

    // divider above each row
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 1 * S;
    ctx.beginPath(); ctx.moveTo(RX, FY - 6 * S); ctx.lineTo(W - PAD, FY - 6 * S); ctx.stroke();

    // teal check circle
    const CCX = RX + 14 * S;
    const CCY = FY + 10 * S;
    ctx.fillStyle = TEAL;
    ctx.beginPath(); ctx.arc(CCX, CCY, 13 * S, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2 * S;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(CCX - 5.5 * S, CCY);
    ctx.lineTo(CCX - 1.5 * S, CCY + 4.5 * S);
    ctx.lineTo(CCX + 6 * S, CCY - 5 * S);
    ctx.stroke();
    ctx.lineCap = "butt"; ctx.lineJoin = "miter";

    // text
    ctx.font = `700 ${13 * S}px Arial`;
    ctx.fillStyle = "#111827";
    const bw = ctx.measureText(bold).width;
    ctx.fillText(bold, RX + 34 * S, FY + 14 * S);
    ctx.font = `400 ${13 * S}px Arial`;
    ctx.fillStyle = "#374151";
    ctx.fillText(FEAT_TEXT_REST[i], RX + 34 * S + bw, FY + 14 * S);
  });
  ry += FEAT_TEXT_BOLD.length * 38 * S + 6 * S;

  // ── Referral code box ─────────────────────────────────────────────────────
  const CODE_H = 72 * S;
  const CODE_Y = H - PAD - CODE_H - 22 * S;

  // box background
  ctx.fillStyle = "#f0fdf4";
  roundRect(ctx, RX, CODE_Y, RW, CODE_H, 10 * S);
  ctx.fill();
  // border
  ctx.strokeStyle = "#6ee7b7";
  ctx.lineWidth = 1.5 * S;
  roundRect(ctx, RX, CODE_Y, RW, CODE_H, 10 * S);
  ctx.stroke();
  // left accent bar (clipped to box)
  ctx.save();
  roundRect(ctx, RX, CODE_Y, RW, CODE_H, 10 * S);
  ctx.clip();
  ctx.fillStyle = TEAL;
  ctx.fillRect(RX, CODE_Y, 5 * S, CODE_H);
  ctx.restore();

  const TX = RX + 18 * S;

  // "REFERRAL CODE" label
  ctx.fillStyle = "#059669";
  ctx.font = `600 ${10.5 * S}px Arial`;
  ctx.fillText("REFERRAL CODE", TX, CODE_Y + 26 * S);

  // code value
  ctx.fillStyle = "#064e38";
  ctx.font = `bold ${19 * S}px "Courier New", monospace`;
  ctx.fillText(partner.referralCode, TX, CODE_Y + 54 * S);

  // "Use at..." right-aligned, same baseline as code
  ctx.fillStyle = "#6b7280";
  ctx.font = `400 ${10 * S}px Arial`;
  ctx.textAlign = "right";
  ctx.fillText("Use at kizazihire.com.au", W - PAD - 14 * S, CODE_Y + 54 * S);
  ctx.textAlign = "left";

  // ── Footer ────────────────────────────────────────────────────────────────
  const FTY = H - PAD + 4 * S;

  // divider
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1 * S;
  ctx.beginPath(); ctx.moveTo(RX, FTY - 14 * S); ctx.lineTo(W - PAD, FTY - 14 * S); ctx.stroke();

  ctx.fillStyle = "#9ca3af";
  ctx.font = `400 ${9.5 * S}px Arial`;

  // globe icon
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1 * S;
  const gx1 = RX + 7 * S, gy1 = FTY - 5 * S;
  ctx.beginPath(); ctx.arc(gx1, gy1, 6 * S, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(gx1, gy1 - 6 * S); ctx.lineTo(gx1, gy1 + 6 * S); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(gx1 - 6 * S, gy1); ctx.lineTo(gx1 + 6 * S, gy1); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(gx1, gy1, 3 * S, 6 * S, 0, 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = "#6b7280";
  ctx.fillText("kizazihire.com.au", RX + 16 * S, FTY);

  // separator
  ctx.fillStyle = "#d1d5db";
  ctx.fillRect(RX + 120 * S, FTY - 8 * S, 1 * S, 12 * S);

  ctx.fillStyle = "#6b7280";
  ctx.fillText("NDIS Workforce Platform", RX + 130 * S, FTY);

  // separator 2
  ctx.fillStyle = "#d1d5db";
  ctx.fillRect(RX + 272 * S, FTY - 8 * S, 1 * S, 12 * S);

  // handshake icon area
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1 * S;
  ctx.lineCap = "round";
  const hx = RX + 285 * S, hy = FTY - 4 * S;
  ctx.beginPath();
  ctx.moveTo(hx - 6 * S, hy - 2 * S); ctx.lineTo(hx - 2 * S, hy + 3 * S); ctx.lineTo(hx + 2 * S, hy - 1 * S);
  ctx.moveTo(hx - 2 * S, hy + 3 * S); ctx.lineTo(hx + 6 * S, hy + 2 * S);
  ctx.stroke();
  ctx.lineCap = "butt";

  ctx.fillStyle = "#6b7280";
  ctx.fillText(`In partnership with ${partner.name}`, RX + 297 * S, FTY);

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
      const canvas = await renderFlyerToCanvas(qrCanvasEl, { ...partner, logoUrl: localLogoUrl }, localLogoUrl);
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
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-5xl my-4">
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
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : localLogoUrl ? <CheckCircle className="h-4 w-4 text-teal-600" /> : <ImageIcon className="h-4 w-4" />}
              {uploading ? "Uploading…" : localLogoUrl ? "Replace logo" : "Upload RTO logo"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
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
            <QRCodeCanvas value={studentUrl} size={480} fgColor="#111827" bgColor="#ffffff" level="H" />
          </div>

          {/* Live HTML Preview */}
          <div className="overflow-auto rounded-2xl border border-border shadow-md">
            <div style={{ width: 900, minWidth: 900, height: 640, fontFamily: "Arial, Helvetica, sans-serif", display: "flex", borderRadius: 16, overflow: "hidden" }}>

              {/* LEFT PANEL */}
              <div style={{ width: 400, flexShrink: 0, background: `linear-gradient(145deg, #041f1b 0%, ${TEAL_DARK} 50%, #0a5c53 100%)`, padding: "36px 36px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -60, bottom: -60, width: 280, height: 280, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.07)" }} />
                <div style={{ position: "absolute", right: -20, bottom: -20, width: 180, height: 180, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.05)" }} />

                {/* KIZAZI logo */}
                <div style={{ marginBottom: 16 }}>
                  <img src="/kizazi-hire-logo.png" alt="KIZAZI Hire" style={{ height: 26, objectFit: "contain" }} crossOrigin="anonymous" />
                </div>

                {/* RTO logo card */}
                {localLogoUrl && (
                  <div style={{ marginBottom: 14, display: "inline-block" }}>
                    <div style={{ backgroundColor: "#ffffff", borderRadius: 8, padding: "8px 14px", display: "inline-block" }}>
                      <img src={localLogoUrl} alt={partner.name} style={{ height: 48, maxWidth: 200, objectFit: "contain" }} crossOrigin="anonymous" />
                    </div>
                  </div>
                )}

                {/* Headline */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: "#ffffff", fontSize: 32, fontWeight: 900, lineHeight: 1.1 }}>Get NDIS</div>
                  <div style={{ color: TEAL, fontSize: 32, fontWeight: 900, lineHeight: 1.1 }}>placement-ready</div>
                  <div style={{ width: 40, height: 3, backgroundColor: TEAL, marginTop: 10 }} />
                </div>

                {/* Sub */}
                <div style={{ color: "rgba(255,255,255,0.80)", fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>
                  Build your free compliance profile and connect with NDIS employers — all in one place.
                </div>

                {/* Features */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  {FEATURES.map(({ icon, bold, rest }, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {icon === "doc" && (
                          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#5eead4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="1" width="10" height="14" rx="2" /><line x1="5" y1="6" x2="11" y2="6" /><line x1="5" y1="9" x2="9" y2="9" />
                          </svg>
                        )}
                        {icon === "shield" && (
                          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#5eead4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 2L14 5v5c0 3-6 5-6 5S2 13 2 10V5z" /><polyline points="5.5,8 7,9.5 10.5,6" />
                          </svg>
                        )}
                        {icon === "person" && (
                          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#5eead4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="8" cy="5" r="3" /><path d="M2 14c0-3 2.5-5 6-5s6 2 6 5" />
                          </svg>
                        )}
                        {icon === "brief" && (
                          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#5eead4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="6" width="12" height="8" rx="2" /><path d="M5 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.88)", lineHeight: 1.35 }}>
                        <strong style={{ fontWeight: 700, color: "#ffffff" }}>{bold}</strong>{rest}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 100% FREE */}
                <div style={{ marginTop: 16, backgroundColor: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "rgba(13,148,136,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 2l5 2.5v4C13 12 8 14 8 14S3 12 3 8.5V4.5z" /><polyline points="5.5,8 7,9.5 10.5,6" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ color: TEAL, fontWeight: 800, fontSize: 14 }}>100% FREE</div>
                    <div style={{ color: "rgba(255,255,255,0.60)", fontSize: 10, marginTop: 1 }}>No lock-ins. No hidden fees.</div>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL */}
              <div style={{ flex: 1, backgroundColor: "#ffffff", padding: "28px 32px", display: "flex", flexDirection: "column" }}>

                {/* QR code centred */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ border: "2px solid #d1fae5", borderRadius: 14, padding: 8, backgroundColor: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
                    <QRCodeCanvas value={studentUrl} size={160} fgColor="#111827" bgColor="#ffffff" level="M" />
                  </div>
                </div>

                {/* Scan label */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#e6faf8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke={TEAL} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="1" width="8" height="14" rx="2" /><line x1="6.5" y1="12" x2="9.5" y2="12" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Scan to register free</div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: TEAL_TEXT }}>kizazihire.com.au/rto/{partner.slug}</div>
                  </div>
                </div>

                {/* Section header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#e6faf8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke={TEAL} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="12" height="7" rx="1.5" /><path d="M5 7V5.5a3 3 0 016 0V7" /><line x1="8" y1="7" x2="8" y2="14" /><line x1="2" y1="10" x2="14" y2="10" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "#111827", letterSpacing: 0.5 }}>WHAT YOU GET — FREE</div>
                </div>

                {/* Feature list */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {FEATURES.map(({ bold, rest }, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 9, paddingTop: i === 0 ? 0 : 9 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: TEAL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg viewBox="0 0 12 12" width="11" height="11" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <span style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.4 }}>
                          <strong style={{ fontWeight: 700, color: "#111827" }}>{bold}</strong>{rest}
                        </span>
                      </div>
                      {i < FEATURES.length - 1 && <div style={{ height: 1, backgroundColor: "#f3f4f6" }} />}
                    </div>
                  ))}
                </div>

                {/* Referral code */}
                <div style={{ marginTop: "auto", backgroundColor: "#f0fdf4", border: "1.5px solid #6ee7b7", borderRadius: 10, overflow: "hidden", display: "flex", alignItems: "stretch" }}>
                  <div style={{ width: 5, backgroundColor: TEAL, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#059669", marginBottom: 3 }}>REFERRAL CODE</div>
                      <div style={{ fontSize: 19, fontWeight: 900, color: "#064e38", fontFamily: "monospace", letterSpacing: 1 }}>{partner.referralCode}</div>
                    </div>
                    <div style={{ fontSize: 10, color: "#6b7280", textAlign: "right" as const }}>Use at kizazihire.com.au</div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 12, paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round"><circle cx="8" cy="8" r="6" /><line x1="8" y1="2" x2="8" y2="14" /><line x1="2" y1="8" x2="14" y2="8" /><ellipse cx="8" cy="8" rx="3" ry="6" /></svg>
                  <span style={{ fontSize: 9.5, color: "#9ca3af", marginLeft: 4 }}>kizazihire.com.au</span>
                  <span style={{ fontSize: 9.5, color: "#d1d5db", margin: "0 8px" }}>|</span>
                  <span style={{ fontSize: 9.5, color: "#9ca3af" }}>NDIS Workforce Platform</span>
                  <span style={{ fontSize: 9.5, color: "#d1d5db", margin: "0 8px" }}>|</span>
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round"><path d="M2 10c2-4 6-4 8 0" /><path d="M14 6c-2 4-6 4-8 0" /></svg>
                  <span style={{ fontSize: 9.5, color: "#9ca3af", marginLeft: 4 }}>In partnership with {partner.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* URL row */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground">Student landing page URL</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1.5 flex-1 break-all select-all">{studentUrl}</code>
              <button onClick={() => navigator.clipboard.writeText(studentUrl)} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted/50 transition-colors shrink-0">Copy</button>
            </div>
            <p className="text-xs text-muted-foreground">Share this link or QR code in course handbooks, orientation packs, or on your LMS.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
