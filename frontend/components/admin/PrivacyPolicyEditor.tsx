import { useEffect, useState } from "react";
import { ShieldCheck, Save, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "../../contexts/AuthContext";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import backend from "~backend/client";

export default function PrivacyPolicyEditor() {
  const { user } = useAuth();
  const authedBackend = useAuthedBackend();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSysAdmin = user?.isAdmin === true;

  useEffect(() => {
    backend.admin.getPrivacyPolicy()
      .then((res) => {
        setContent(res.content);
        setUpdatedAt(res.updatedAt ? new Date(res.updatedAt) : null);
        setUpdatedBy(res.updatedBy);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!authedBackend) throw new Error("Not authenticated");
      await authedBackend.admin.updatePrivacyPolicy({ content });
      toast({ title: "Privacy policy saved" });
      setUpdatedAt(new Date());
      setUpdatedBy(user?.email ?? null);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Privacy Policy</h2>
        </div>
        <a
          href="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View public page
        </a>
      </div>

      {updatedAt && (
        <p className="text-xs text-muted-foreground">
          Last updated {updatedAt.toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })}
          {updatedBy ? ` by ${updatedBy}` : ""}
        </p>
      )}

      {isSysAdmin ? (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={30}
            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
            placeholder="Paste or type your privacy policy here..."
          />
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Policy
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground whitespace-pre-wrap min-h-40">
          {content || "No privacy policy set yet."}
        </div>
      )}
    </div>
  );
}
