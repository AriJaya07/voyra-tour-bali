"use client";

import { useEffect, useMemo, useState } from "react";

import { useTourcmsProducts } from "@/utils/hooks/useTourcms";
import { useDebounce } from "@/utils/hooks/useDebounce";
import {
  CloseIcon,
  SearchIcon,
  SpinnerIcon,
} from "@/components/assets/Icon/shared";
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

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "default", label: "Relevance" },
  { value: "price_asc", label: "Price: low → high" },
  { value: "price_desc", label: "Price: high → low" },
  { value: "rating_desc", label: "Top rated" },
];

export default function TourcmsListing() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput.trim(), 400);
  const [sort, setSort] = useState<Sort>("default");
  const [bandIdx, setBandIdx] = useState(0);

  // Reset to page 1 whenever the active query changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isFetching, isError, refetch } = useTourcmsProducts({
    q: debouncedSearch || undefined,
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
      sorted.sort(
        (a, b) => (a.fromPrice ?? Infinity) - (b.fromPrice ?? Infinity)
      );
    } else if (sort === "price_desc") {
      sorted.sort((a, b) => (b.fromPrice ?? -1) - (a.fromPrice ?? -1));
    } else if (sort === "rating_desc") {
      sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    }
    return sorted;
  }, [data, sort, bandIdx]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 0;
  const hasFilters =
    debouncedSearch !== "" || bandIdx !== 0 || sort !== "default";
  const upstreamEmpty = !isLoading && !isError && (data?.total ?? 0) === 0;

  const clearAll = () => {
    setSearchInput("");
    setBandIdx(0);
    setSort("default");
    setPage(1);
  };

  return (
    <section className="py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          TourCMS Tours
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Curated tours sourced via the TourCMS partner network.
        </p>
      </header>

      <div className="space-y-4 mb-6">
        <SearchField
          value={searchInput}
          onChange={setSearchInput}
          loading={isFetching && !isLoading}
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <PriceBandChips selected={bandIdx} onSelect={setBandIdx} />
          <div className="sm:ml-auto flex items-center gap-3">
            <SortSelect value={sort} onChange={setSort} />
            {data && (
              <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">
                {items.length} of {data.total}
              </span>
            )}
          </div>
        </div>

        {hasFilters && (
          <ActiveFilters
            search={debouncedSearch}
            band={bandIdx > 0 ? PRICE_BANDS[bandIdx].label : null}
            sort={
              sort !== "default"
                ? SORT_OPTIONS.find((s) => s.value === sort)?.label ?? null
                : null
            }
            onClearSearch={() => setSearchInput("")}
            onClearBand={() => setBandIdx(0)}
            onClearSort={() => setSort("default")}
            onClearAll={clearAll}
          />
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
              onClick={() => refetch()}
              className="px-5 py-2 bg-[#0071CE] text-white rounded-lg font-bold hover:bg-[#005ba6]"
            >
              Try again
            </button>
          }
        />
      ) : items.length === 0 ? (
        <TourcmsEmptyState
          variant={upstreamEmpty && !hasFilters ? "no-data" : "no-results"}
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={clearAll}
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

      {totalPages > 1 && items.length > 0 && (
        <div className="mt-8">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            isLoading={isFetching}
          />
        </div>
      )}
    </section>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function SearchField({
  value,
  onChange,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <SearchIcon className="w-5 h-5" />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tours by name, location or activity…"
        autoComplete="off"
        className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#02ACBE] focus:ring-2 focus:ring-[#02ACBE]/20 transition"
      />
      {loading ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#02ACBE]">
          <SpinnerIcon className="w-4 h-4 animate-spin" />
        </span>
      ) : value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );
}

function PriceBandChips({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-thin">
      {PRICE_BANDS.map((b, i) => {
        const active = i === selected;
        return (
          <button
            key={b.label}
            type="button"
            onClick={() => onSelect(i)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition ${
              active
                ? "bg-[#0071CE] text-white border-[#0071CE] shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800"
            }`}
          >
            {b.label}
          </button>
        );
      })}
    </div>
  );
}

function SortSelect({
  value,
  onChange,
}: {
  value: Sort;
  onChange: (v: Sort) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Sort)}
        className="appearance-none pl-3 pr-9 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#02ACBE] focus:ring-2 focus:ring-[#02ACBE]/20 transition cursor-pointer"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            Sort: {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 12 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1l5 5 5-5" />
        </svg>
      </span>
    </div>
  );
}

function ActiveFilters({
  search,
  band,
  sort,
  onClearSearch,
  onClearBand,
  onClearSort,
  onClearAll,
}: {
  search: string;
  band: string | null;
  sort: string | null;
  onClearSearch: () => void;
  onClearBand: () => void;
  onClearSort: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-gray-500 font-semibold">Active:</span>
      {search && (
        <Chip label={`"${search}"`} onRemove={onClearSearch} />
      )}
      {band && <Chip label={band} onRemove={onClearBand} />}
      {sort && <Chip label={sort} onRemove={onClearSort} />}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 text-[#0071CE] font-semibold hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 bg-[#02ACBE]/10 text-[#0271a8] rounded-full font-semibold">
      {label}
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-[#02ACBE]/20"
      >
        <CloseIcon className="w-3 h-3" />
      </button>
    </span>
  );
}
