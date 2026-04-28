"use client";

import { useState } from "react";
import Link from "next/link";

import { useTourcmsProducts } from "@/utils/hooks/useTourcms";
import TourcmsCard from "@/components/tourcms/TourcmsCard";
import Pagination from "@/components/ui/Pagination";

const PAGE_SIZE = 5;

export default function TourcmsTrending() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useTourcmsProducts({
    page,
    pageSize: PAGE_SIZE,
  });

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

      {isError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 mb-3 text-xs text-yellow-700">
          TourCMS data unavailable — please try again later
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 min-h-[300px]">
        {isLoading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-xl bg-gray-100 animate-pulse"
              />
            ))
          : (data?.items ?? []).map((it) => (
              <TourcmsCard key={it.productCode} item={it} />
            ))}
      </div>

      {totalPages > 1 && (
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
