import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";

interface Props {
  userId: string;
}

export function RatingBadge({ userId }: Props) {
  const api = useAuthedBackend();
  const [avg, setAvg] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!api) return;
    try {
      const res = await api.reviews.getReviews({ userId });
      setAvg(res.averageRating);
      setTotal(res.totalReviews);
    } catch {
      /* silent */
    } finally {
      setLoaded(true);
    }
  }, [api, userId]);

  useEffect(() => { load(); }, [load]);

  if (!loaded || total === 0) return null;

  return (
    <div className="inline-flex items-center gap-1 text-xs text-yellow-400 font-medium">
      <Star className="h-3.5 w-3.5 fill-yellow-400" />
      <span>{avg?.toFixed(1)}</span>
      <span className="text-muted-foreground font-normal">({total})</span>
    </div>
  );
}
