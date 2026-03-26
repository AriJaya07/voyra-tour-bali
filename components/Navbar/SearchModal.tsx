"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import OptimizedImage from "@/components/common/OptimizedImage"
import { useSearchDestinations } from "@/utils/hooks/useSearchDestinations"
import { useViatorSearch, getViatorImageUrl } from "@/utils/hooks/useViator"
import { formatPrice } from "@/utils/formatPrice"
import CloseIcon from "../assets/dashboard/CloseIcon"
import SearchIcon from "../assets/Icon/SearchIcon"

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
  const { data: viatorResults = [], isLoading: isViatorLoading } = useViatorSearch(debouncedQuery)

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
      currency: "IDR"
    }))

    const viatorFiltered = debouncedQuery.trim()
      ? viatorResults.filter((v) =>
          v.title?.toLowerCase().includes(debouncedQuery.toLowerCase())
        )
      : viatorResults.slice(0, 10)

    const viatorMapped = viatorFiltered.map((v) => ({
      id: `viator-${v.productCode}`,
      title: v.title,
      href: `/viator/${v.productCode}`,
      imageUrl: getViatorImageUrl(v.images, 200),
      categoryName: "Tour / Activity",
      price: v.pricing?.summary?.fromPrice ?? null,
      currency: v.pricing?.currency ?? "USD"
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

  if (!isOpen) return null

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Centered Modal Wrapper */}
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4">
        <div
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "min(85vh, 600px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <SearchIcon />

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search destinations, tour packages..."
              className="flex-1 text-base text-gray-900 placeholder-gray-400 bg-transparent outline-none"
            />

            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-gray-400 hover:text-gray-700 transition cursor-pointer"
                aria-label="Clear"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <button
              onClick={onClose}
              className="ml-2 px-2.5 py-1 text-xs font-bold text-gray-500 transition cursor-pointer hidden sm:inline-flex items-center"
            >
              <CloseIcon />
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
                    ? `${results.length} results for "${debouncedQuery}"`
                    : `All Destinations (${results.length})`}
                </p>
                <div className="flex flex-col gap-1">
                  {results.map((item) => {
                    const img = item.imageUrl
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        onClick={onClose}
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
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-5xl mb-4">🔍</span>
                <p className="text-gray-700 font-semibold">No results found</p>
                <p className="text-gray-400 text-sm mt-1">
                  Try other keywords like &quot;Ubud&quot; or &quot;Nusa Penida&quot;
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
