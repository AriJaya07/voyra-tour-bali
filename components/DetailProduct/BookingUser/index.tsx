"use client"

import { useState, useEffect, useMemo } from 'react'
import WhatappIcon from '../../assets/sosmed/WhatappIcon'
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

// ── Config ─────────────────────────────────────────────────────────────
const WA_NUMBER = "6281234567890"

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
          window.location.href = data.redirectUrl
        },
      }
    )
  }

  const paymentError = paymentMutation.isError
    ? paymentMutation.error?.message || "A system error occurred while processing your booking."
    : null

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
          className={`w-full h-12 flex items-center justify-center gap-2 rounded-xl transition-all shadow-md text-white font-bold text-sm ${
            paymentMutation.isPending || !canBook
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 cursor-pointer'
          }`}
        >
          {paymentMutation.isPending
            ? 'Redirecting to payment...'
            : isPriceLoading
              ? 'Getting price...'
              : 'Book & Pay Now'
          }
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
          className="w-full h-12 bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a852] flex items-center justify-center gap-2 rounded-xl transition-all shadow-md"
        >
          <WhatappIcon />
          <span className="text-white font-bold text-sm">Ask via WhatsApp</span>
        </a>
      </div>
    </div>
  )
}
