"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { create } from "zustand";

export interface RecentlyViewedItem {
  productCode: string;
  source: "viator" | "local" | "tourcms" | string;
  title: string;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  href?: string | null;
  viewedAt: number;
}

const MAX_ITEMS = 12;
const key = (productCode: string, source: string) => `${source}::${productCode}`;

interface RecentlyViewedStore {
  items: RecentlyViewedItem[];
  /** True once initial sync (server fetch for authed, immediate for guest) is complete. */
  hydrated: boolean;
  setItems: (items: RecentlyViewedItem[]) => void;
  add: (item: Omit<RecentlyViewedItem, "viewedAt">) => void;
  clear: () => void;
  setHydrated: (v: boolean) => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedStore>()((set, get) => ({
  items: [],
  hydrated: false,
  setItems: (items) => set({ items }),
  add: (item) => {
    const k = key(item.productCode, item.source);
    const filtered = get().items.filter((i) => key(i.productCode, i.source) !== k);
    const next = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    set({ items: next });
  },
  clear: () => set({ items: [] }),
  setHydrated: (hydrated) => set({ hydrated }),
}));

/**
 * Mount on tour detail page to record a view.
 * In-memory for guests; persisted to DB for authenticated users.
 */
export function useTrackRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt"> | null) {
  const add = useRecentlyViewedStore((s) => s.add);
  const hydrated = useRecentlyViewedStore((s) => s.hydrated);
  const { status } = useSession();

  useEffect(() => {
    if (!hydrated || !item) return;
    add(item);
    if (status === "authenticated") {
      fetch("/api/recently-viewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      }).catch(() => null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, status, item?.productCode, item?.source]);
}
