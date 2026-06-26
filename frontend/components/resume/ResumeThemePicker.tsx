import { useState } from "react";
import { Lock, Sparkles, Check, Loader2, Crown } from "lucide-react";
import backend from "~backend/client";
import { useToast } from "@/components/ui/use-toast";
import type { ResumeTheme } from "./ResumePreviewCard";

interface ThemeMeta {
  id: ResumeTheme;
  label: string;
  description: string;
  premium: boolean;
  preview: React.ReactNode;
}

const THEMES: ThemeMeta[] = [
  {
    id: "classic_free",
    label: "Classic",
    description: "Teal gradient header, clean body — KizaziHire branded",
    premium: false,
    preview: (
      <div className="w-full h-20 rounded-lg overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-600 flex items-end">
        <div className="w-full bg-white/90 p-2 space-y-1">
          <div className="h-1.5 bg-slate-200 rounded w-3/4" />
          <div className="h-1 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
    ),
  },
  {
    id: "modern",
    label: "Modern",
    description: "Dark sidebar layout with two-column design",
    premium: true,
    preview: (
      <div className="w-full h-20 rounded-lg overflow-hidden flex">
        <div className="w-10 bg-slate-800 p-1.5 flex flex-col gap-1">
          <div className="h-1 bg-slate-600 rounded" />
          <div className="h-1 bg-slate-600 rounded w-2/3" />
          <div className="h-1 bg-slate-600 rounded w-1/2" />
        </div>
        <div className="flex-1 bg-white p-2 space-y-1">
          <div className="h-1.5 bg-slate-200 rounded w-3/4" />
          <div className="h-1 bg-slate-100 rounded w-full" />
          <div className="h-1 bg-slate-100 rounded w-5/6" />
        </div>
      </div>
    ),
  },
  {
    id: "executive",
    label: "Executive",
    description: "Bold indigo accents with two-column body",
    premium: true,
    preview: (
      <div className="w-full h-20 rounded-lg overflow-hidden bg-white border-b-4 border-indigo-600">
        <div className="px-2 pt-2 space-y-1">
          <div className="h-2 bg-slate-800 rounded w-1/2" />
          <div className="h-1 bg-indigo-300 rounded w-1/3" />
          <div className="mt-1 grid grid-cols-2 gap-1">
            <div className="space-y-0.5">
              <div className="h-1 bg-slate-100 rounded" />
              <div className="h-1 bg-slate-100 rounded" />
            </div>
            <div className="space-y-0.5">
              <div className="h-1 bg-indigo-100 rounded" />
              <div className="h-1 bg-indigo-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Centred serif layout, elegant whitespace",
    premium: true,
    preview: (
      <div className="w-full h-20 rounded-lg overflow-hidden bg-white flex flex-col items-center justify-center gap-1 p-2 border-b border-slate-100">
        <div className="h-2 bg-slate-800 rounded w-1/2" />
        <div className="h-1 bg-slate-300 rounded w-1/3" />
        <div className="h-px w-3/4 bg-slate-100 my-1" />
        <div className="h-1 bg-slate-100 rounded w-full" />
        <div className="h-1 bg-slate-100 rounded w-5/6" />
      </div>
    ),
  },
];

interface Props {
  sessionId: string;
  isPremium: boolean;
  selectedTheme: ResumeTheme;
  onThemeChange: (theme: ResumeTheme) => void;
  onPremiumUnlocked: () => void;
}

export function ResumeThemePicker({ sessionId, isPremium, selectedTheme, onThemeChange, onPremiumUnlocked }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState<ResumeTheme | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const handleSelectTheme = async (theme: ResumeTheme) => {
    if (!isPremium && THEMES.find((t) => t.id === theme)?.premium) return;
    if (theme === selectedTheme) return;
    setSaving(theme);
    try {
      await backend.resume.saveResumeTheme({ id: sessionId, theme });
      onThemeChange(theme);
    } catch (err) {
      console.error(err);
      toast({ title: "Could not save theme", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleUpgrade = async () => {
    setCheckingOut(true);
    try {
      const { checkoutUrl } = await backend.resume.createResumePremiumCheckout({ id: sessionId });
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error(err);
      toast({ title: "Could not start checkout", variant: "destructive" });
      setCheckingOut(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-600" />
          <h3 className="font-bold text-slate-800 text-sm">Resume Design</h3>
        </div>
        {isPremium && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
            <Crown className="h-3 w-3" /> Premium
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {THEMES.map((theme) => {
          const locked = theme.premium && !isPremium;
          const active = selectedTheme === theme.id;
          const isLoading = saving === theme.id;

          return (
            <button
              key={theme.id}
              onClick={() => locked ? undefined : handleSelectTheme(theme.id)}
              disabled={isLoading}
              className={`relative rounded-xl border-2 overflow-hidden text-left transition-all ${
                active
                  ? "border-teal-500 shadow-md"
                  : locked
                  ? "border-slate-100 opacity-70 cursor-default"
                  : "border-slate-100 hover:border-teal-300 cursor-pointer"
              }`}
            >
              {theme.preview}
              <div className="px-2 py-1.5 bg-white">
                <p className="text-xs font-bold text-slate-700 leading-tight">{theme.label}</p>
              </div>

              {active && (
                <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-teal-500 flex items-center justify-center shadow">
                  {isLoading ? <Loader2 className="h-3 w-3 text-white animate-spin" /> : <Check className="h-3 w-3 text-white" />}
                </div>
              )}

              {locked && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] text-slate-500 font-semibold">Premium</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!isPremium && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Crown className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">Unlock Premium — $9.99</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Get 3 professional designs and remove KizaziHire branding from your PDF.
              </p>
            </div>
          </div>
          <ul className="space-y-1 text-xs text-slate-600">
            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-amber-500 shrink-0" />Modern, Executive & Minimal themes</li>
            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-amber-500 shrink-0" />No KizaziHire branding on PDF</li>
            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-amber-500 shrink-0" />One-time payment, yours forever</li>
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={checkingOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
            {checkingOut ? "Redirecting…" : "Unlock Premium Themes — $9.99"}
          </button>
          <p className="text-xs text-slate-400 text-center">Secure payment via Stripe</p>
        </div>
      )}

      {isPremium && (
        <p className="text-xs text-slate-400 text-center">
          Your PDF will use the selected design with no KizaziHire branding.
        </p>
      )}
    </div>
  );
}
