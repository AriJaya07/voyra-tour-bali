"use client";

import { useCallback, useEffect, useState } from "react";

export interface AppNotificationDTO {
  id: number;
  title: string;
  body: string;
  category: string;
  url: string | null;
  iconKey: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
  broadcastId: number | null;
}

interface ListResponse {
  items: AppNotificationDTO[];
  unreadCount: number;
  nextCursor: number | null;
}

export function useNotificationCount(intervalMs = 60000) {
  const [unread, setUnread] = useState(0);
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/count", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(typeof data.unread === "number" ? data.unread : 0);
    } catch {
      // silent
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCount();
    const id = setInterval(fetchCount, intervalMs);
    return () => clearInterval(id);
  }, [fetchCount, intervalMs]);
  return { unread, refresh: fetchCount, setUnread };
}

export interface UseNotificationsOpts {
  status?: "all" | "unread" | "read";
  category?: string | null;
  limit?: number;
  enabled?: boolean;
}

export function useNotifications(opts: UseNotificationsOpts = {}) {
  const { status = "all", category = null, limit = 20, enabled = true } = opts;
  const [items, setItems] = useState<AppNotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const fetchPage = useCallback(
    async (cursor: number | null = null) => {
      if (!enabled) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("status", status);
        params.set("limit", String(limit));
        if (category) params.set("category", category);
        if (cursor) params.set("cursor", String(cursor));
        const res = await fetch(`/api/notifications?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setError("Failed to load notifications");
          return;
        }
        const data = (await res.json()) as ListResponse;
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
        setUnreadCount(data.unreadCount);
        setNextCursor(data.nextCursor);
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    },
    [status, category, limit, enabled]
  );

  useEffect(() => {
    void fetchPage(null);
  }, [fetchPage]);

  const markRead = useCallback(async (id: number, read: boolean) => {
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
    if (!res.ok) throw new Error("Failed to update");
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: read ? new Date().toISOString() : null } : n))
    );
    setUnreadCount((c) => Math.max(0, c + (read ? -1 : 1)));
  }, []);

  const dismiss = useCallback(async (id: number) => {
    const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAllRead = useCallback(async () => {
    const res = await fetch("/api/notifications/read-all", { method: "POST" });
    if (!res.ok) throw new Error("Failed to mark all read");
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
  }, []);

  return {
    items,
    unreadCount,
    loading,
    error,
    nextCursor,
    loadMore: () => fetchPage(nextCursor),
    reload: () => fetchPage(null),
    markRead,
    markAllRead,
    dismiss,
  };
}
