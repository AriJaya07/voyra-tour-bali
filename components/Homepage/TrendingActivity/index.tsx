"use client"

import { useState, useMemo, memo, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useCurrency } from "@/utils/hooks/useCurrency"
import { useViatorProducts } from "@/utils/hooks/useViator"
import { getViatorImageUrl, formatDuration } from "@/utils/hooks/useViator"
import { formatPrice, CurrencyCode } from "@/utils/formatPrice"
import type { Category, UnifiedActivity } from "@/types/tourism"
import { trackCategoryClick } from "@/utils/analytics"

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

// ── Pricing helpers ─────────────────────────────────────────────────────

function getDiscountPercent(price: number, before?: number): number | null {
  if (!before || before <= price) return null
  return Math.round(((before - price) / before) * 100)
}

/** Map a Viator product to UnifiedActivity (includes discount data) */
function mapViatorToActivity(product: any): UnifiedActivity {
  const fromPrice = product.pricing?.summary?.fromPrice ?? 0
  const beforeDiscount = product.pricing?.summary?.fromPriceBeforeDiscount

  return {
    id: product.productCode,
    source: "viator",
    title: product.title,
    description: product.description || "",
    imageUrl: getViatorImageUrl(product.images, 480),
    price: fromPrice,
    priceBeforeDiscount: beforeDiscount && beforeDiscount > fromPrice ? beforeDiscount : undefined,
    currency: product.pricing?.currency ?? "USD",
    rating: product.reviews?.combinedAverageRating,
    reviewCount: product.reviews?.totalReviews,
    duration: formatDuration(product.duration),
    freeCancellation: product.flags?.includes("FREE_CANCELLATION"),
    productCode: product.productCode,
  }
}

// ── Tab Button ──────────────────────────────────────────────────────────

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
        px-5 sm:px-6
        rounded-full
        text-xs sm:text-sm md:text-base
        font-semibold
        transition-all duration-200
        cursor-pointer
        whitespace-nowrap
        shrink-0
        max-w-[160px] truncate
        ${
          isActive
            ? "bg-blue-50 text-blue-600 shadow-md"
            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900"
        }
      `}
      title={label}
    >
      {label}
    </button>
  )
})

// ── Activity Card ───────────────────────────────────────────────────────

function ActivityCard({ item, currency }: { item: UnifiedActivity; currency: CurrencyCode }) {
  const href = item.source === "viator"
    ? `/viator/${item.productCode}?price=${item.price}&cur=${item.currency}`
    : `/detail/${item.slug}`

  const discountPercent = getDiscountPercent(item.price, item.priceBeforeDiscount)
  const sourceCurrency = item.currency as CurrencyCode

  return (
    <Link href={href} className="group block">
      <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
        {/* Image */}
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Discount badge */}
          {discountPercent && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{discountPercent}%
            </span>
          )}

          {/* Free cancellation badge (shift right if discount exists) */}
          {item.freeCancellation && !discountPercent && (
            <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Free Cancellation
            </span>
          )}

          <span className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white">
            Viator
          </span>
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col flex-1">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1.5 group-hover:text-blue-600 transition-colors">
            {item.title}
          </h3>

          {/* Rating & Duration */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            {item.rating && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
                <span className="font-semibold text-gray-700">{item.rating.toFixed(1)}</span>
                <span>({(item.reviewCount ?? 0).toLocaleString()})</span>
              </span>
            )}
            {item.duration && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {item.duration}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="mt-auto">
            {item.price > 0 ? (
              <>
                <p className="text-[10px] text-gray-400 leading-tight">From</p>

                {/* Original price (strikethrough) when discount exists */}
                {item.priceBeforeDiscount && (
                  <p className="text-[11px] text-gray-400 line-through leading-tight">
                    {formatPrice(item.priceBeforeDiscount, currency, sourceCurrency)}
                  </p>
                )}

                {/* Current price */}
                <p className={`text-sm sm:text-base font-black leading-tight ${
                  item.priceBeforeDiscount ? "text-red-600" : "text-gray-900"
                }`}>
                  {formatPrice(item.price, currency, sourceCurrency)}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-400 italic">Check price</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Main Component ──────────────────────────────────────────────────────

export default function TrendingActivity({ categories }: TrendingActivityProps) {
  const displayCategories = categories.slice(0, 8)
  const defaultTab = displayCategories[0]?.name ?? "Tours"
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [showAll, setShowAll] = useState(false)

  const { currency } = useCurrency()

  const { data: viatorProducts, isLoading, isError } = useViatorProducts(activeTab, currency)

  const activities: UnifiedActivity[] = useMemo(() => {
    if (!viatorProducts) return []
    return viatorProducts.map(mapViatorToActivity)
  }, [viatorProducts])

  const [shuffledActivities, setShuffledActivities] = useState<UnifiedActivity[]>([])
  useEffect(() => {
    if (activities.length > 0) {
      setShuffledActivities(shuffle(activities))
      setShowAll(false)
    } else if (!isLoading && viatorProducts) {
      setShuffledActivities([])
    }
  }, [activities, isLoading, viatorProducts])

  const displayedActivities = useMemo(
    () => (showAll ? shuffledActivities : shuffledActivities.slice(0, 5)),
    [showAll, shuffledActivities]
  )
  const hasMore = shuffledActivities.length > 5

  return (
    <section id="paket" className="pt-20 px-4 mb-20">
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
            isActive={activeTab === tab.name}
            onClick={() => { setActiveTab(tab.name); trackCategoryClick(tab.name) }}
          />
        ))}
      </div>

      {/* Activities */}
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
        ) : displayedActivities.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedActivities.map((item) => (
                <ActivityCard key={item.id} item={item} currency={currency} />
              ))}
            </div>

            {hasMore && (
              <div className="pt-8 pb-4 flex justify-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="px-8 py-2.5 bg-white border-2 border-blue-500 text-blue-500 font-bold rounded-full hover:bg-blue-500 hover:text-white transition-all shadow-md cursor-pointer"
                >
                  {showAll ? "Show Less" : "See All Activity"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-[220px] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50/50">
            <p className="text-gray-500 font-medium text-center px-4">
              No activities available for &quot;<span className="font-bold text-gray-700">{activeTab}</span>&quot; at the moment.
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
