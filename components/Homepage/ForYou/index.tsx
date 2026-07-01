"use client";

import { useEffect, useState } from "react";
import { useCurrency } from "@/utils/hooks/useCurrency";
import { ActivityCard } from "@/components/Homepage/TrendingActivity/ActivityCard";
import type { UnifiedActivity } from "@/types/tourism";

/** Mirrors RecommendedItem from lib/services/recommendationService.ts */
interface ForYouItem {
  id: string;
  source: "db";
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: "IDR";
  slug: string;
  categoryId: number | null;
  reason: string;
  score: number;
}

interface ForYouResponse {
  authed: boolean;
  personalized: boolean;
  items: ForYouItem[];
}

/**
 * "For You" personalized rail (Feature 3). Renders only for signed-in users
 * with catalog recommendations. Silent (renders nothing) for guests, on error,
 * or when there is nothing to show — so it never disrupts the homepage.
 */
export default function ForYou() {
  const { currency } = useCurrency();
  const [state, setState] = useState<ForYouResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/for-you", { cache: "no-store" });
        const data = (await res.json()) as ForYouResponse;
        if (!cancelled) {
          setState(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setState(null);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Guest / error / empty → render nothing (Trending already covers everyone).
  if (loading) return null;
  if (!state?.authed || state.items.length === 0) return null;

  return (
    <section className="mt-10 sm:mt-14" aria-labelledby="for-you-heading">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 id="for-you-heading" className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span aria-hidden className="text-amber-500">✦</span>
            {state.personalized ? "Picked for you" : "You might like"}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {state.personalized
              ? "Based on your travel profile, saved tours, and what you've viewed"
              : "Popular Bali experiences to get you started"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {state.items.map((item) => {
          const activity: UnifiedActivity = {
            id: item.id,
            source: item.source,
            title: item.title,
            description: item.description,
            imageUrl: item.imageUrl,
            price: item.price,
            currency: item.currency,
            slug: item.slug,
            categoryId: item.categoryId,
          };
          return (
            <div key={item.id} className="group flex flex-col">
              <ActivityCard item={activity} currency={currency} />
              <p className="mt-1.5 text-[11px] leading-snug text-amber-700/90 bg-amber-50 border border-amber-100 rounded-md px-2 py-1 line-clamp-2">
                {item.reason}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
