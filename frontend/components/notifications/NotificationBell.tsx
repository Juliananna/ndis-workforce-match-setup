import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { Notification } from "~backend/notifications/list";

const TYPE_COLOR: Record<string, string> = {
  DOCUMENT_EXPIRED: "text-red-400",
  DOCUMENT_EXPIRING_30: "text-orange-400",
  DOCUMENT_EXPIRING_60: "text-yellow-400",
  ADMIN_DOCUMENT_MESSAGE: "text-primary",
};

export function NotificationBell() {
  const api = useAuthedBackend();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!api) return;
    try {
      const res = await api.notifications.listNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      /* silent */
    }
  }, [api]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = async () => {
    setOpen((v) => !v);
    if (!open && unreadCount > 0 && api) {
      const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n.id);
      try {
        await api.notifications.markNotificationsRead({ notificationIds: unreadIds });
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
      } catch {
        /* silent */
      }
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 space-y-0.5 ${!n.readAt ? "bg-primary/5" : ""}`}
                >
                  <p className={`text-xs font-semibold ${TYPE_COLOR[n.type] ?? "text-foreground"}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">{n.body}</p>
                  {n.senderName && n.type === "ADMIN_DOCUMENT_MESSAGE" && (
                    <p className="text-[10px] text-muted-foreground/60">From: {n.senderName}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
