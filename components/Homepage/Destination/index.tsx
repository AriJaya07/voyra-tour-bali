"use client"

import { useState, useMemo, useEffect, memo } from "react"
import DotsIcon from "../../assets/Icon/DotsIcon"
import { assignCategoryIcons } from "../../assets/Icon/categories"
import OptimizedImage from "@/components/common/OptimizedImage"
import Link from "next/link"
import { useViatorProducts, getViatorImageUrl } from "@/utils/hooks/useViator"
import { useDBDestinations } from "@/utils/hooks/useDestinations"
import type { Category } from "@/types/tourism"

interface DestinationProps {
  categories: Category[]
}

/** Fisher-Yates shuffle */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ── Category Card ───────────────────────────────────────────────────────
const CategoryCard = memo(function CategoryCard({
  label,
  icon: IconComponent,
  isActive,
  onClick,
}: {
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { isActive?: boolean }>
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-2
        min-w-[80px] w-[80px] sm:w-auto
        h-[80px] sm:h-[88px]
        px-2 py-3
        rounded-xl
        border
        transition-all duration-200
        cursor-pointer
        shrink-0
        ${
          isActive
            ? "bg-blue-50 border-blue-300 text-blue-600 shadow-sm"
            : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
        }
      `}
    >
      <IconComponent
        className="w-5 h-5 sm:w-6 sm:h-6 shrink-0"
        isActive={isActive}
      />
      <span className="text-[11px] sm:text-xs font-semibold leading-tight text-center line-clamp-2 w-full px-0.5">
        {label}
      </span>
    </button>
  )
})

// ── Main Component ──────────────────────────────────────────────────────
export default function Destination({ categories }: DestinationProps) {
  // Assign unique icons to all categories once
  const iconMap = useMemo(
    () => assignCategoryIcons(categories.map((c) => c.slug)),
    [categories]
  )

  // Track active tab by ID (not name) to prevent cross-source collisions
  const defaultId = categories[0]?.id ?? ""
  const [activeId, setActiveId] = useState<string | number>(defaultId)
  const [showAll, setShowAll] = useState(false)

  // Find active category by unique ID — safe even if two sources share a name
  const activeCategory = categories.find((c) => c.id === activeId) ?? categories[0]
  const isViator = activeCategory?.source === "viator"

  // ── Pagination state ────────────────────────────────────────────────
  const [viatorPage, setViatorPage] = useState(1)
  const ITEMS_PER_PAGE = 6

  type DestItem = { id: string; title: string; slug: string; imageUrl: string; href: string }
  const [accumulatedViator, setAccumulatedViator] = useState<DestItem[]>([])

  // Fetch from the correct source based on category
  const { data: viatorData, isLoading: isViatorLoading } = useViatorProducts(
    isViator ? activeCategory?.tagIds ?? null : null,
    "IDR",
    viatorPage,
    ITEMS_PER_PAGE
  )
  const { data: dbDestinations, isLoading: isDBLoading } = useDBDestinations(
    !isViator ? activeCategory?.id ?? null : null
  )

  // Initial load = page 1 loading with no accumulated data
  // Load more = page > 1 loading (keep existing items visible)
  const isInitialLoading = isViator ? (isViatorLoading && viatorPage === 1) : isDBLoading
  const isLoadingMore = isViator && isViatorLoading && viatorPage > 1
  const isLoading = isInitialLoading

  // Accumulate Viator products across pages
  useEffect(() => {
    if (!isViator || !viatorData?.products) return
    const newItems = viatorData.products.map((product) => ({
      id: product.productCode,
      title: product.title,
      slug: product.productCode,
      imageUrl: getViatorImageUrl(product.images, 720),
      href: `/viator/${product.productCode}`,
    }))
    if (viatorPage === 1) {
      setAccumulatedViator(newItems)
    } else {
      setAccumulatedViator((prev) => {
        const existingIds = new Set(prev.map((d) => d.id))
        const unique = newItems.filter((d) => !existingIds.has(d.id))
        return [...prev, ...unique]
      })
    }
  }, [viatorData, viatorPage, isViator])

  // Map data to a unified shape for the grid
  const destinations = useMemo(() => {
    if (isViator) return accumulatedViator
    // DB source
    if (!dbDestinations) return []
    return dbDestinations.map((dest) => {
      const mainImage = dest.images?.find((img) => img.isMain)?.url
        || dest.images?.[0]?.url
        || "/images/destinations/gwk.png"
      return {
        id: String(dest.id),
        title: dest.title,
        slug: dest.slug || String(dest.id),
        imageUrl: mainImage,
        href: `/detail/${dest.slug || dest.id}`,
      }
    })
  }, [isViator, accumulatedViator, dbDestinations])

  // Shuffle only on first load (page 1), not on Load More
  const [visibleDestinations, setVisibleDestinations] = useState(destinations)

  useEffect(() => {
    if (viatorPage === 1) {
      setVisibleDestinations(shuffleArray(destinations))
    } else {
      setVisibleDestinations(destinations)
    }
  }, [destinations, viatorPage])

  // Viator: show all accumulated (pagination controls the count)
  // DB: client-side show/hide toggle
  const displayedDestinations = useMemo(() => {
    if (isViator) return visibleDestinations
    return showAll ? visibleDestinations : visibleDestinations.slice(0, 6)
  }, [isViator, showAll, visibleDestinations])

  const hasMore = isViator
    ? (viatorData?.hasMore ?? false)
    : visibleDestinations.length > 6

  const handleTabClick = (id: string | number) => {
    setActiveId(id)
    setShowAll(false)
    setViatorPage(1)
    setAccumulatedViator([])
  }

  return (
    <section id="destinasi" className="pt-10 md:pt-[72px]">
      {/* Category cards — horizontal scroll on mobile, grid on larger screens */}
      <div className="
        flex gap-2 pb-5 overflow-x-auto scrollbar-hide
      ">
        {categories.map((item) => (
          <CategoryCard
            key={item.id}
            label={item.name}
            icon={iconMap.get(item.slug) ?? DotsIcon}
            isActive={activeId === item.id}
            onClick={() => handleTabClick(item.id)}
          />
        ))}
      </div>

      <hr className="border-[#C0C0C0]" />

      {/* Content */}
      <div className="pt-5">

        <div className="min-h-[220px]">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <div key={i} className="relative w-full h-[220px] rounded-md overflow-hidden bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : displayedDestinations.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedDestinations.map((item) => (
                  <Link href={item.href} key={item.id}>
                    <div className="relative w-full h-[220px] rounded-md overflow-hidden">
                      <OptimizedImage
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform transform hover:scale-105"
                      />
                    </div>
                  </Link>
                ))}

                {/* Skeleton placeholders while loading next page */}
                {isLoadingMore && Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="relative w-full h-[220px] rounded-md overflow-hidden bg-gray-200 animate-pulse" />
                ))}
              </div>

              {(hasMore || isLoadingMore) && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={() => {
                      if (isViator) {
                        setViatorPage((p) => p + 1)
                      } else {
                        setShowAll(!showAll)
                      }
                    }}
                    disabled={isLoadingMore}
                    className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoadingMore ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading...
                      </>
                    ) : isViator ? "Load More" : showAll ? "Show Less" : "Show More"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-[220px] rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50/50">
              <p className="text-gray-500 font-medium text-center px-4">
                No destinations available for &quot;<span className="font-bold text-gray-700">{activeCategory?.name}</span>&quot; at the moment.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
