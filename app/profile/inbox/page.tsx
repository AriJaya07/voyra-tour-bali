"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import BackLink from "@/components/common/BackLink";
import NotificationItem from "@/components/notifications/NotificationItem";
import { useNotifications } from "@/utils/hooks/useNotifications";
import { useConfirm } from "@/components/common/ConfirmDialog";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
] as const;

const CATEGORY_FILTERS = [
  { id: null, label: "All categories" },
  { id: "SYSTEM", label: "System" },
  { id: "DEAL", label: "Deals" },
  { id: "TRAVEL", label: "Travel" },
  { id: "ALERT", label: "Alerts" },
  { id: "NEWS", label: "News" },
];

export default function InboxPage() {
  const { status: sessionStatus } = useSession();
  const confirm = useConfirm();
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [category, setCategory] = useState<string | null>(null);

  const {
    items,
    unreadCount,
    loading,
    nextCursor,
    loadMore,
    markRead,
    markAllRead,
    dismiss,
  } = useNotifications({
    status: statusFilter,
    category,
    enabled: sessionStatus === "authenticated",
  });

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in required</h1>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-[#0071CE] text-white font-bold rounded-full hover:bg-[#005ba6] transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      toast.success("All notifications marked read");
    } catch {
      toast.error("Could not mark all read");
    }
  };

  const handleDismiss = async (id: number) => {
    const ok = await confirm({
      title: "Dismiss this notification?",
      description: "It will be permanently removed from your inbox.",
      confirmLabel: "Dismiss",
      cancelLabel: "Keep it",
      destructive: true,
    });
    if (!ok) return;
    try {
      await dismiss(id);
      toast.success("Removed");
    } catch {
      toast.error("Could not remove");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-row items-center gap-4 mb-2 flex-wrap">
          <BackLink href="/profile" label="Back to profile" />
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        </div>
        <div className="flex items-end justify-between mb-6 gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"} · Notifications, alerts, and deals.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="shrink-0 px-4 py-2.5 text-xs font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-100 transition"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm mb-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
                  statusFilter === f.id
                    ? "bg-[#0071CE] text-white border-[#0071CE]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-[#0071CE]/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={String(c.id)}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1 text-[11px] font-bold rounded-full border transition ${
                  category === c.id
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {loading && items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#0071CE] border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <p className="text-3xl mb-2" aria-hidden>
                📭
              </p>
              <p className="text-gray-900 font-bold text-lg mb-1">Nothing here yet</p>
              <p className="text-sm text-gray-500">
                You&apos;ll see updates from Voyra and your bookings on this page.
              </p>
            </div>
          ) : (
            items.map((it) => (
              <NotificationItem
                key={it.id}
                item={it}
                onMarkRead={markRead}
                onDismiss={handleDismiss}
              />
            ))
          )}

          {nextCursor && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="px-5 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 rounded-full border border-gray-200 transition disabled:opacity-60"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
