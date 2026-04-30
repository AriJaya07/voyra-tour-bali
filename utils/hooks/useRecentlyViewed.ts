"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  hydrated: boolean;
  add: (item: Omit<RecentlyViewedItem, "viewedAt">) => void;
  clear: () => void;
  setHydrated: (v: boolean) => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      add: (item) => {
        const k = key(item.productCode, item.source);
        const filtered = get().items.filter((i) => key(i.productCode, i.source) !== k);
        const next = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
        set({ items: next });
      },
      clear: () => set({ items: [] }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "voyra_recently_viewed",
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
);

/**
 * Mount on tour detail page to record a view.
 */
export function useTrackRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt"> | null) {
  const add = useRecentlyViewedStore((s) => s.add);
  const hydrated = useRecentlyViewedStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated || !item) return;
    add(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, item?.productCode, item?.source]);
}
