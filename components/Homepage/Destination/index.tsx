"use client"

import { useState, useMemo, useEffect, memo } from "react"
import DotsIcon from "../../assets/Icon/DotsIcon"
import { CATEGORY_ICON_MAP } from "../../assets/Icon/categories"
import Image from "next/image"
import { useViatorProducts } from "@/utils/hooks/useViator"
import { getViatorImageUrl } from "@/utils/hooks/useViator"
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
  slug,
  isActive,
  onClick,
}: {
  label: string
  slug: string
  isActive: boolean
  onClick: () => void
}) {
  const IconComponent = CATEGORY_ICON_MAP[slug] ?? DotsIcon

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
  const defaultCategory = categories[0]?.name ?? "Tours"
  const [activeTab, setActiveTab] = useState(defaultCategory)
  const [showAll, setShowAll] = useState(false)

  // Fetch Viator products for the active category
  const { data: viatorProducts, isLoading } = useViatorProducts(activeTab, "IDR")

  // Map Viator products to destination-like items for the grid
  const destinations = useMemo(() => {
    if (!viatorProducts) return []
    return viatorProducts.map((product) => ({
      id: product.productCode,
      title: product.title,
      slug: product.productCode,
      imageUrl: getViatorImageUrl(product.images, 720),
    }))
  }, [viatorProducts])

  // Shuffle on client to avoid hydration mismatch
  const [visibleDestinations, setVisibleDestinations] = useState(destinations)

  useEffect(() => {
    setVisibleDestinations(shuffleArray(destinations))
  }, [destinations])

  const displayedDestinations = useMemo(
    () => (showAll ? visibleDestinations : visibleDestinations.slice(0, 6)),
    [showAll, visibleDestinations]
  )
  const hasMore = visibleDestinations.length > 6

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
    setShowAll(false)
  }

  return (
    <section id="destinasi" className="pt-10 md:pt-[72px] px-4 md:px-0">
      {/* Category cards — horizontal scroll on mobile, grid on larger screens */}
      <div className="
        flex gap-2 pb-5 overflow-x-auto scrollbar-hide
      ">
        {categories.map((item) => (
          <CategoryCard
            key={item.id}
            label={item.name}
            slug={item.slug}
            isActive={activeTab === item.name}
            onClick={() => handleTabClick(item.name)}
          />
        ))}
      </div>

      <hr className="border-[#C0C0C0]" />

      {/* Content */}
      <div className="pt-5">
        <h1 className="pb-3 text-2xl sm:text-3xl font-bold text-[#434343]">
          {activeTab}
        </h1>

        <div className="min-h-[220px]">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="relative w-full h-[220px] rounded-md overflow-hidden bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : displayedDestinations.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedDestinations.map((item) => (
                  <a href={`/viator/${item.slug}`} key={item.id} target="_self">
                    <div className="relative w-full h-[220px] rounded-md overflow-hidden">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform transform hover:scale-105"
                      />
                    </div>
                  </a>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors shadow-md"
                  >
                    {showAll ? "Show Less" : "Show More"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-[220px] rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50/50">
              <p className="text-gray-500 font-medium text-center px-4">
                No destinations available for &quot;<span className="font-bold text-gray-700">{activeTab}</span>&quot; at the moment.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
