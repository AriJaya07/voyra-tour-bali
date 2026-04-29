"use client";

import { useMemo, useState } from "react";

import { useTourcmsProducts } from "@/utils/hooks/useTourcms";
import TourcmsCard from "./TourcmsCard";
import TourcmsEmptyState from "./TourcmsEmptyState";
import Pagination from "@/components/ui/Pagination";

const PAGE_SIZE = 24;

type Sort = "default" | "price_asc" | "price_desc" | "rating_desc";

const PRICE_BANDS = [
  { label: "All prices", min: 0, max: Infinity },
  { label: "Under 50", min: 0, max: 50 },
  { label: "50 – 100", min: 50, max: 100 },
  { label: "100 – 200", min: 100, max: 200 },
  { label: "200+", min: 200, max: Infinity },
];

export default function TourcmsListing() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [sort, setSort] = useState<Sort>("default");
  const [bandIdx, setBandIdx] = useState(0);

  const { data, isLoading, isError } = useTourcmsProducts({
    q: appliedQ || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const items = useMemo(() => {
    const raw = data?.items ?? [];
    const band = PRICE_BANDS[bandIdx];
    const filtered = raw.filter((it) => {
      const price = it.fromPrice ?? 0;
      return price >= band.min && price <= band.max;
    });
    const sorted = [...filtered];
    if (sort === "price_asc") {
      sorted.sort((a, b) => (a.fromPrice ?? Infinity) - (b.fromPrice ?? Infinity));
    } else if (sort === "price_desc") {
      sorted.sort((a, b) => (b.fromPrice ?? -1) - (a.fromPrice ?? -1));
    } else if (sort === "rating_desc") {
      sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    }
    return sorted;
  }, [data, sort, bandIdx]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 0;

  return (
    <section className="py-10">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">TourCMS Tours</h1>
          <p className="text-gray-500 text-sm">
            Curated tours sourced via the TourCMS partner network.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedQ(q.trim());
            setPage(1);
          }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tours…"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02ACBE]"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#0071CE] text-white rounded-lg text-sm font-semibold hover:bg-[#005ba6]"
          >
            Search
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        <select
          value={bandIdx}
          onChange={(e) => setBandIdx(Number(e.target.value))}
          className="px-3 py-1.5 border rounded-lg"
        >
          {PRICE_BANDS.map((b, i) => (
            <option key={i} value={i}>
              {b.label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="px-3 py-1.5 border rounded-lg"
        >
          <option value="default">Sort: relevance</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
          <option value="rating_desc">Rating: high → low</option>
        </select>
        {data && (
          <span className="text-xs text-gray-500 ml-auto">
            {items.length} of {data.total} tours
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <TourcmsEmptyState
          variant="error"
          action={
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-[#0071CE] text-white rounded-lg font-bold hover:bg-[#005ba6]"
            >
              Try again
            </button>
          }
        />
      ) : items.length === 0 ? (
        <TourcmsEmptyState
          variant={
            (data?.total ?? 0) === 0 && !appliedQ && bandIdx === 0
              ? "no-data"
              : "no-results"
          }
          action={
            (data?.total ?? 0) > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setAppliedQ("");
                  setBandIdx(0);
                  setSort("default");
                  setPage(1);
                }}
                className="px-5 py-2 border border-gray-300 rounded-lg font-bold hover:bg-gray-50"
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((it) => (
            <TourcmsCard key={it.productCode} item={it} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        </div>
      )}
    </section>
  );
}
