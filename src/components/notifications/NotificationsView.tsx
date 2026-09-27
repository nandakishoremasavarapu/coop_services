"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BellOff, CheckCheck, Bell, MessageSquare, Star, ReceiptText, Megaphone } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  content?: string | null;
  isRead?: boolean | null;
  createdAt: string;
}

const TYPE_META: Record<string, { icon: React.ReactNode; chip: string }> = {
  booking: { icon: <ReceiptText className="size-4.5" />, chip: "bg-brand-50 text-brand-700" },
  message: { icon: <MessageSquare className="size-4.5" />, chip: "bg-info-100 text-info-700" },
  rating: { icon: <Star className="size-4.5" />, chip: "bg-accent-50 text-accent-700" },
  default: { icon: <Megaphone className="size-4.5" />, chip: "bg-ink-100 text-ink-600" },
};

export function NotificationsView() {
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    apiFetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => setNotifications([]));
  }, []);

  const unreadCount = useMemo(() => (notifications ?? []).filter((n) => !n.isRead).length, [notifications]);

  const markAllRead = async () => {
    setMarking(true);
    // optimistic
    setNotifications((prev) => (prev ?? []).map((n) => ({ ...n, isRead: true })));
    try {
      await apiFetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({}),
      });
    } catch {
      /* keep optimistic state */
    } finally {
      setMarking(false);
    }
  };

  const markRead = async (id: string) => {
    setNotifications((prev) => (prev ?? []).map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await apiFetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ notificationId: id }),
      });
    } catch {
      /* tolerate */
    }
  };

  if (notifications === null) {
    return (
      <div className="space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<BellOff />}
        title="All caught up"
        description="Quote arrivals, booking milestones and receipts will land here as they happen."
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 pb-4">
        <p className="text-sm text-ink-500">
          {unreadCount > 0 ? (
            <>
              <strong className="text-ink-900">{unreadCount} unread</strong> update{unreadCount > 1 ? "s" : ""}
            </>
          ) : (
            "No unread updates"
          )}
        </p>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={marking}
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            <CheckCheck className="size-4" aria-hidden />
            Mark all read
          </button>
        )}
      </div>

      <ul className="space-y-2.5">
        {notifications.map((n) => {
          const meta = TYPE_META[n.type] ?? TYPE_META.default;
          const unread = !n.isRead;
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={unread ? () => markRead(n.id) : undefined}
                className={cn(
                  "w-full text-left rounded-2xl border p-4 flex items-start gap-3.5 transition-colors",
                  unread ? "border-brand-200 bg-brand-50/50 hover:bg-brand-50" : "border-line bg-panel"
                )}
                aria-label={unread ? `${n.title} — mark as read` : n.title}
              >
                <span className={cn("size-9.5 rounded-xl flex items-center justify-center shrink-0", meta.chip)} aria-hidden>
                  {meta.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-start justify-between gap-2">
                    <span className={cn("text-sm leading-snug", unread ? "font-bold text-ink-900" : "font-semibold text-ink-700")}>
                      {n.title}
                    </span>
                    {unread && <span className="mt-1 size-2 rounded-full bg-brand-600 shrink-0" aria-hidden />}
                  </span>
                  {n.content && <span className="block text-xs text-ink-500 mt-0.5 leading-relaxed">{n.content}</span>}
                  <span className="block text-2xs text-ink-400 mt-1.5">{relativeTime(n.createdAt)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function NotificationsBellDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 size-4.5 min-w-4.5 px-0.5 rounded-full bg-danger-500 text-white text-2xs font-bold inline-flex items-center justify-center ring-2 ring-panel" aria-label={`${count} unread notifications`}>
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function useUnreadNotifications() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    apiFetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => {
        if (!alive) return;
        setCount((d.notifications ?? []).filter((n: AppNotification) => !n.isRead).length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return count;
}

export { Bell as NotificationBellIcon };
