import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import backend from "~backend/client";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backend.admin.getPrivacyPolicy()
      .then((res) => {
        setContent(res.content);
        setUpdatedAt(res.updatedAt ? new Date(res.updatedAt) : null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Privacy Policy</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : content ? (
          <>
            {updatedAt && (
              <p className="text-sm text-muted-foreground mb-8">
                Last updated: {updatedAt.toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
            <div
              className="prose prose-sm max-w-none text-foreground leading-relaxed space-y-4 whitespace-pre-wrap"
            >
              {content}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <ShieldCheck className="h-10 w-10 mx-auto mb-4 opacity-30" />
            <p>Privacy policy coming soon.</p>
          </div>
        )}
      </main>
    </div>
  );
}
