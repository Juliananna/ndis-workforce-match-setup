import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import backend from "~backend/client";

interface VerifyEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

export function VerifyEmailModal({ open, onOpenChange, onVerified }: VerifyEmailModalProps) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await backend.auth.verifyEmail({ token: token.trim() });
      setVerified(true);
      setTimeout(() => {
        onVerified();
        onOpenChange(false);
      }, 1500);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Verification failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Verify Email</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the verification token you received after registration.
          </DialogDescription>
        </DialogHeader>

        {verified ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm text-foreground font-medium">Email verified successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="verify-token" className="text-foreground">Verification Token</Label>
              <Input
                id="verify-token"
                placeholder="Paste your token here"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="bg-input border-border text-foreground placeholder:text-muted-foreground font-mono text-xs"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
