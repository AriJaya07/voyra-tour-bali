"use client";

import { useState, useEffect } from "react";
import { useViatorReviews } from "@/utils/hooks/useViator";
import Pagination from "@/components/ui/Pagination";

interface ReviewsSectionProps {
  productCode: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < rating ? "text-yellow-400 fill-current" : "text-gray-200 fill-current"}`}
          viewBox="0 0 20 20"
        >
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsSection({ productCode }: ReviewsSectionProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useViatorReviews(productCode, page, 5);

  const reviews = data?.reviews ?? [];
  const totalCount = data?.totalCount ?? 0;
  const rawTotalPages = Math.ceil(totalCount / 5);
  const [totalPages, setTotalPages] = useState(0);
  useEffect(() => {
    if (rawTotalPages > 0) setTotalPages(rawTotalPages);
  }, [rawTotalPages]);

  if (!isLoading && reviews.length === 0 && page === 1) return null;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-900">
          Reviews
          {totalCount > 0 && (
            <span className="text-sm font-normal text-gray-400 ml-2">({totalCount})</span>
          )}
        </h2>
      </div>

      {/* Attribution — required by Viator */}
      <p className="text-xs text-gray-400 mb-4">
        Total review count and overall rating based on Viator and Tripadvisor reviews
      </p>

      <div className="min-h-[400px] space-y-4">
        {reviews.map((review) => (
          <div
            key={review.reviewId}
            className="bg-white border border-gray-100 rounded-xl p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <StarRating rating={review.rating} />
                {review.title && (
                  <p className="text-sm font-bold text-gray-900 mt-1.5">{review.title}</p>
                )}
              </div>
              {review.provider && (
                <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full shrink-0">
                  {review.provider}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>

            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
              {review.author && <span className="font-medium">{review.author}</span>}
              {review.author && review.publishedDate && <span>·</span>}
              {review.publishedDate && (
                <span>
                  {new Date(review.publishedDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Loading skeleton */}
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="bg-white border border-gray-100 rounded-xl p-5 animate-pulse">
              <div className="flex gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="w-4 h-4 bg-gray-200 rounded" />
                ))}
              </div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </section>
  );
}
