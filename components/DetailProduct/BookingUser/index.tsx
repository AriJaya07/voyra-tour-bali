"use client"

import { useState, useEffect, useMemo } from 'react'

import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCreatePayment } from '@/utils/hooks/usePayment'
import { formatPrice } from '@/utils/formatPrice'
import type { CurrencyCode } from '@/utils/formatPrice'
import { useCurrency } from '@/utils/hooks/useCurrency'
import CurrencySwitch from '@/components/common/CurrencySwitch'
import {
  useViatorAvailability,
  extractPriceMap,
} from '@/utils/hooks/useViator'
import type { ViatorAgeBand, AvailabilityPaxMix } from '@/utils/hooks/useViator'
import { trackBeginCheckout, trackPurchase } from '@/utils/analytics'

// ── Config ─────────────────────────────────────────────────────────────
const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890"

// ── Types ──────────────────────────────────────────────────────────────
interface TravelerCount {
  ageBand: string
  label: string
  ageRange: string
  count: number
  fallbackPrice: number
  livePrice: number | null
}

interface BookingUserProps {
  price: number
  title: string
  productCode?: string
  ageBands?: ViatorAgeBand[]
  pricingCurrency?: string
  /** Product source — "VIATOR" shows redirect button, "LOCAL" shows full booking */
  source?: "VIATOR" | "LOCAL"
  /** External Viator URL (required when source="VIATOR") */
  viatorUrl?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────

const BAND_LABELS: Record<string, string> = {
  ADULT: "Adult",
  CHILD: "Child",
  INFANT: "Infant",
  YOUTH: "Youth",
  SENIOR: "Senior",
  TRAVELER: "Traveler",
}

const BAND_ICONS: Record<string, string> = {
  ADULT: "👤",
  CHILD: "🧒",
  INFANT: "👶",
  YOUTH: "🧑",
  SENIOR: "🧓",
  TRAVELER: "👤",
}

function buildTravelers(ageBands: ViatorAgeBand[] | undefined, basePrice: number): TravelerCount[] {
  if (!ageBands || ageBands.length === 0) {
    return [{
      ageBand: "ADULT",
      label: "Adult",
      ageRange: "18+",
      count: 0,
      fallbackPrice: basePrice,
      livePrice: null,
    }]
  }

  return ageBands.map((band) => ({
    ageBand: band.ageBand,
    label: BAND_LABELS[band.ageBand] || band.ageBand,
    ageRange: `${band.startAge}–${band.endAge}`,
    count: 0,
    fallbackPrice: band.price ?? basePrice,
    livePrice: null,
  }))
}

function effectivePrice(t: TravelerCount): number {
  return t.livePrice ?? t.fallbackPrice
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const toISODate = (d: Date) => d.toISOString().split('T')[0]

// ── Traveler Row ────────────────────────────────────────────────────────

function TravelerRow({
  traveler,
  currency,
  pricingCurrency,
  isLoadingPrice,
  onIncrement,
  onDecrement,
}: {
  traveler: TravelerCount
  currency: CurrencyCode
  pricingCurrency: string
  isLoadingPrice: boolean
  onIncrement: () => void
  onDecrement: () => void
}) {
  const displayPrice = effectivePrice(traveler)
  const hasLivePrice = traveler.livePrice !== null

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-lg shrink-0">{BAND_ICONS[traveler.ageBand] || "👤"}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800">{traveler.label}</p>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>Age {traveler.ageRange}</span>
            <span>·</span>
            {isLoadingPrice && traveler.count > 0 ? (
              <span className="inline-block w-16 h-3 bg-gray-200 rounded animate-pulse" />
            ) : (
              <span className={hasLivePrice ? "text-green-600 font-medium" : ""}>
                {formatPrice(displayPrice, currency, pricingCurrency as CurrencyCode)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onDecrement}
          disabled={traveler.count <= 0}
          className={`w-8 h-8 flex items-center justify-center rounded-full text-lg font-bold transition ${
            traveler.count <= 0
              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
          }`}
          aria-label={`Decrease ${traveler.label}`}
        >
          −
        </button>
        <span className="text-base font-bold text-gray-900 w-5 text-center select-none">
          {traveler.count}
        </span>
        <button
          onClick={onIncrement}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-lg transition cursor-pointer"
          aria-label={`Increase ${traveler.label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────

export default function BookingUser({
  price,
  title,
  productCode = 'VTR-BALI-1',
  ageBands,
  pricingCurrency = "IDR",
  source = "LOCAL",
  viatorUrl,
}: BookingUserProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { currency } = useCurrency()

  const [date, setDate] = useState<Date | null>(null)
  const [travelers, setTravelers] = useState<TravelerCount[]>(() => buildTravelers(ageBands, price))

  const paymentMutation = useCreatePayment()

  useEffect(() => { setDate(new Date()) }, [])

  useEffect(() => {
    setTravelers((prev) => {
      const fresh = buildTravelers(ageBands, price)
      return fresh.map((t) => {
        const existing = prev.find((p) => p.ageBand === t.ageBand)
        return existing ? { ...t, count: existing.count, livePrice: existing.livePrice } : t
      })
    })
  }, [ageBands, price])

  const updateCount = (index: number, delta: number) => {
    setTravelers((prev) =>
      prev.map((t, i) =>
        i === index ? { ...t, count: Math.max(0, t.count + delta) } : t
      )
    )
  }

  // ── Availability API ─────────────────────────────────────────────────
  const paxMix: AvailabilityPaxMix[] = useMemo(
    () => travelers.map((t) => ({ ageBand: t.ageBand, numberOfTravelers: t.count })),
    [travelers]
  )

  const travelDate = date ? toISODate(date) : null
  const totalTravelers = travelers.reduce((sum, t) => sum + t.count, 0)

  const {
    data: availabilityData,
    isLoading: isLoadingAvailability,
    isError: isAvailabilityError,
  } = useViatorAvailability(productCode, travelDate, paxMix, currency)

  const livePriceMap = useMemo(
    () => extractPriceMap(availabilityData),
    [availabilityData]
  )

  const travelersWithPricing: TravelerCount[] = useMemo(() => {
    if (Object.keys(livePriceMap).length === 0) return travelers

    if (livePriceMap["_TOTAL"] !== undefined && !livePriceMap["ADULT"]) {
      const total = livePriceMap["_TOTAL"]
      if (totalTravelers > 0) {
        const perPerson = Math.round(total / totalTravelers)
        return travelers.map((t) => ({ ...t, livePrice: t.count > 0 ? perPerson : t.livePrice }))
      }
      return travelers
    }

    return travelers.map((t) => ({
      ...t,
      livePrice: livePriceMap[t.ageBand] !== undefined ? livePriceMap[t.ageBand] : t.livePrice,
    }))
  }, [travelers, livePriceMap, totalTravelers])

  // ── Price calculation ────────────────────────────────────────────────
  const totalPrice = travelersWithPricing.reduce(
    (sum, t) => sum + t.count * effectivePrice(t),
    0
  )

  const hasLivePricing = travelersWithPricing.some((t) => t.livePrice !== null && t.count > 0)
  const isNotAvailable = isAvailabilityError || (
    availabilityData && availabilityData.available === false
  )
  const isPriceLoading = isLoadingAvailability && totalTravelers > 0
  const canBook = !!date && totalTravelers > 0 && !isPriceLoading && !isNotAvailable

  // ── WhatsApp ─────────────────────────────────────────────────────────
  const buildWaUrl = () => {
    const selectedDate = date ? fmtDate(date) : "—"
    const travelerLines = travelersWithPricing
      .filter((t) => t.count > 0)
      .map((t) => `  ${t.label}: ${t.count} pax (${formatPrice(effectivePrice(t), currency, pricingCurrency as CurrencyCode)}/pp)`)
      .join("\n")

    const lines = [
      `Hello Voyra Bali!`,
      `I would like to book the following tour:`,
      ``,
      `Tour: ${title}`,
      `Date: ${selectedDate}`,
      `Travelers:`,
      travelerLines || "  Not specified",
      `Total: ${formatPrice(totalPrice, currency, pricingCurrency as CurrencyCode)}`,
      ``,
      `Please confirm, thank you!`,
    ]
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`
  }

  // ── Booking handler ──────────────────────────────────────────────────
  const handleBooking = async () => {
    if (!session) {
      const currentUrl = typeof window !== "undefined" ? window.location.pathname : "/"
      router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`)
      return
    }
    if (!canBook) return

    // GA4: begin_checkout
    trackBeginCheckout({
      productCode,
      title,
      price: totalPrice,
      currency: pricingCurrency,
      travelers: totalTravelers,
    })

    paymentMutation.mutate(
      {
        productCode,
        productTitle: title,
        travelDate: date!.toISOString().split('T')[0],
        pax: totalTravelers,
        totalPrice,
      },
      {
        onSuccess: (data) => {
          // GA4: purchase
          trackPurchase({
            transactionId: data.orderId || `txn-${Date.now()}`,
            productCode,
            title,
            price: totalPrice,
            currency: pricingCurrency,
            travelers: totalTravelers,
          })
          window.location.href = data.redirectUrl
        },
      }
    )
  }

  const paymentError = paymentMutation.isError
    ? paymentMutation.error?.message || "A system error occurred while processing your booking."
    : null

  // ── VIATOR PRODUCTS: redirect-only UI ──────────────────────────────
  if (source === "VIATOR" && viatorUrl) {
    return (
      <div className="border border-[#E6E6E6] rounded-2xl p-5 sm:p-6 my-10 lg:my-0 shadow-sm">
        <p className="text-base font-bold text-black mb-1">Book This Tour</p>
        <p className="text-gray-400 text-xs mb-5">
          This tour is managed by Viator. You will be redirected to complete your booking.
        </p>

        {/* Price display */}
        <div className="bg-[#F8F8F8] rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">Starting from</span>
            <span className="text-lg font-black text-gray-900">
              {formatPrice(price, currency, pricingCurrency as CurrencyCode)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">per person</p>
        </div>

        {/* Viator redirect button */}
        <button
          onClick={() => { window.location.href = viatorUrl }}
          className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl bg-[#2D9B1B] hover:bg-[#257A15] active:scale-[0.98] transition-all shadow-md cursor-pointer"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="text-white font-bold text-sm">Book on Viator</span>
        </button>

        <div className="flex items-center gap-2 mt-3">
          <div className="h-px bg-gray-300 flex-1" />
          <span className="text-[10px] text-gray-400 font-medium uppercase">Or</span>
          <div className="h-px bg-gray-300 flex-1" />
        </div>

        <a
          href={buildWaUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full h-12 bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a852] active:scale-[0.98] flex items-center justify-center gap-2.5 rounded-xl transition-all shadow-sm"
        >
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span className="text-white font-bold text-sm">Ask via WhatsApp</span>
        </a>

        {/* Trust indicators */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Secure booking via Viator
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Instant confirmation
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <svg className="w-3.5 h-3.5 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Free cancellation available
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-[#E6E6E6] rounded-2xl p-5 sm:p-6 my-10 lg:my-0 shadow-sm">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-base font-bold text-black truncate pr-2">Booking</p>
        <div className="flex items-center gap-2 shrink-0">
          <CurrencySwitch size="sm" />
          {isNotAvailable ? (
            <span className="text-[10px] bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
              Unavailable
            </span>
          ) : (
            <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
              Available
            </span>
          )}
        </div>
      </div>
      <p className="text-gray-400 text-xs mb-5">
        Select date &amp; travelers to get real-time pricing.
      </p>

      {/* ── Calendar ── */}
      <div className="mb-5">
        <p className="text-sm font-semibold text-gray-700 mb-2">Select Date</p>
        <style>{`
          .booking-cal { width: 100%; border: none !important; font-family: inherit; font-size: 13px; }
          .booking-cal .react-calendar__tile--active { background: #0071CE !important; color: white !important; border-radius: 8px; }
          .booking-cal .react-calendar__tile--now { background: #e0f0ff !important; border-radius: 8px; }
          .booking-cal .react-calendar__tile:hover { background: #b3d9ff !important; border-radius: 8px; }
          .booking-cal .react-calendar__navigation button:hover { background: #f0f7ff !important; border-radius: 8px; }
          .booking-cal .react-calendar__navigation button { font-weight: 700; color: #1a1a1a; font-size: 14px; }
          .booking-cal .react-calendar__tile:disabled { background: #f5f5f5; color: #c0c0c0; }
          .booking-cal .react-calendar__tile { padding: 8px 4px; }
        `}</style>
        <Calendar
          onChange={(val) => setDate(val as Date)}
          value={date}
          minDate={new Date()}
          className="booking-cal"
        />
      </div>

      {/* ── Selected date ── */}
      <div className="border border-[#E6E6E6] rounded-xl px-4 py-3 mb-4">
        <p className="text-xs font-semibold text-gray-500 mb-0.5">Selected Date</p>
        <p className="text-sm font-medium text-gray-800">
          {date ? fmtDate(date) : "— Pick a date above"}
        </p>
      </div>

      {/* ── Travelers (ageBands) ── */}
      <div className="border border-[#E6E6E6] rounded-xl px-4 py-3 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-gray-500">Travelers</p>
          {isPriceLoading && (
            <span className="text-[10px] text-blue-500 font-medium flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Fetching prices...
            </span>
          )}
        </div>
        <div className="divide-y divide-gray-100">
          {travelersWithPricing.map((t, i) => (
            <TravelerRow
              key={t.ageBand}
              traveler={t}
              currency={currency}
              pricingCurrency={pricingCurrency}
              isLoadingPrice={isPriceLoading}
              onIncrement={() => updateCount(i, 1)}
              onDecrement={() => updateCount(i, -1)}
            />
          ))}
        </div>
      </div>

      {/* ── Not available warning ── */}
      {isNotAvailable && totalTravelers > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium text-center">
          This tour is not available for the selected date and travelers. Please try a different date.
        </div>
      )}

      {/* ── Price Breakdown ── */}
      <div className="bg-[#F8F8F8] rounded-xl p-4 flex flex-col gap-2.5">
        {travelersWithPricing.filter((t) => t.count > 0).map((t) => (
          <div key={t.ageBand} className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {t.label} × {t.count}
            </span>
            {isPriceLoading ? (
              <span className="inline-block w-20 h-4 bg-gray-200 rounded animate-pulse" />
            ) : (
              <span className="text-gray-700 font-medium">
                {formatPrice(t.count * effectivePrice(t), currency, pricingCurrency as CurrencyCode)}
              </span>
            )}
          </div>
        ))}

        {hasLivePricing && !isPriceLoading && (
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-green-600 font-medium">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Real-time pricing from Viator
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-sm font-bold text-gray-900">Total</span>
          {isPriceLoading ? (
            <span className="inline-block w-24 h-6 bg-gray-200 rounded animate-pulse" />
          ) : (
            <span className="text-lg font-black text-gray-900">
              {totalTravelers > 0
                ? formatPrice(totalPrice, currency, pricingCurrency as CurrencyCode)
                : formatPrice(0, currency)
              }
            </span>
          )}
        </div>

        {!canBook && !isPriceLoading && !isNotAvailable && (
          <p className="text-xs text-amber-600 text-center">
            {!date ? "Please select a date" : totalTravelers === 0 ? "Add at least 1 traveler" : ""}
          </p>
        )}

        {paymentError && (
          <div className="p-3 bg-red-100 text-red-800 text-sm rounded-lg border border-red-200 font-medium">
            {paymentError}
          </div>
        )}

        <button
          onClick={handleBooking}
          disabled={paymentMutation.isPending || !canBook}
          className={`w-full h-12 flex items-center justify-center gap-2 rounded-xl transition-all shadow-md text-white font-bold text-sm active:scale-[0.98] ${
            paymentMutation.isPending || !canBook
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-[#0071CE] hover:bg-[#005ba6] cursor-pointer'
          }`}
        >
          {paymentMutation.isPending ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Redirecting to payment...
            </>
          ) : isPriceLoading ? (
            'Getting price...'
          ) : (
            <>
              Book & Pay Now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <div className="h-px bg-gray-300 flex-1" />
          <span className="text-[10px] text-gray-400 font-medium uppercase">Or</span>
          <div className="h-px bg-gray-300 flex-1" />
        </div>

        <a
          href={buildWaUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-12 bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a852] active:scale-[0.98] flex items-center justify-center gap-2.5 rounded-xl transition-all shadow-sm"
        >
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span className="text-white font-bold text-sm">Ask via WhatsApp</span>
        </a>
      </div>

      {/* ── Trust indicators ── */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Secure payment powered by Midtrans
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Instant confirmation after payment
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <svg className="w-3.5 h-3.5 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          Official e-ticket with QR code
        </div>
      </div>
    </div>
  )
}
