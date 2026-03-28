"use client"

import { useState, useMemo, useEffect, memo } from "react"
import DotsIcon from "../../assets/Icon/DotsIcon"
import { assignCategoryIcons } from "../../assets/Icon/categories"
import OptimizedImage from "@/components/common/OptimizedImage"
import Link from "next/link"
import { useViatorProducts, getViatorImageUrl } from "@/utils/hooks/useViator"
import { useDBDestinations } from "@/utils/hooks/useDestinations"
import type { Category } from "@/types/tourism"
import Pagination from "@/components/ui/Pagination"

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

  // ── Pagination ──────────────────────────────────────────────────────
  const [viatorPage, setViatorPage] = useState(1)
  const ITEMS_PER_PAGE = 6

  const { data: viatorData, isLoading: isViatorLoading } = useViatorProducts(
    isViator ? activeCategory?.tagIds ?? null : null,
    "IDR",
    viatorPage,
    ITEMS_PER_PAGE
  )
  const { data: dbDestinations, isLoading: isDBLoading } = useDBDestinations(
    !isViator ? activeCategory?.id ?? null : null
  )

  const isLoading = isViator ? isViatorLoading : isDBLoading

  // Keep last known totalPages during loading so pagination doesn't vanish
  const rawTotalPages = Math.ceil((viatorData?.totalCount ?? 0) / ITEMS_PER_PAGE)
  const [viatorTotalPages, setViatorTotalPages] = useState(0)
  useEffect(() => {
    if (rawTotalPages > 0) setViatorTotalPages(rawTotalPages)
  }, [rawTotalPages])

  const destinations = useMemo(() => {
    if (isViator) {
      if (!viatorData?.products) return []
      return viatorData.products.map((product) => ({
        id: product.productCode,
        title: product.title,
        slug: product.productCode,
        imageUrl: getViatorImageUrl(product.images, 720),
        href: `/viator/${product.productCode}`,
      }))
    }
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
  }, [isViator, viatorData, dbDestinations])

  const displayedDestinations = useMemo(
    () => (!isViator && !showAll ? destinations.slice(0, 6) : destinations),
    [isViator, showAll, destinations]
  )

  const dbHasMore = !isViator && destinations.length > 6

  const handleTabClick = (id: string | number) => {
    setActiveId(id)
    setShowAll(false)
    setViatorPage(1)
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

        <div>
          {/* Grid — skeleton or real content, same height */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ minHeight: `${Math.ceil(ITEMS_PER_PAGE / 3) * 236}px` }}>
            {isLoading ? (
              Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <div key={i} className="relative w-full h-[220px] rounded-md overflow-hidden bg-gray-200 animate-pulse" />
              ))
            ) : displayedDestinations.length > 0 ? (
              displayedDestinations.map((item) => (
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
              ))
            ) : (
              <div className="col-span-full w-full h-[220px] rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50/50">
                <p className="text-gray-500 font-medium text-center px-4">
                  No destinations available for &quot;<span className="font-bold text-gray-700">{activeCategory?.name}</span>&quot; at the moment.
                </p>
              </div>
            )}
          </div>

          {/* Pagination — always visible, never disappears during loading */}
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
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors shadow-md"
              >
                {showAll ? "Show Less" : "Show More"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
