"use client";

import { useEffect } from "react";
import { create } from "zustand";

export interface WishlistItem {
  id?: number;
  productCode: string;
  source: "viator" | "local" | "tourcms" | string;
  title: string;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  href?: string | null;
  priceAtSave?: number | null;
  currencyAtSave?: string | null;
  savedAt?: string | null;
}

interface WishlistStore {
  items: WishlistItem[];
  /** True once initial sync (server fetch for authed, immediate for guest) is complete. */
  hydrated: boolean;
  setItems: (items: WishlistItem[]) => void;
  add: (item: WishlistItem) => void;
  remove: (productCode: string, source: string) => void;
  has: (productCode: string, source: string) => boolean;
  clear: () => void;
  setHydrated: (v: boolean) => void;
}

const key = (productCode: string, source: string) => `${source}::${productCode}`;

export const useWishlistStore = create<WishlistStore>()((set, get) => ({
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
  clear: () => set({ items: [] }),
  setHydrated: (hydrated) => set({ hydrated }),
}));

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
 * Hydrate wishlist from DB on auth state change.
 * - Authenticated: fetch from server, set items.
 * - Unauthenticated: clear items.
 */
export function useWishlistSync(status: "loading" | "authenticated" | "unauthenticated") {
  const { setItems, setHydrated, clear } = useWishlistStore();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      clear();
      setHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const serverItems = await apiList();
      if (cancelled) return;
      setItems(serverItems);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
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
