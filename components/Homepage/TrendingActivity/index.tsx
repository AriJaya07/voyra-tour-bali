"use client"

import { useState, useMemo, useEffect } from "react"
import { useCurrency } from "@/utils/hooks/useCurrency"
import { useViatorProducts } from "@/utils/hooks/useViator"
import { useDBDestinations } from "@/utils/hooks/useDestinations"
import type { Category, UnifiedActivity } from "@/types/tourism"
import { trackCategoryClick } from "@/utils/analytics"
import Pagination from "@/components/ui/Pagination"
import { SkeletonTranding } from "./SkeletonTranding"
import { TabButton } from "./TabButton"
import { ActivityCard } from "./ActivityCard"
import { mapDBToActivity, mapViatorToActivity } from "./activityMappers"

interface TrendingActivityProps {
  categories: Category[]
}

/** Fisher-Yates shuffle */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ── Main Component ──────────────────────────────────────────────────────

export default function TrendingActivity({ categories }: TrendingActivityProps) {
  const initial = categories.slice(0, 5)
  const [displayCategories, setDisplayCategories] = useState(initial)

  // Shuffle on client only to avoid hydration mismatch
  useEffect(() => {
    const shuffled = shuffle(categories).slice(0, 5)
    setDisplayCategories(shuffled)
    if (shuffled[0]) setActiveId(shuffled[0].id)
  }, [categories])

  // Track active tab by ID (not name) to prevent cross-source collisions
  const [activeId, setActiveId] = useState<string | number>(initial[0]?.id ?? "")
  const [showAll, setShowAll] = useState(false)

  const { currency } = useCurrency()

  // Find active category by unique ID — safe even if two sources share a name
  const activeCategory = displayCategories.find((c) => c.id === activeId) ?? displayCategories[0]
  const isViator = activeCategory?.source === "viator"

  // ── Pagination ──────────────────────────────────────────────────────
  const [viatorPage, setViatorPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  const { data: viatorData, isLoading: isViatorLoading, isError } = useViatorProducts(
    isViator ? activeCategory?.tagIds ?? null : null,
    currency,
    viatorPage,
    ITEMS_PER_PAGE
  )
  const { data: dbDestinations, isLoading: isDBLoading } = useDBDestinations(
    !isViator ? activeCategory?.id ?? null : null
  )

  const isLoading = isViator ? isViatorLoading : isDBLoading

  const rawTotalPages = Math.ceil((viatorData?.totalCount ?? 0) / ITEMS_PER_PAGE)
  const [viatorTotalPages, setViatorTotalPages] = useState(0)
  useEffect(() => {
    if (rawTotalPages > 0) setViatorTotalPages(rawTotalPages)
  }, [rawTotalPages])

  const activities: UnifiedActivity[] = useMemo(() => {
    if (isViator) {
      if (!viatorData?.products) return []
      return viatorData.products.map(mapViatorToActivity)
    }
    if (!dbDestinations) return []
    return dbDestinations.map(mapDBToActivity)
  }, [isViator, viatorData, dbDestinations])

  const displayedActivities = useMemo(
    () => (!isViator && !showAll ? activities.slice(0, 5) : activities),
    [isViator, showAll, activities]
  )

  const dbHasMore = !isViator && activities.length > 5

  return (
    <section id="paket" className="py-10">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl sm:text-3xl font-bold text-black">
          Trending Activity
        </h2>
        <span className="text-xs text-gray-400 font-medium">
          Bali Tours & Activities
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-2">
        Discover the best tours & activities in Bali
      </p>

      {isError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 mb-3 text-xs text-yellow-700">
          Viator data unavailable — please try again later
        </div>
      )}

      {/* Tabs */}
      <div className="flex w-full gap-2 py-5 overflow-x-auto scrollbar-hide">
        {displayCategories.map((tab) => (
          <TabButton
            key={tab.id}
            label={tab.name}
            // icon={iconMap.get(tab.slug) ?? DotsIcon}
            isActive={activeId === tab.id}
            onClick={() => { setActiveId(tab.id); setViatorPage(1); setShowAll(false); trackCategoryClick(tab.name) }}
          />
        ))}
      </div>

      {/* Activities */}
      <div>
        {/* Grid — skeleton matches real card height */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 min-h-[900px] sm:min-h-[600px] md:min-h-[600px] lg:min-h-[300px]">
          {isLoading ? (
            Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <SkeletonTranding key={i} />
            ))
          ) : displayedActivities.length > 0 ? (
            displayedActivities.map((item) => (
              <ActivityCard key={item.id} item={item} currency={currency} />
            ))
          ) : (
            <div className="col-span-full w-full h-[220px] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50/50">
              <p className="text-gray-500 font-medium text-center px-4">
                No activities available for &quot;<span className="font-bold text-gray-700">{activeCategory?.name}</span>&quot; at the moment.
              </p>
            </div>
          )}
        </div>

        {/* Pagination — always visible */}
        {isViator && viatorTotalPages > 1 && (
          <Pagination
            currentPage={viatorPage}
            totalPages={viatorTotalPages}
            onPageChange={setViatorPage}
            isLoading={isViatorLoading}
          />
        )}

        {dbHasMore && (
          <div className="flex justify-center pt-6">
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-8 py-2.5 bg-white border-2 border-blue-500 text-blue-500 font-bold rounded-full hover:bg-blue-500 hover:text-white transition-all shadow-md cursor-pointer"
            >
              {showAll ? "Show Less" : "See All Activity"}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
