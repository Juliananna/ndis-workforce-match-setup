import { Clock } from "lucide-react";

function formatLastSeen(isoDate: string | null | undefined): { label: string; color: string } {
  if (!isoDate) return { label: "Never logged in", color: "text-muted-foreground/50" };

  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 5) return { label: "Online now", color: "text-green-500" };
  if (diffMins < 60) return { label: `${diffMins}m ago`, color: "text-green-400" };
  if (diffHours < 24) return { label: `${diffHours}h ago`, color: "text-yellow-400" };
  if (diffDays === 1) return { label: "Yesterday", color: "text-yellow-500" };
  if (diffDays < 7) return { label: `${diffDays}d ago`, color: "text-orange-400" };
  if (diffDays < 30) return { label: `${Math.floor(diffDays / 7)}w ago`, color: "text-orange-500" };
  return { label: `${Math.floor(diffDays / 30)}mo ago`, color: "text-muted-foreground/60" };
}

interface Props {
  lastLoginAt: string | null | undefined;
  className?: string;
}

export function LastOnlineBadge({ lastLoginAt, className = "" }: Props) {
  const { label, color } = formatLastSeen(lastLoginAt);
  const isOnline = label === "Online now";

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color} ${className}`}>
      {isOnline ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
      ) : (
        <Clock className="h-3 w-3 shrink-0" />
      )}
      {label}
    </span>
  );
}
