"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRecentlyViewedStore, type RecentlyViewedItem } from "@/utils/hooks/useRecentlyViewed";

interface ServerItem {
  productCode: string;
  source: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  href: string | null;
  viewedAt: string;
}

export default function RecentlyViewedSync() {
  const { status } = useSession();
  const { setItems, setHydrated, clear } = useRecentlyViewedStore();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      clear();
      setHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/recently-viewed", { cache: "no-store" });
        if (!res.ok) return;
        const data: ServerItem[] = await res.json();
        if (cancelled) return;
        const items: RecentlyViewedItem[] = data.map((d) => ({
          productCode: d.productCode,
          source: d.source,
          title: d.title,
          imageUrl: d.imageUrl,
          price: d.price,
          currency: d.currency,
          href: d.href,
          viewedAt: new Date(d.viewedAt).getTime(),
        }));
        setItems(items);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return null;
}
