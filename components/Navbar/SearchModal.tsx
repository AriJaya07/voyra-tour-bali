"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import OptimizedImage from "@/components/common/OptimizedImage"
import { useSearchDestinations } from "@/utils/hooks/useSearchDestinations"
import { useViatorSearch, getViatorImageUrl } from "@/utils/hooks/useViator"
import { buildViatorProductUrl, VIATOR_PARTNER_ID } from "@/lib/config/viator"
import { formatPrice } from "@/utils/formatPrice"
import { CloseIcon, SearchIcon, ChevronRightIcon } from "@/components/assets/Icon/shared"

// ── Types ──────────────────────────────────────────────────────────
interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

// ── Debounce hook ──────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ── Component ──────────────────────────────────────────────────────
export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 400)
  const inputRef = useRef<HTMLInputElement>(null)

  // React Query - fetch all destinations when modal opens
  const { data: allResults = [], isLoading: isDbLoading } = useSearchDestinations(isOpen)

  // React Query - fetch viator products
  const { data: viatorData, isLoading: isViatorLoading } = useViatorSearch(debouncedQuery)
  const viatorResults = viatorData?.products ?? []
  const viatorTotal = viatorData?.totalCount ?? 0
  const viatorHasMore = viatorData?.hasMore ?? false

  const viatorAllUrl = useMemo(() => {
    const q = debouncedQuery.trim()
    if (!q) return null
    const u = new URL("https://www.viator.com/searchResults/all")
    u.searchParams.set("text", q)
    u.searchParams.set("pid", VIATOR_PARTNER_ID)
    u.searchParams.set("medium", "link.partner")
    return u.toString()
  }, [debouncedQuery])

  const isLoading = isDbLoading || isViatorLoading

  // Client-side filtering on debounced query & map generic structure
  const results = useMemo(() => {
    let dbFiltered = allResults
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase()
      dbFiltered = allResults.filter(
        (d) =>
          d.title?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.category?.name?.toLowerCase().includes(q)
      )
    }

    const dbMapped = dbFiltered.map((d) => ({
      id: `db-${d.id}`,
      title: d.title,
      href: `/detail/${d.slug || d.id}`,
      imageUrl: d.images?.find((i) => i.isMain)?.url || d.images?.[0]?.url || null,
      categoryName: d.category?.name || "Destination",
      price: d.price,
      currency: "IDR",
      external: false,
    }))

    // Trust server-side ranking (Viator /search/freetext). Don't drop hits whose
    // titles don't literally contain the query — Viator matches on description,
    // attractions, tags, and category too.
    const viatorFiltered = debouncedQuery.trim()
      ? viatorResults
      : viatorResults.slice(0, 10)

    const viatorMapped = viatorFiltered.map((v) => ({
      id: `viator-${v.productCode}`,
      title: v.title,
      href: buildViatorProductUrl(v.productCode, v.title),
      imageUrl: getViatorImageUrl(v.images, 200),
      categoryName: "Tour / Activity",
      price: v.pricing?.summary?.fromPrice ?? null,
      currency: v.pricing?.currency ?? "USD",
      external: true,
    }))

    return [...dbMapped, ...viatorMapped]
  }, [debouncedQuery, allResults, viatorResults])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery("")
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Centered Modal Wrapper */}
      <div
        className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 pt-6 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <div
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "min(85dvh, 600px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
            <SearchIcon />

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search destinations, tour packages..."
              className="flex-1 min-w-0 text-base text-gray-900 placeholder-gray-400 bg-transparent outline-none"
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-700 rounded-full transition cursor-pointer"
                aria-label="Clear search"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 inline-flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 ml-1 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
              aria-label="Close search"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Results area */}
          <div className="overflow-y-auto flex-1 px-3 py-3">
            {isLoading ? (
              <div className="flex flex-col gap-3 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 items-center p-3 rounded-xl animate-pulse">
                    <div className="w-14 h-14 rounded-lg bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length > 0 ? (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-1 mb-1">
                  {debouncedQuery
                    ? `${results.length} results for "${debouncedQuery}"${viatorTotal > viatorResults.length ? ` · ${viatorTotal} tours on Viator` : ""}`
                    : `All Destinations`}
                </p>
                <div className="flex flex-col gap-1">
                  {results.map((item) => {
                    const img = item.imageUrl
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        onClick={onClose}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer sponsored" : undefined}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition group cursor-pointer"
                      >
                        {/* Thumbnail */}
                        {img ? (
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                            <OptimizedImage
                              src={img}
                              alt={item.title}
                              fill
                              sizes="56px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center flex-shrink-0 text-2xl">
                            🏝
                          </div>
                        )}

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.categoryName && (
                              <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                                {item.categoryName}
                              </span>
                            )}
                            {item.price != null && (
                              <span className="text-xs text-gray-500">
                                {formatPrice(Number(item.price), item.currency as "IDR" | "USD")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition" />
                      </a>
                    )
                  })}
                </div>

                {viatorAllUrl && viatorHasMore && (
                  <a
                    href={viatorAllUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    onClick={onClose}
                    className="mt-3 mx-2 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-blue-100 bg-blue-50/60 hover:bg-blue-50 text-blue-700 text-xs font-semibold transition"
                  >
                    <span>View all {viatorTotal} tours for &quot;{debouncedQuery}&quot; on Viator</span>
                    <ChevronRightIcon className="w-4 h-4 shrink-0" />
                  </a>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <span className="text-5xl mb-4">🔍</span>
                <p className="text-gray-700 font-semibold">No results found</p>
                <p className="text-gray-400 text-sm mt-1">
                  Try a region or activity:
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                  {["Ubud", "Canggu", "Seminyak", "Nusa Penida", "Snorkel", "Waterfall"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setQuery(s)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {viatorAllUrl && (
                  <a
                    href={viatorAllUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    onClick={onClose}
                    className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                  >
                    Search &quot;{debouncedQuery}&quot; on Viator
                    <ChevronRightIcon className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
