"use client";

import { useState, useEffect } from "react";
import { useViatorAttractions } from "@/utils/hooks/useViator";
import OptimizedImage from "@/components/common/OptimizedImage";
import Pagination from "@/components/ui/Pagination";

interface AttractionsSectionProps {
  query?: string;
}

export default function AttractionsSection({ query = "" }: AttractionsSectionProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useViatorAttractions(query, page, 6);

  const attractions = data?.attractions ?? [];
  const rawTotalPages = Math.ceil((data?.totalCount ?? 0) / 6);
  const [totalPages, setTotalPages] = useState(0);
  useEffect(() => {
    if (rawTotalPages > 0) setTotalPages(rawTotalPages);
  }, [rawTotalPages]);

  if (!isLoading && attractions.length === 0 && page === 1) return null;

  return (
    <section className="py-8">
      <h2 className="text-xl font-bold text-gray-900 mb-1">
        Popular Attractions in Bali
      </h2>
      <p className="text-sm text-gray-400 mb-5">
        Discover top places visited by travelers
      </p>

      <div className="min-h-[400px] flex flex-col justify-between">
        {isLoading && attractions.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {attractions.map((attraction) => (
              <div
                key={attraction.attractionId}
                className="group rounded-xl overflow-hidden border border-gray-100 bg-white hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {attraction.imageUrl ? (
                    <OptimizedImage
                      src={attraction.imageUrl}
                      alt={attraction.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-[#0071CE] transition-colors">
                    {attraction.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    {attraction.rating && (
                      <span
                        className="flex items-center gap-0.5"
                        title="Total review count and overall rating based on Viator and Tripadvisor reviews"
                      >
                        <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                        <span className="font-semibold text-gray-600">{attraction.rating.toFixed(1)}</span>
                      </span>
                    )}
                    {attraction.productCount > 0 && (
                      <span>{attraction.productCount} tours</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </section>
  );
}
