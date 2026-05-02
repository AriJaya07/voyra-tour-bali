"use client";

import Link from "next/link";
import NotificationCategoryBadge from "./NotificationCategoryBadge";
import type { AppNotificationDTO } from "@/utils/hooks/useNotifications";

interface Props {
  item: AppNotificationDTO;
  onMarkRead?: (id: number, read: boolean) => void;
  onDismiss?: (id: number) => void;
  compact?: boolean;
  onNavigate?: () => void;
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export default function NotificationItem({
  item,
  onMarkRead,
  onDismiss,
  compact = false,
  onNavigate,
}: Props) {
  const unread = !item.readAt;

  const inner = (
    <div className="flex items-start gap-3 w-full text-left">
      <span
        aria-hidden
        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
          unread ? "bg-[#0071CE]" : "bg-transparent"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <NotificationCategoryBadge category={item.category} />
          <span className="text-[11px] text-gray-400">{timeAgo(item.createdAt)}</span>
        </div>
        <p
          className={`text-sm leading-snug ${
            unread ? "text-gray-900 font-bold" : "text-gray-700 font-semibold"
          }`}
        >
          {item.title}
        </p>
        {!compact && (
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed line-clamp-2">{item.body}</p>
        )}
      </div>
    </div>
  );

  const handleClick = async () => {
    if (unread && onMarkRead) onMarkRead(item.id, true);
    if (onNavigate) onNavigate();
  };

  const wrapperClass = `block w-full text-left rounded-xl border p-3 transition ${
    unread
      ? "border-blue-100 bg-blue-50/40 hover:bg-blue-50"
      : "border-gray-100 bg-white hover:border-gray-200"
  }`;

  if (item.url) {
    return (
      <div className="relative">
        <Link href={item.url} className={wrapperClass} onClick={handleClick}>
          {inner}
        </Link>
        <ItemActions
          unread={unread}
          itemId={item.id}
          onMarkRead={onMarkRead}
          onDismiss={onDismiss}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <button type="button" onClick={handleClick} className={wrapperClass}>
        {inner}
      </button>
      <ItemActions
        unread={unread}
        itemId={item.id}
        onMarkRead={onMarkRead}
        onDismiss={onDismiss}
      />
    </div>
  );
}

function ItemActions({
  unread,
  itemId,
  onMarkRead,
  onDismiss,
}: {
  unread: boolean;
  itemId: number;
  onMarkRead?: (id: number, read: boolean) => void;
  onDismiss?: (id: number) => void;
}) {
  return (
    <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition">
      {onMarkRead && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkRead(itemId, unread);
          }}
          className="px-1.5 py-0.5 text-[10px] font-bold text-gray-600 bg-white hover:bg-gray-50 rounded border border-gray-200"
          title={unread ? "Mark as read" : "Mark as unread"}
        >
          {unread ? "✓" : "○"}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss(itemId);
          }}
          className="px-1.5 py-0.5 text-[10px] font-bold text-red-600 bg-white hover:bg-red-50 rounded border border-red-100"
          title="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
