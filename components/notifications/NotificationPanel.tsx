"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import NotificationItem from "./NotificationItem";
import { useNotifications } from "@/utils/hooks/useNotifications";

interface Props {
  open: boolean;
  onClose: () => void;
  onUnreadCountChange?: (n: number) => void;
}

export default function NotificationPanel({ open, onClose, onUnreadCountChange }: Props) {
  const { items, unreadCount, loading, markRead, markAllRead, dismiss } = useNotifications({
    enabled: open,
    limit: 10,
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onUnreadCountChange) onUnreadCountChange(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  if (!open) return null;

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      toast.success("All notifications marked read");
    } catch {
      toast.error("Could not mark all as read");
    }
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Notifications"
      className="fixed sm:absolute right-0 left-0 sm:left-auto top-16 sm:top-full sm:mt-2 z-50 sm:w-96 max-h-[70vh] sm:max-h-[80vh] overflow-y-auto bg-white sm:rounded-2xl border border-gray-100 shadow-xl mx-2 sm:mx-0"
    >
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between gap-2 z-10">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-[11px] text-gray-500">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAll}
            className="text-[11px] font-bold text-[#0071CE] hover:underline shrink-0"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        {loading && items.length === 0 ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0071CE] border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-2" aria-hidden>
              🔔
            </p>
            <p className="text-sm font-bold text-gray-900">You&apos;re all caught up</p>
            <p className="text-xs text-gray-500 mt-1">New notifications will appear here.</p>
          </div>
        ) : (
          items.map((it) => (
            <NotificationItem
              key={it.id}
              item={it}
              compact
              onMarkRead={markRead}
              onDismiss={dismiss}
              onNavigate={onClose}
            />
          ))
        )}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3">
        <Link
          href="/profile/inbox"
          onClick={onClose}
          className="block text-center text-sm font-bold text-[#0071CE] hover:underline"
        >
          View all in inbox →
        </Link>
      </div>
    </div>
  );
}
