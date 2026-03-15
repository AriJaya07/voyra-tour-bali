"use client"

import { useState, useMemo, memo, useEffect } from "react"
import { Category } from "@prisma/client"
import Image from "next/image"
import { useViatorProducts, ViatorProduct } from "@/utils/hooks/useViator"

interface TrendingActivityProps {
  categories: Category[];
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

const TabButton = memo(function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        md:h-[48px] h-[40px]
        px-6
        rounded-full
        text-sm md:text-base
        font-semibold
        transition-all duration-200
        cursor-pointer
        whitespace-nowrap
        ${
          isActive
            ? "bg-blue-50 text-blue-600 shadow-md"
            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900"
        }
      `}
    >
      {label}
    </button>
  )
})

export default function TrendingActivity({ categories }: TrendingActivityProps) {
  const defaultTab = categories[0]?.name ?? "Liburan"
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [showAll, setShowAll] = useState(false)

  // Use unshuffled categories for SSR, then shuffle on client to avoid hydration mismatch
  const [randomCategories, setRandomCategories] = useState<Category[]>(() =>
    categories.slice(0, 6)
  )

  useEffect(() => {
    const shuffled = shuffle(categories).slice(0, 6)
    setRandomCategories(shuffled)
    setActiveTab(shuffled[0]?.name ?? defaultTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeCategoryId = useMemo(() => {
    const cat = categories.find(c => c.name === activeTab)
    return cat?.id ?? null
  }, [categories, activeTab])

  const { data: rawProducts, isLoading, isError } = useViatorProducts(activeCategoryId)

  // Shuffle products once when data arrives (stable per tab)
  const [shuffledProducts, setShuffledProducts] = useState<ViatorProduct[]>([])
  useEffect(() => {
    if (rawProducts) {
      setShuffledProducts(shuffle(rawProducts))
      setShowAll(false)
    }
  }, [rawProducts])

  const displayedProducts = useMemo(
    () => (showAll ? shuffledProducts : shuffledProducts.slice(0, 5)),
    [showAll, shuffledProducts]
  )
  const hasMore = shuffledProducts.length > 5

  return (
    <section id="paket" className="pt-20 px-4 mb-20">
      <h2 className="text-2xl sm:text-3xl font-bold text-black text-center sm:text-left">
        Trending Activity
      </h2>

      {/* Tabs */}
      <div className="flex w-full gap-2 py-5 overflow-x-auto scrollbar-hide">
        {randomCategories.map((tab) => (
          <TabButton
            key={tab.id}
            label={tab.name}
            isActive={activeTab === tab.name}
            onClick={() => setActiveTab(tab.name)}
          />
        ))}
      </div>

      {/* Products */}
      <div className="min-h-[220px]">
        {isLoading ? (
          <div className="w-full h-[220px] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50/50">
            <p className="text-gray-500 font-medium animate-pulse text-center px-4">
              Loading latest activities for &quot;<span className="font-bold text-gray-700">{activeTab}</span>&quot;...
            </p>
          </div>
        ) : isError ? (
          <div className="w-full h-[220px] rounded-lg border-2 border-dashed border-red-200 flex items-center justify-center bg-red-50/50">
            <p className="text-red-500 font-medium text-center px-4">
              Failed to load activities. Please try again later.
            </p>
          </div>
        ) : displayedProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {displayedProducts.map((prod) => {
                const mainImage = prod.images?.[0]?.variants?.[0]?.url || "/images/activity/melasti.png"
                return (
                  <a href={`/detail/${prod.productCode}`} target="_self" key={prod.productCode}>
                    <div className="relative w-full h-[220px] rounded-lg overflow-hidden">
                      <Image
                        src={mainImage}
                        alt={prod.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        className="object-cover transition-transform transform hover:scale-105"
                        title={prod.title}
                      />
                    </div>
                  </a>
                )
              })}
            </div>

            {hasMore && (
              <div className="pt-8 pb-4 flex justify-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="px-8 py-2.5 bg-white border-2 border-blue-500 text-blue-500 font-bold rounded-full hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                >
                  {showAll ? "Show Less" : "See All Activity"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-[220px] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50/50">
            <p className="text-gray-500 font-medium text-center px-4">
              No trending activities available for &quot;<span className="font-bold text-gray-700">{activeTab}</span>&quot; at the moment.
            </p>
          </div>
        )}
      </div>

      {/* Banner */}
      <div className="flex justify-center mt-12">
        <Image
          src="/images/iklan/tolak-angin.png"
          alt="Advertisement"
          width={700}
          height={200}
          className="w-full max-w-[700px]"
        />
      </div>
    </section>
  )
}
