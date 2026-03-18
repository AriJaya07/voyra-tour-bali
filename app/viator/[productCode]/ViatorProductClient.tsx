"use client"

import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Suspense, useEffect } from "react"
import { useViatorProductDetail, formatDuration } from "@/utils/hooks/useViator"
import type { ViatorImage } from "@/utils/hooks/useViator"
import { useCurrency } from "@/utils/hooks/useCurrency"
import Container from "@/components/Container"
import BookingUser from "@/components/DetailProduct/BookingUser"
import ImageGallery from "@/components/common/ImageGallery"
import ErrorBoundary from "@/components/common/ErrorBoundary"
import { trackViewItem } from "@/utils/analytics"

const FALLBACK_IMAGE = "/images/activity/melasti.png"

// ── Image helpers ───────────────────────────────────────────────────────

function pickVariant(img: ViatorImage, preferredWidth = 720): string {
  const variants = img?.variants
  if (!variants || variants.length === 0) return FALLBACK_IMAGE
  const sorted = [...variants].sort(
    (a, b) => Math.abs(a.width - preferredWidth) - Math.abs(b.width - preferredWidth)
  )
  return sorted[0]?.url || FALLBACK_IMAGE
}

function extractAllImages(images: ViatorImage[] | undefined, preferredWidth = 720): string[] {
  if (!images || images.length === 0) return [FALLBACK_IMAGE]

  const sorted = [...images].sort((a, b) => {
    if (a.isCover) return -1
    if (b.isCover) return 1
    return 0
  })

  const urls = sorted
    .map((img) => pickVariant(img, preferredWidth))
    .filter((url) => url !== FALLBACK_IMAGE)

  return urls.length > 0 ? urls : [FALLBACK_IMAGE]
}

function itemText(item: any): string {
  if (typeof item === "string") return item
  return item?.otherDescription || item?.description || item?.typeDescription || item?.categoryDescription || ""
}

// ── Main Content ────────────────────────────────────────────────────────

function ViatorProductContent({ productCode }: { productCode: string }) {
  const searchParams = useSearchParams()
  const urlPrice = Number(searchParams.get("price")) || 0
  const { currency } = useCurrency()
  const { data: product, isLoading, isError } = useViatorProductDetail(productCode, currency)

  // GA4: track product view
  useEffect(() => {
    if (product) {
      trackViewItem({
        productCode: product.productCode,
        title: product.title,
        price: product.pricing?.summary?.fromPrice ?? 0,
        currency: product.pricing?.currency ?? "USD",
      })
    }
  }, [product])

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20">
        <Container>
          <div className="flex flex-col sm:flex-row gap-1 rounded-2xl overflow-hidden mb-8">
            <div className="w-full sm:w-[55%] h-[280px] sm:h-[420px] bg-gray-200 animate-pulse" />
            <div className="hidden sm:flex flex-col gap-1 w-[22.5%]">
              <div className="h-[209px] bg-gray-200 animate-pulse" />
              <div className="h-[209px] bg-gray-200 animate-pulse" />
            </div>
            <div className="hidden sm:flex flex-col gap-1 w-[22.5%]">
              <div className="h-[209px] bg-gray-200 animate-pulse" />
              <div className="h-[209px] bg-gray-200 animate-pulse" />
            </div>
          </div>
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

  // ── Data extraction ─────────────────────────────────────────────────
  const allImages = extractAllImages(product.images, 720)
  const durationData = product.duration || (product as any).itinerary?.duration
  const duration = formatDuration(durationData)
  const rating = product.reviews?.combinedAverageRating
  const reviewCount = product.reviews?.totalReviews || 0
  const price = product.pricing?.summary?.fromPrice || urlPrice
  const hasFreeCancellation = product.flags?.includes("FREE_CANCELLATION")
  const confirmationType = product.bookingConfirmationSettings?.confirmationType || product.confirmationType

  const expectImages = allImages.length > 3
    ? allImages.slice(allImages.length - 3)
    : allImages.slice(0, 3)

  return (
    <div className="min-h-screen">
      {/* ── Banner header ── */}
      <div className="bg-gradient-to-r from-[#00E7FF] to-[#0097E8] pt-3 pb-8">
        <Container>
          <nav className="flex items-center gap-2 text-sm text-black/70 mb-6 pt-16">
            <Link href="/" className="hover:text-black transition">Home</Link>
            <span>&gt;</span>
            <span className="text-black font-medium truncate max-w-[250px] sm:max-w-none">{product.title}</span>
          </nav>

          <div className="mb-5">
            <h1 className="text-xl sm:text-2xl font-bold text-black leading-tight mb-2">
              {product.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {rating && (
                <span className="flex items-center gap-1 bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full">
                  <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                  <span className="font-bold text-black">{rating.toFixed(1)}</span>
                  <span className="text-black/60">({reviewCount.toLocaleString()})</span>
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-1 bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full text-black/80">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {duration}
                </span>
              )}
              {hasFreeCancellation && (
                <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Free Cancellation
                </span>
              )}
              {confirmationType === "INSTANT" && (
                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Instant Confirmation
                </span>
              )}
            </div>
          </div>

          <ImageGallery images={allImages} title={product.title} />
        </Container>
      </div>

      {/* ── Content body ── */}
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-10">

          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-10">

            <section>
              <div className="flex items-center gap-3 mb-4">
                <hr className="h-8 w-[4px] bg-[#02ACBE] border-none rounded" />
                <h2 className="text-2xl font-bold text-black">About This Activity</h2>
              </div>
              <div className="bg-gradient-to-r from-[#01ACBB]/10 to-[#C4E6E9]/10 rounded-xl p-5 sm:p-8">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                  {product.description}
                </p>
              </div>
            </section>

            {product.inclusions && product.inclusions.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <hr className="h-8 w-[4px] bg-green-500 border-none rounded" />
                  <h2 className="text-xl font-bold text-black">What&apos;s Included</h2>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.inclusions.map((item: any, i: number) => {
                    const text = itemText(item)
                    if (!text) return null
                    return (
                      <li key={i} className="flex items-start gap-2.5 text-gray-700 bg-green-50 rounded-lg px-4 py-3">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm">{text}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {product.exclusions && product.exclusions.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <hr className="h-8 w-[4px] bg-red-400 border-none rounded" />
                  <h2 className="text-xl font-bold text-black">What&apos;s Not Included</h2>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.exclusions.map((item: any, i: number) => {
                    const text = itemText(item)
                    if (!text) return null
                    return (
                      <li key={i} className="flex items-start gap-2.5 text-gray-700 bg-red-50 rounded-lg px-4 py-3">
                        <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-sm">{text}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {expectImages.length > 0 && expectImages[0] !== FALLBACK_IMAGE && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <hr className="h-8 w-[4px] bg-[#02ACBE] border-none rounded" />
                  <h2 className="text-xl font-bold text-black">What to Expect</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {expectImages.map((url, i) => (
                    <div key={i} className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
                      <Image
                        src={url}
                        alt={`What to expect ${i + 1}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {product.additionalInfo && product.additionalInfo.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <hr className="h-8 w-[4px] bg-blue-400 border-none rounded" />
                  <h2 className="text-xl font-bold text-black">Additional Information</h2>
                </div>
                <ul className="space-y-2">
                  {product.additionalInfo.map((info: any, i: number) => {
                    const text = itemText(info)
                    if (!text) return null
                    return (
                      <li key={i} className="flex items-start gap-2.5 text-gray-700">
                        <svg className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm">{text}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {product.productUrl && (
              <div className="pb-4">
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
              <ErrorBoundary>
                <BookingUser
                  price={price}
                  title={product.title}
                  productCode={product.productCode}
                  ageBands={product.pricingInfo?.ageBands}
                  pricingCurrency={product.pricing?.currency || "IDR"}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}

// ── Exported Client Component ───────────────────────────────────────────

export default function ViatorProductClient({ productCode }: { productCode: string }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
        </div>
      }
    >
      <ViatorProductContent productCode={productCode} />
    </Suspense>
  )
}
