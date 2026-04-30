"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistItem {
  id?: number;
  productCode: string;
  source: "viator" | "local" | "tourcms" | string;
  title: string;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  href?: string | null;
}

interface WishlistStore {
  items: WishlistItem[];
  hydrated: boolean;
  setItems: (items: WishlistItem[]) => void;
  add: (item: WishlistItem) => void;
  remove: (productCode: string, source: string) => void;
  has: (productCode: string, source: string) => boolean;
  setHydrated: (v: boolean) => void;
}

const key = (productCode: string, source: string) => `${source}::${productCode}`;

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      setItems: (items) => set({ items }),
      add: (item) => {
        if (get().items.some((i) => key(i.productCode, i.source) === key(item.productCode, item.source))) return;
        set({ items: [item, ...get().items] });
      },
      remove: (productCode, source) =>
        set({
          items: get().items.filter((i) => key(i.productCode, i.source) !== key(productCode, source)),
        }),
      has: (productCode, source) =>
        get().items.some((i) => key(i.productCode, i.source) === key(productCode, source)),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "voyra_wishlist",
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
);

async function apiList(): Promise<WishlistItem[]> {
  const res = await fetch("/api/wishlist", { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function apiAdd(item: WishlistItem) {
  await fetch("/api/wishlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
}

async function apiRemove(productCode: string, source: string) {
  await fetch(`/api/wishlist?productCode=${encodeURIComponent(productCode)}&source=${encodeURIComponent(source)}`, {
    method: "DELETE",
  });
}

/**
 * Hydrate wishlist from server when authenticated.
 * Merges any local items into server, then loads server items into store.
 */
export function useWishlistSync(isAuthenticated: boolean) {
  const { items, setItems, hydrated } = useWishlistStore();

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      const localItems = items;
      // Push local-only to server
      await Promise.all(localItems.map((i) => apiAdd(i).catch(() => null)));
      const serverItems = await apiList();
      if (cancelled) return;
      setItems(serverItems);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isAuthenticated]);
}

/**
 * Toggle wishlist item — optimistic local + persist to server if authenticated.
 */
export function useWishlistActions(isAuthenticated: boolean) {
  const { add, remove, has } = useWishlistStore();

  const toggle = async (item: WishlistItem) => {
    if (has(item.productCode, item.source)) {
      remove(item.productCode, item.source);
      if (isAuthenticated) await apiRemove(item.productCode, item.source).catch(() => null);
    } else {
      add(item);
      if (isAuthenticated) await apiAdd(item).catch(() => null);
    }
  };

  return { toggle, has };
}
