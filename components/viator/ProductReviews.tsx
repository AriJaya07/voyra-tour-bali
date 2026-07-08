"use client";

import { useEffect, useState } from "react";

interface ReviewItem {
  rating: number;
  title: string | null;
  text: string | null;
  userName: string | null;
  publishedDate: string | null;
}

interface ReviewData {
  totalCount: number;
  averageRating: number | null;
  reviews: ReviewItem[];
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm leading-none" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(Math.round(rating))}
      <span className="text-gray-200">{"★".repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

/**
 * Traveler reviews for a Viator product — social proof at the pay decision.
 * Renders nothing while loading or when the product has no reviews.
 */
export default function ProductReviews({ productCode }: { productCode: string }) {
  const [data, setData] = useState<ReviewData | null>(null);

  useEffect(() => {
    if (!productCode) return;
    let cancelled = false;
    fetch(`/api/viator/reviews/${encodeURIComponent(productCode)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (!cancelled && d && d.totalCount > 0) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [productCode]);

  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">Traveler reviews</h3>
        {data.averageRating != null && (
          <div className="flex items-center gap-1.5">
            <Stars rating={data.averageRating} />
            <span className="text-sm font-bold text-gray-900">{data.averageRating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({data.totalCount.toLocaleString()})</span>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {data.reviews.slice(0, 3).map((r, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-1">
              <Stars rating={r.rating} />
              <span className="text-[11px] text-gray-400">
                {r.userName || "Traveler"}
                {r.publishedDate ? ` · ${r.publishedDate.slice(0, 10)}` : ""}
              </span>
            </div>
            {r.title && <p className="text-xs font-bold text-gray-800">{r.title}</p>}
            {r.text && <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">{r.text}</p>}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-3">Reviews collected by Viator from verified bookings.</p>
    </div>
  );
}
