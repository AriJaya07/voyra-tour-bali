"use client";

import { useState } from "react";
import Link from "next/link";

import { useTourcmsProducts } from "@/utils/hooks/useTourcms";
import TourcmsCard from "@/components/tourcms/TourcmsCard";
import TourcmsEmptyState from "@/components/tourcms/TourcmsEmptyState";
import Pagination from "@/components/ui/Pagination";

const PAGE_SIZE = 5;

export default function TourcmsTrending() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useTourcmsProducts({
    page,
    pageSize: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 0;

  return (
    <section id="tourcms-trending" className="py-10">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl sm:text-3xl font-bold text-black">
          TourCMS Featured
        </h2>
        <Link
          href="/tourcms"
          className="text-xs text-[#0071CE] font-bold hover:underline"
        >
          See all →
        </Link>
      </div>
      <p className="text-gray-500 text-sm mb-4">
        Curated tours from our TourCMS partner network
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 min-h-[300px]">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-gray-100 bg-white">
          <TourcmsEmptyState
            variant="error"
            action={
              <button
                type="button"
                onClick={() => refetch?.()}
                className="px-5 py-2 bg-[#0071CE] text-white rounded-lg font-bold hover:bg-[#005ba6]"
              >
                Try again
              </button>
            }
          />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white">
          <TourcmsEmptyState
            variant="no-data"
            description="Our partner catalogue is being populated. Check back soon — featured Bali tours will appear here as our operators publish them."
            action={
              <Link
                href="/tourcms"
                className="inline-block px-5 py-2 border border-gray-300 rounded-lg font-bold hover:bg-gray-50"
              >
                Browse all tours
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 min-h-[300px]">
          {items.map((it) => (
            <TourcmsCard key={it.productCode} item={it} />
          ))}
        </div>
      )}

      {totalPages > 1 && items.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          isLoading={isLoading}
        />
      )}
    </section>
  );
}
