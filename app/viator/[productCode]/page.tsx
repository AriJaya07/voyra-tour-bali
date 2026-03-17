"use client"

import { useParams, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import { useViatorProductDetail, getViatorImageUrl, formatDuration } from "@/utils/hooks/useViator"
import { useCurrency } from "@/utils/hooks/useCurrency"
import { formatPrice } from "@/utils/formatPrice"
import Container from "@/components/Container"
import BookingUser from "@/components/DetailProduct/BookingUser"

/** Safely extract display text from a Viator inclusion/exclusion/additionalInfo item */
function itemText(item: any): string {
  if (typeof item === "string") return item
  return item?.otherDescription || item?.description || item?.typeDescription || item?.categoryDescription || ""
}

function ViatorProductContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const productCode = params.productCode as string
  // Price passed from product card via URL (reliable fallback)
  const urlPrice = Number(searchParams.get("price")) || 0
  const { currency } = useCurrency()
  const { data: product, isLoading, isError } = useViatorProductDetail(productCode, currency)

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20">
        <Container>
          {/* Banner skeleton */}
          <div className="w-full aspect-[21/9] bg-gray-200 rounded-2xl animate-pulse mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
              <div className="h-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
          </div>
        </Container>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <h2 className="text-2xl font-bold text-gray-800">Product Not Found</h2>
        <p className="text-gray-500">We couldn&apos;t find this activity. It may no longer be available.</p>
        <Link href="/" className="px-6 py-3 bg-[#0071CE] text-white rounded-xl font-bold hover:bg-[#005ba6] transition">
          Back to Home
        </Link>
      </div>
    )
  }

  const coverUrl = getViatorImageUrl(product.images, 1200)
  const galleryImages = product.images
    ?.flatMap(img => img.variants?.filter(v => v.width >= 400) || [])
    .slice(0, 4) || []
  // Duration can be at top level or nested inside itinerary
  const durationData = product.duration || (product as any).itinerary?.duration
  const duration = formatDuration(durationData)
  const rating = product.reviews?.combinedAverageRating
  const reviewCount = product.reviews?.totalReviews || 0
  // Use API pricing if available, fall back to price from URL params
  const price = product.pricing?.summary?.fromPrice || urlPrice
  const hasFreeCancellation = product.flags?.includes("FREE_CANCELLATION")
  const confirmationType = product.bookingConfirmationSettings?.confirmationType || product.confirmationType

  return (
    <div className="min-h-screen pt-20 pb-16">
      {/* Breadcrumb */}
      <Container>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4 pt-4">
          <Link href="/" className="hover:text-[#0071CE] transition">Home</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium truncate">{product.title}</span>
        </nav>
      </Container>

      {/* Banner Image */}
      <Container>
        <div className="relative w-full aspect-[21/9] sm:aspect-[21/8] rounded-2xl overflow-hidden mb-8">
          <Image
            src={coverUrl}
            alt={product.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Badges */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {hasFreeCancellation && (
              <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Free Cancellation
              </span>
            )}
            {confirmationType === "INSTANT" && (
              <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Instant Confirmation
              </span>
            )}
          </div>
        </div>

        {/* Gallery thumbnails */}
        {galleryImages.length > 1 && (
          <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide">
            {galleryImages.map((variant, i) => (
              <div key={i} className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden flex-shrink-0 border-2 border-transparent hover:border-[#0071CE] transition">
                <Image src={variant.url} alt={`Gallery ${i + 1}`} fill sizes="128px" className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </Container>

      {/* Content */}
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title & Meta */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                {product.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                {rating && (
                  <span className="flex items-center gap-1 bg-yellow-50 px-3 py-1.5 rounded-full">
                    <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                    <span className="font-bold text-gray-800">{rating.toFixed(1)}</span>
                    <span className="text-gray-500">({reviewCount.toLocaleString()} reviews)</span>
                  </span>
                )}
                {duration && (
                  <span className="flex items-center gap-1 text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {duration}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">About This Activity</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Inclusions */}
            {product.inclusions && product.inclusions.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">What&apos;s Included</h2>
                <ul className="space-y-2">
                  {product.inclusions.map((item: any, i: number) => {
                    const text = itemText(item)
                    if (!text) return null
                    return (
                      <li key={i} className="flex items-start gap-2 text-gray-600">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{text}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Exclusions */}
            {product.exclusions && product.exclusions.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">What&apos;s Not Included</h2>
                <ul className="space-y-2">
                  {product.exclusions.map((item: any, i: number) => {
                    const text = itemText(item)
                    if (!text) return null
                    return (
                      <li key={i} className="flex items-start gap-2 text-gray-600">
                        <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>{text}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Additional Info */}
            {product.additionalInfo && product.additionalInfo.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Additional Information</h2>
                <ul className="space-y-2">
                  {product.additionalInfo.map((info: any, i: number) => {
                    const text = itemText(info)
                    if (!text) return null
                    return (
                      <li key={i} className="flex items-start gap-2 text-gray-600">
                        <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{text}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Viator link */}
            {product.productUrl && (
              <div className="pt-4">
                <a
                  href={product.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[#0071CE] hover:underline font-medium"
                >
                  View on Viator
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>

          {/* Right: Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <BookingUser
                price={price}
                title={product.title}
                productCode={product.productCode}
              />
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}

export default function ViatorProductPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
        </div>
      }
    >
      <ViatorProductContent />
    </Suspense>
  )
}
