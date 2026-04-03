"use client"

import Link from "next/link"
import OptimizedImage from "@/components/common/OptimizedImage"
import { formatPrice, CurrencyCode } from "@/utils/formatPrice"
import type { UnifiedActivity } from "@/types/tourism"

function getDiscountPercent(price: number, before?: number): number | null {
  if (!before || before <= price) return null
  return Math.round(((before - price) / before) * 100)
}

interface ActivityCardProps {
  item: UnifiedActivity
  currency: CurrencyCode
}

export function ActivityCard({ item, currency }: ActivityCardProps) {
  const href = item.source === "viator"
    ? `/viator/${item.productCode}?price=${item.price}&cur=${item.currency}`
    : `/detail/${item.slug}`

  const discountPercent = getDiscountPercent(item.price, item.priceBeforeDiscount)
  const sourceCurrency = item.currency as CurrencyCode

  return (
    <Link href={href} className="group block">
      <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-[280px] flex flex-col">
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <OptimizedImage
            src={item.imageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {discountPercent && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{discountPercent}%
            </span>
          )}

          {item.freeCancellation && !discountPercent && (
            <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Free Cancellation
            </span>
          )}
        </div>

        <div className="p-3 flex flex-col flex-1">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1.5 group-hover:text-blue-600 transition-colors min-h-[40px]">
            {item.title}
          </h3>

          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 min-h-[16px]">
            {(item.rating || item.duration) && (
              <>
                {item.rating && (
                  <span
                    className="flex items-center gap-0.5"
                    title="Total review count and overall rating based on Viator and Tripadvisor reviews"
                  >
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
              </>
            )}
          </div>

          <div className="mt-auto min-h-[58px] flex flex-col justify-end">
            {item.price > 0 ? (
              <>
                <p className="text-[10px] text-gray-400 leading-tight">From</p>

                {item.priceBeforeDiscount && (
                  <p className="text-[11px] text-gray-400 line-through leading-tight">
                    {formatPrice(item.priceBeforeDiscount, currency, sourceCurrency)}
                  </p>
                )}

                <p className={`text-sm sm:text-base font-black leading-tight ${item.priceBeforeDiscount ? "text-red-600" : "text-gray-900"}`}>
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
