import { useState, useEffect, useCallback } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { Review } from "~backend/reviews/reviews";

interface Props {
  offerId: string;
  myRole: "EMPLOYER" | "WORKER";
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={`transition-colors ${onChange ? "cursor-pointer" : "cursor-default"}`}
          disabled={!onChange}
        >
          <Star
            className={`h-5 w-5 ${
              star <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewPanel({ offerId, myRole }: Props) {
  const api = useAuthedBackend();
  const [existing, setExisting] = useState<Review | null | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    try {
      const res = await api.reviews.getMyReviewForOffer({ offerId });
      setExisting(res.review);
      if (res.review) {
        setRating(res.review.rating);
        setComment(res.review.comment ?? "");
      }
    } catch {
      setExisting(null);
    }
  }, [api, offerId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (rating === 0) { setError("Please select a rating"); return; }
    if (!api) return;
    setSaving(true);
    setError(null);
    try {
      const rev = await api.reviews.submitReview({ offerId, rating, comment: comment || undefined });
      setExisting(rev);
    } catch (e: unknown) {
      console.error("Failed to submit review:", e);
      setError(e instanceof Error ? e.message : "Failed to submit review");
    } finally {
      setSaving(false);
    }
  };

  if (existing === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…
      </div>
    );
  }

  const revieweeLabel = myRole === "EMPLOYER" ? "the worker" : "the employer";

  if (existing) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Your review of {revieweeLabel}</p>
        <StarRating value={existing.rating} />
        {existing.comment && <p className="text-sm text-foreground italic">"{existing.comment}"</p>}
        <p className="text-xs text-muted-foreground">{new Date(existing.createdAt).toLocaleDateString()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Leave a review for {revieweeLabel}</p>
      <StarRating value={rating} onChange={setRating} />
      <textarea
        rows={2}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        placeholder="Write an optional comment…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        disabled={saving}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button size="sm" onClick={handleSubmit} disabled={saving || rating === 0}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
        Submit Review
      </Button>
    </div>
  );
}
