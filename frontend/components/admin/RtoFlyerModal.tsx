import { useRef, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Download, Loader2, Upload, CheckCircle, ImageIcon } from "lucide-react";
import { useProxyUpload } from "../../hooks/useProxyUpload";
import type { RtoPartner } from "~backend/rto/types";

interface Props {
  partner: RtoPartner;
  open: boolean;
  onClose: () => void;
  onLogoUpdated: (logoUrl: string) => void;
}

const FLYER_ACCENT = "#0d9488";
const PREVIEW_URL = "https://ndis-workforce-match-setup-d6t4j0c82vjgmsb23vrg.lp.dev";

function getStudentUrl(partner: RtoPartner) {
  return `${PREVIEW_URL}/rto/${partner.slug}`;
}

export function RtoFlyerModal({ partner, open, onClose, onLogoUpdated }: Props) {
  const flyerRef = useRef<HTMLDivElement>(null);
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
    if (!flyerRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(flyerRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `kizazi-rto-flyer-${partner.slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }, [partner.slug]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8">
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">QR Code & Flyer</h2>
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

          <div className="overflow-auto">
            <div
              ref={flyerRef}
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
              <div style={{ background: `linear-gradient(135deg, ${FLYER_ACCENT} 0%, #065f46 100%)`, padding: "36px 40px 32px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src="/kizazi-hire-logo.png"
                      alt="KIZAZI Hire"
                      style={{ height: 32, objectFit: "contain", filter: "brightness(0) invert(1)" }}
                      crossOrigin="anonymous"
                    />
                  </div>
                  {localLogoUrl && (
                    <img
                      src={localLogoUrl}
                      alt={partner.name}
                      style={{ height: 40, maxWidth: 140, objectFit: "contain", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 8px" }}
                      crossOrigin="anonymous"
                    />
                  )}
                </div>

                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                  {partner.name} · Student Pathway
                </div>
                <div style={{ color: "#ffffff", fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 8 }}>
                  Get NDIS placement-ready
                </div>
                <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.6 }}>
                  Build your free compliance profile, complete referee checks, and connect with NDIS providers — all in one place.
                </div>
              </div>

              <div style={{ padding: "32px 40px", display: "flex", gap: 32, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    What you get — free
                  </div>
                  {[
                    "Upload & manage compliance documents",
                    "Request referee checks online",
                    "Build a verified support worker profile",
                    "Connect with employers open to placement",
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: FLYER_ACCENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span style={{ color: "#374151", fontSize: 13, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}

                  <div style={{ marginTop: 20, padding: "12px 14px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: "#15803d", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
                      Referral code
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#065f46", fontFamily: "monospace", letterSpacing: 1 }}>
                      {partner.referralCode}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <div style={{ padding: 12, backgroundColor: "#ffffff", border: `3px solid ${FLYER_ACCENT}`, borderRadius: 12 }}>
                    <QRCodeSVG
                      value={studentUrl}
                      size={130}
                      fgColor="#111827"
                      bgColor="#ffffff"
                      level="M"
                    />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Scan to get started</div>
                    <div style={{ fontSize: 9, color: FLYER_ACCENT, fontWeight: 600, wordBreak: "break-all", maxWidth: 148, textAlign: "center" }}>
                      kizazihire.com.au/rto/{partner.slug}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: "#f9fafb", borderTop: "1px solid #e5e7eb", padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  kizazihire.com.au · NDIS Workforce Platform
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  In partnership with {partner.name}
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
