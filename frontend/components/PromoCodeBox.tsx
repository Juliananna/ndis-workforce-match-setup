import { useState } from "react";
import { Tag, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useAuthedBackend } from "../hooks/useAuthedBackend";

interface Props {
  onRedeemed?: () => void;
  className?: string;
}

export function PromoCodeBox({ onRedeemed, className = "" }: Props) {
  const api = useAuthedBackend();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async () => {
    if (!api || !code.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.sales.redeemPromo({ code: code.trim() });
      setSuccess(res.grantsApplied);
      setCode("");
      onRedeemed?.();
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to redeem code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <Tag className="h-3.5 w-3.5" />
          Have a promo code?
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {success ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-green-500 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Code applied!
              </div>
              <ul className="space-y-0.5">
                {success.map((g) => (
                  <li key={g} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-green-500 shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setSuccess(null); setOpen(false); }}
                className="text-xs text-muted-foreground hover:text-foreground underline mt-1 text-left"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
                  placeholder="ENTER CODE"
                  className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={loading}
                  autoFocus
                />
                <button
                  onClick={handleRedeem}
                  disabled={loading || !code.trim()}
                  className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                </button>
              </div>
              {error && (
                <div className="flex items-center gap-1.5 text-destructive text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
