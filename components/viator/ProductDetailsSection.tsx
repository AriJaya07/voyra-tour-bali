import type {
  ViatorCancellationPolicy,
  ViatorBookingRequirements,
  ViatorLanguageGuide,
  ViatorItinerary,
  ViatorProductOption,
  ViatorSupplier,
} from "@/utils/hooks/useViator"
import { formatDuration } from "@/utils/hooks/useViator"

interface ProductDetailsSectionProps {
  cancellationPolicy?: ViatorCancellationPolicy
  bookingConfirmation?: {
    confirmationType: string
    bookingCutoffType?: string
    bookingCutoffInMinutes?: number
    bookingCutoffFixedTime?: string
  }
  bookingRequirements?: ViatorBookingRequirements
  languageGuides?: ViatorLanguageGuide[]
  itinerary?: ViatorItinerary
  productOptions?: ViatorProductOption[]
  supplier?: ViatorSupplier
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatCutoff(minutes?: number, fixedTime?: string): string {
  if (fixedTime) {
    const [h, m] = fixedTime.split(":")
    const hour = parseInt(h)
    const ampm = hour >= 12 ? "PM" : "AM"
    const h12 = hour % 12 || 12
    return `before ${h12}:${m} ${ampm} (day before)`
  }
  if (!minutes) return ""
  if (minutes < 60) return `${minutes} minutes before`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} before`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? "s" : ""} before`
}

function formatLanguage(code: string): string {
  const map: Record<string, string> = {
    en: "English", id: "Indonesian", ja: "Japanese", zh: "Chinese",
    ko: "Korean", fr: "French", de: "German", es: "Spanish",
    it: "Italian", pt: "Portuguese", ru: "Russian", nl: "Dutch",
  }
  return map[code] || code.toUpperCase()
}

function formatGuideType(type: string): string {
  const map: Record<string, string> = {
    GUIDE: "Live Guide",
    AUDIO: "Audio Guide",
    WRITTEN: "Written Guide",
  }
  return map[type] || type
}

function cancellationColor(type: string) {
  if (type === "ALL_SALES_FINAL") return { bg: "bg-red-50", border: "border-red-100", icon: "text-red-500", badge: "bg-red-100 text-red-700" }
  if (type === "FULL_REFUND" || type === "FREE_CANCELLATION") return { bg: "bg-green-50", border: "border-green-100", icon: "text-green-500", badge: "bg-green-100 text-green-700" }
  return { bg: "bg-amber-50", border: "border-amber-100", icon: "text-amber-500", badge: "bg-amber-100 text-amber-700" }
}

function cancellationLabel(type: string): string {
  const map: Record<string, string> = {
    ALL_SALES_FINAL: "Non-refundable",
    FULL_REFUND: "Free Cancellation",
    FREE_CANCELLATION: "Free Cancellation",
    CONDITIONAL: "Partial Refund Available",
    STANDARD: "Standard Policy",
  }
  return map[type] || type.replace(/_/g, " ").toLowerCase()
}

// ── Component ────────────────────────────────────────────────────────────

export default function ProductDetailsSection({
  cancellationPolicy,
  bookingConfirmation,
  bookingRequirements,
  languageGuides,
  itinerary,
  productOptions,
  supplier,
}: ProductDetailsSectionProps) {
  const hasItineraryItems = itinerary?.itineraryItems && itinerary.itineraryItems.filter(i => i.description && !i.passByWithoutStopping).length > 0
  const hasProductOptions = productOptions && productOptions.length > 0
  const hasGuides = languageGuides && languageGuides.length > 0

  return (
    <>
      {/* ── Itinerary Timeline ── */}
      {hasItineraryItems && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <hr className="h-8 w-[4px] bg-[#0071CE] border-none rounded" />
            <h2 className="text-xl font-bold text-black">Itinerary</h2>
            {itinerary?.privateTour && (
              <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-full uppercase tracking-wide">Private Tour</span>
            )}
          </div>
          <div className="relative ml-4 pl-6 space-y-0">
            {/* Timeline line */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#0071CE] to-[#0071CE]/20 rounded-full" />

            {itinerary!.itineraryItems!
              .filter(item => item.description)
              .map((item, i, arr) => {
                const isLast = i === arr.length - 1
                const isPassBy = item.passByWithoutStopping
                const dur = item.duration?.fixedDurationInMinutes

                return (
                  <div key={i} className="relative pb-6 last:pb-0">
                    {/* Dot — centered on the line (left-0 of parent, offset by -7px to center 14px dot on 2px line) */}
                    <div className={`absolute top-3 w-3.5 h-3.5 rounded-full border-[3px] ${
                      isPassBy
                        ? "border-gray-300 bg-white"
                        : isLast
                          ? "border-red-400 bg-red-50"
                          : i === 0
                            ? "border-green-500 bg-green-50"
                            : "border-[#0071CE] bg-blue-50"
                    }`} style={{ left: "-30px" }} />

                    <div className={`rounded-xl p-4 ${isPassBy ? "bg-gray-50 border border-gray-100" : "bg-white border border-gray-200 shadow-sm"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-sm leading-relaxed ${isPassBy ? "text-gray-400 italic" : "text-gray-800"}`}>
                          {isPassBy && <span className="text-xs font-medium text-gray-400 mr-1">(Pass by)</span>}
                          {item.description}
                        </p>
                      </div>
                      {((dur && dur > 0) || item.admissionIncluded === "YES") && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {dur && dur > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {formatDuration({ fixedDurationInMinutes: dur })}
                            </span>
                          )}
                          {item.admissionIncluded === "YES" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Admission included
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Duration summary */}
          {itinerary?.duration && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 ml-4 pl-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Total duration: {formatDuration(itinerary.duration)}</span>
            </div>
          )}
        </section>
      )}

      {/* ── Trust Signals Row ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <hr className="h-8 w-[4px] bg-gray-400 border-none rounded" />
          <h2 className="text-xl font-bold text-black">Booking Details</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Cancellation Policy */}
          {cancellationPolicy && (() => {
            const colors = cancellationColor(cancellationPolicy.type)
            return (
              <div className={`${colors.bg} border ${colors.border} rounded-xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <svg className={`w-5 h-5 ${colors.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                    {cancellationLabel(cancellationPolicy.type)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{cancellationPolicy.description}</p>
                {cancellationPolicy.refundEligibility && cancellationPolicy.refundEligibility.length > 1 && (
                  <div className="mt-2 space-y-1">
                    {cancellationPolicy.refundEligibility
                      .filter(r => r.percentageRefundable > 0)
                      .map((r, i) => (
                        <p key={i} className="text-[11px] text-gray-500">
                          {r.dayRangeMin}+ days before: <strong>{r.percentageRefundable}% refund</strong>
                        </p>
                      ))}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Confirmation */}
          {bookingConfirmation && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  bookingConfirmation.confirmationType === "INSTANT"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {bookingConfirmation.confirmationType === "INSTANT" ? "Instant Confirmation" : "Manual Confirmation"}
                </span>
              </div>
              {bookingConfirmation.bookingCutoffInMinutes != null && (
                <p className="text-xs text-gray-600">
                  Book {formatCutoff(bookingConfirmation.bookingCutoffInMinutes, bookingConfirmation.bookingCutoffFixedTime)}
                </p>
              )}
            </div>
          )}

          {/* Booking Requirements */}
          {bookingRequirements && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs font-bold text-gray-700">Group Size</span>
              </div>
              <p className="text-xs text-gray-600">
                {bookingRequirements.minTravelersPerBooking ?? 1}–{bookingRequirements.maxTravelersPerBooking ?? 15} travelers per booking
              </p>
              {bookingRequirements.requiresAdultForBooking && (
                <p className="text-[11px] text-gray-500 mt-1">At least 1 adult required</p>
              )}
            </div>
          )}

          {/* Language Guide */}
          {hasGuides && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span className="text-xs font-bold text-gray-700">Available In</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {languageGuides!.map((g, i) => (
                  <span key={i} className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                    {formatLanguage(g.language)} ({formatGuideType(g.type)})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Supplier */}
        {supplier?.name && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 pl-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Operated by <span className="font-medium text-gray-500">{supplier.name}</span>
          </div>
        )}
      </section>
    </>
  )
}
