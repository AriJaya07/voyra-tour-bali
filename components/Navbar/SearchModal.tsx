"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Image from "next/image"
import { useSearchDestinations } from "@/utils/hooks/useSearchDestinations"
import { formatPrice } from "@/utils/formatPrice"

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
  const { data: allResults = [], isLoading } = useSearchDestinations(isOpen)

  // Client-side filtering on debounced query
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return allResults
    const q = debouncedQuery.toLowerCase()
    return allResults.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.category?.name?.toLowerCase().includes(q)
    )
  }, [debouncedQuery, allResults])

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

  const mainImage = (item: typeof allResults[number]) =>
    item.images.find((i) => i.isMain)?.url || item.images[0]?.url || null

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
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>

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
              className="ml-2 px-2.5 py-1 text-xs font-bold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition cursor-pointer hidden sm:inline-flex items-center"
            >
              ESC
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
                    const img = mainImage(item)
                    return (
                      <a
                        key={item.id}
                        href={`/detail/${item.slug || item.id}`}
                        onClick={onClose}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition group cursor-pointer"
                      >
                        {/* Thumbnail */}
                        {img ? (
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
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
                            {item.category && (
                              <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                                {item.category.name}
                              </span>
                            )}
                            {item.price != null && (
                              <span className="text-xs text-gray-500">
                                {formatPrice(Number(item.price))}
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

          {/* Footer hint */}
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-4">
            <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">↑↓</kbd> navigate</span>
            <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">↵</kbd> select</span>
            <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">ESC</kbd> close</span>
          </div>
        </div>
      </div>
    </>
  )
}
