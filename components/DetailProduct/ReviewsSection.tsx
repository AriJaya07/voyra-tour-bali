"use client";

import { useEffect, useState } from "react";
import { StarSolidIcon, ThumbsUpIcon } from "@/components/assets/Icon/shared";

interface ReviewItem {
  id: number;
  rating: number;
  title: string | null;
  body: string;
  helpfulCount: number;
  createdAt: string;
  user: { name: string | null; image: string | null };
}

interface ReviewsResponse {
  reviews: ReviewItem[];
  averageRating: number;
  totalCount: number;
}

interface Props {
  productCode: string;
  source: "local" | "viator" | "tourcms";
  productTitle: string;
}

export default function ReviewsSection({ productCode, source, productTitle }: Props) {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/reviews?productCode=${encodeURIComponent(productCode)}&source=${encodeURIComponent(source)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error();
        const json: ReviewsResponse = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ reviews: [], averageRating: 0, totalCount: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productCode, source]);

  const displayed = data ? (showAll ? data.reviews : data.reviews.slice(0, 5)) : [];

  return (
    <section className="py-8 border-t border-gray-100" id="reviews">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Traveler Reviews</h2>
          {data && data.totalCount > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Stars value={Math.round(data.averageRating)} />
              <span className="font-bold text-gray-900">{data.averageRating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">({data.totalCount} review{data.totalCount === 1 ? "" : "s"})</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      ) : !data || data.reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-gray-900 font-bold mb-1">No reviews yet</p>
          <p className="text-sm text-gray-500">Be the first to share your experience after this tour.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayed.map((r) => (
              <article
                key={r.id}
                className="bg-white rounded-2xl border border-gray-100 p-5"
                itemScope
                itemType="https://schema.org/Review"
              >
                <meta itemProp="itemReviewed" content={productTitle} />
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={r.user.image || "/images/people.png"}
                    alt={r.user.name || "Traveler"}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-bold text-sm text-gray-900" itemProp="author">
                      {r.user.name || "Traveler"}
                    </p>
                    <p className="text-xs text-gray-400" itemProp="datePublished" content={r.createdAt}>
                      {new Date(r.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <div itemProp="reviewRating" itemScope itemType="https://schema.org/Rating">
                      <meta itemProp="ratingValue" content={String(r.rating)} />
                      <meta itemProp="bestRating" content="5" />
                      <Stars value={r.rating} />
                    </div>
                  </div>
                </div>
                {r.title && (
                  <p className="font-bold text-gray-900 mb-1" itemProp="name">
                    {r.title}
                  </p>
                )}
                <p className="text-sm text-gray-700 leading-relaxed" itemProp="reviewBody">
                  {r.body}
                </p>
                <HelpfulButton reviewId={r.id} initialCount={r.helpfulCount} />
              </article>
            ))}
          </div>

          {data.reviews.length > 5 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowAll((s) => !s)}
                className="px-5 py-2.5 text-sm font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-xl transition"
              >
                {showAll ? "Show less" : `Show all ${data.reviews.length} reviews`}
              </button>
            </div>
          )}

          {data.totalCount > 0 && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Product",
                  name: productTitle,
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: data.averageRating.toFixed(1),
                    reviewCount: data.totalCount,
                    bestRating: 5,
                    worstRating: 1,
                  },
                }),
              }}
            />
          )}
        </>
      )}
    </section>
  );
}

function HelpfulButton({ reviewId, initialCount }: { reviewId: number; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [pending, setPending] = useState(false);

  // Local-storage marker — not authoritative (server cookie is), but avoids re-click flicker
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(`voyra_helpful_${reviewId}`)) setVoted(true);
  }, [reviewId]);

  const onVote = async () => {
    if (voted || pending) return;
    setPending(true);
    setVoted(true);
    setCount((c) => c + 1);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/helpful`, { method: "POST" });
      if (!res.ok && res.status !== 409) throw new Error();
      const data = await res.json().catch(() => null);
      if (data?.helpfulCount !== undefined) setCount(data.helpfulCount);
      if (typeof window !== "undefined") {
        localStorage.setItem(`voyra_helpful_${reviewId}`, "1");
      }
    } catch {
      setVoted(false);
      setCount((c) => Math.max(0, c - 1));
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      onClick={onVote}
      disabled={voted || pending}
      className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
        voted
          ? "bg-blue-50 text-blue-700 border-blue-200 cursor-default"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-[#0071CE] hover:border-[#0071CE]"
      }`}
      aria-pressed={voted}
      aria-label={voted ? "You marked this helpful" : "Mark as helpful"}
    >
      <ThumbsUpIcon className="w-3.5 h-3.5" fill={voted ? "currentColor" : "none"} />
      {voted ? "Helpful" : "Mark helpful"}
      {count > 0 && <span className="opacity-70">· {count}</span>}
    </button>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarSolidIcon key={n} className={`w-4 h-4 ${n <= value ? "fill-amber-400" : "fill-gray-200"}`} />
      ))}
    </div>
  );
}
