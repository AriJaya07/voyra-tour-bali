"use client"

import { useState, useMemo, memo, useEffect } from "react"
import { Category } from "@prisma/client"
import Image from "next/image"
import Link from "next/link"
import { useViatorProducts, ViatorProduct, getViatorImageUrl, formatDuration } from "@/utils/hooks/useViator"
import { useCurrency } from "@/utils/hooks/useCurrency"
import { formatPrice, CurrencyCode } from "@/utils/formatPrice"

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

/** Format price based on the currency returned by Viator */
function displayPrice(price: number, apiCurrency: string, displayCurrency: CurrencyCode): string {
  // If the API already returns in the display currency, just format
  if (apiCurrency === displayCurrency) {
    return formatPrice(price, displayCurrency)
  }
  // Otherwise the API returned in the requested currency, format as-is
  return formatPrice(price, displayCurrency)
}

function ProductCard({ product, currency }: { product: ViatorProduct; currency: CurrencyCode }) {
  const imageUrl = getViatorImageUrl(product.images, 480)
  const duration = formatDuration(product.duration)
  const rating = product.reviews?.combinedAverageRating
  const reviewCount = product.reviews?.totalReviews || 0
  const price = product.pricing?.summary?.fromPrice || 0
  const apiCurrency = product.pricing?.currency || "USD"
  const hasFreeCancellation = product.flags?.includes("FREE_CANCELLATION")

  return (
    <Link href={`/viator/${product.productCode}?price=${price}&cur=${apiCurrency}`} className="group block">
      <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
        {/* Image */}
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {hasFreeCancellation && (
            <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Free Cancellation
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col flex-1">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1.5 group-hover:text-blue-600 transition-colors">
            {product.title}
          </h3>

          {/* Rating & Duration */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            {rating && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
                <span className="font-semibold text-gray-700">{rating.toFixed(1)}</span>
                <span>({reviewCount.toLocaleString()})</span>
              </span>
            )}
            {duration && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {duration}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="mt-auto">
            <p className="text-xs text-gray-400">From</p>
            <p className="text-base font-black text-gray-900">
              {displayPrice(price, apiCurrency, currency)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}

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

  const { currency } = useCurrency()
  const { data: rawProducts, isLoading, isError } = useViatorProducts(activeTab, currency)

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
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl sm:text-3xl font-bold text-black">
          Trending Activity
        </h2>
        <span className="text-xs text-gray-400 font-medium">
          Powered by Viator
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-2">
        Discover the best tours & activities in Bali
      </p>

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl animate-pulse">
                <div className="aspect-[4/3] bg-gray-200 rounded-t-xl" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded w-1/3 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="w-full h-[220px] rounded-lg border-2 border-dashed border-red-200 flex items-center justify-center bg-red-50/50">
            <p className="text-red-500 font-medium text-center px-4">
              Failed to load activities. Please try again later.
            </p>
          </div>
        ) : displayedProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedProducts.map((prod) => (
                <ProductCard key={prod.productCode} product={prod} currency={currency} />
              ))}
            </div>

            {hasMore && (
              <div className="pt-8 pb-4 flex justify-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="px-8 py-2.5 bg-white border-2 border-blue-500 text-blue-500 font-bold rounded-full hover:bg-blue-500 hover:text-white transition-all shadow-sm cursor-pointer"
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
