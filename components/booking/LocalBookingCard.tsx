"use client"

import { useState, useEffect } from "react"
import Calendar from "react-calendar"
import "react-calendar/dist/Calendar.css"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCreatePayment } from "@/utils/hooks/usePayment"
import { formatPrice } from "@/utils/formatPrice"
import type { CurrencyCode } from "@/utils/formatPrice"
import { useCurrency } from "@/utils/hooks/useCurrency"
import CurrencySwitch from "@/components/common/CurrencySwitch"
import { trackBeginCheckout, trackPurchase } from "@/utils/analytics"
import WhatsAppIcon from "../assets/sosmed/WhatsAppIcon"

// ── Config ─────────────────────────────────────────────────────────────
const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890"

// ── Types ──────────────────────────────────────────────────────────────
interface TravelerCount {
  ageBand: string
  label: string
  icon: string
  count: number
  price: number
}

interface LocalBookingCardProps {
  price: number
  title: string
  productCode?: string
  pricingCurrency?: string
  /** Product image for the booking card header */
  image?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "long", year: "numeric" })

const toISODate = (d: Date) => d.toISOString().split("T")[0]

const DEFAULT_TRAVELERS: TravelerCount[] = [
  { ageBand: "ADULT", label: "Adult", icon: "👤", count: 0, price: 0 },
  { ageBand: "CHILD", label: "Child", icon: "🧒", count: 0, price: 0 },
]

// ── Traveler Row ────────────────────────────────────────────────────────

function TravelerRow({
  traveler,
  currency,
  pricingCurrency,
  onIncrement,
  onDecrement,
}: {
  traveler: TravelerCount
  currency: CurrencyCode
  pricingCurrency: string
  onIncrement: () => void
  onDecrement: () => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-lg shrink-0">{traveler.icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800">{traveler.label}</p>
          <p className="text-xs text-gray-400">
            {formatPrice(traveler.price, currency, pricingCurrency as CurrencyCode)} / person
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onDecrement}
          disabled={traveler.count <= 0}
          className={`w-8 h-8 flex items-center justify-center rounded-full text-lg font-bold transition ${traveler.count <= 0
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

export default function LocalBookingCard({
  price,
  title,
  productCode = "LOCAL-TOUR",
  pricingCurrency = "IDR",
  image,
}: LocalBookingCardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { currency } = useCurrency()
  const paymentMutation = useCreatePayment()

  const [date, setDate] = useState<Date | null>(null)
  const [travelers, setTravelers] = useState<TravelerCount[]>(() =>
    DEFAULT_TRAVELERS.map((t) => ({ ...t, price }))
  )

  useEffect(() => {
    setDate(new Date())
  }, [])

  // Update prices when prop changes
  useEffect(() => {
    setTravelers((prev) => prev.map((t) => ({ ...t, price })))
  }, [price])

  const updateCount = (index: number, delta: number) => {
    setTravelers((prev) =>
      prev.map((t, i) =>
        i === index ? { ...t, count: Math.max(0, t.count + delta) } : t
      )
    )
  }

  // ── Derived state ─────────────────────────────────────────────────────
  const totalTravelers = travelers.reduce((sum, t) => sum + t.count, 0)
  const totalPrice = travelers.reduce((sum, t) => sum + t.count * t.price, 0)
  const canBook = !!date && totalTravelers > 0

  // ── WhatsApp ──────────────────────────────────────────────────────────
  const buildWaUrl = () => {
    const selectedDate = date ? fmtDate(date) : "—"
    const travelerLines = travelers
      .filter((t) => t.count > 0)
      .map((t) => `  ${t.label}: ${t.count} pax (${formatPrice(t.price, currency, pricingCurrency as CurrencyCode)}/pp)`)
      .join("\n")

    const lines = [
      "Hello Voyra Bali!",
      "I would like to book the following tour:",
      "",
      `Tour: ${title}`,
      `Date: ${selectedDate}`,
      "Travelers:",
      travelerLines || "  Not specified",
      `Total: ${formatPrice(totalPrice, currency, pricingCurrency as CurrencyCode)}`,
      "",
      "Please confirm, thank you!",
    ]
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`
  }

  // ── Booking handler ───────────────────────────────────────────────────
  const handleBooking = () => {
    if (!session) {
      const currentUrl = typeof window !== "undefined" ? window.location.pathname : "/"
      router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`)
      return
    }
    if (!canBook) return

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
        productImage: image,
        travelDate: toISODate(date!),
        pax: totalTravelers,
        totalPrice,
      },
      {
        onSuccess: (data) => {
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

  return (
    <div className="border border-[#E6E6E6] rounded-2xl overflow-hidden shadow-sm bg-white">
      {/* ── Header with image ── */}
      {image && (
        <div className="relative h-32 overflow-hidden">
          <img src={image} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-white font-bold text-sm leading-tight line-clamp-2 drop-shadow-sm">
              {title}
            </p>
          </div>
        </div>
      )}

      <div className="p-5 sm:p-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-base font-bold text-black truncate pr-2">
            {image ? "Select your trip" : "Booking"}
          </p>
          <CurrencySwitch size="sm" />
        </div>
        <p className="text-gray-400 text-xs mb-5">
          Pick a date, add travelers, and book instantly.
        </p>

        {/* ── Calendar ── */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Select Date
          </p>
          <style>{`
            .local-booking-cal { width: 100%; border: none !important; font-family: inherit; font-size: 13px; }
            .local-booking-cal .react-calendar__tile--active { background: #0071CE !important; color: white !important; border-radius: 8px; }
            .local-booking-cal .react-calendar__tile--now { background: #e0f0ff !important; border-radius: 8px; }
            .local-booking-cal .react-calendar__tile:hover { background: #b3d9ff !important; border-radius: 8px; }
            .local-booking-cal .react-calendar__navigation button:hover { background: #f0f7ff !important; border-radius: 8px; }
            .local-booking-cal .react-calendar__navigation button { font-weight: 700; color: #1a1a1a; font-size: 14px; }
            .local-booking-cal .react-calendar__tile:disabled { background: #f5f5f5; color: #c0c0c0; }
            .local-booking-cal .react-calendar__tile { padding: 8px 4px; }
          `}</style>
          <Calendar
            onChange={(val) => setDate(val as Date)}
            value={date}
            minDate={new Date()}
            locale="en-US"
            className="local-booking-cal"
          />
        </div>

        {/* ── Selected date chip ── */}
        {date && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#0071CE] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-[#0071CE]">{fmtDate(date)}</p>
          </div>
        )}

        {/* ── Travelers ── */}
        <div className="border border-[#E6E6E6] rounded-xl px-4 py-1 mb-4">
          <div className="divide-y divide-gray-100">
            {travelers.map((t, i) => (
              <TravelerRow
                key={t.ageBand}
                traveler={t}
                currency={currency}
                pricingCurrency={pricingCurrency}
                onIncrement={() => updateCount(i, 1)}
                onDecrement={() => updateCount(i, -1)}
              />
            ))}
          </div>
        </div>

        {/* ── Price breakdown & actions ── */}
        <div className="bg-[#F8F8F8] rounded-xl p-4 flex flex-col gap-2.5">
          {/* Line items */}
          {travelers.filter((t) => t.count > 0).map((t) => (
            <div key={t.ageBand} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {t.label} x {t.count}
              </span>
              <span className="text-gray-700 font-medium">
                {formatPrice(t.count * t.price, currency, pricingCurrency as CurrencyCode)}
              </span>
            </div>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="text-sm font-bold text-gray-900">Total</span>
            <span className="text-lg font-black text-gray-900">
              {totalTravelers > 0
                ? formatPrice(totalPrice, currency, pricingCurrency as CurrencyCode)
                : formatPrice(0, currency)}
            </span>
          </div>

          {/* Validation hint */}
          {!canBook && (
            <p className="text-xs text-amber-600 text-center">
              {!date ? "Please select a date" : "Add at least 1 traveler"}
            </p>
          )}

          {/* Payment error */}
          {paymentError && (
            <div className="p-3 bg-red-100 text-red-800 text-sm rounded-lg border border-red-200 font-medium">
              {paymentError}
            </div>
          )}

          {/* Book & Pay button */}
          <button
            onClick={handleBooking}
            disabled={paymentMutation.isPending || !canBook}
            className={`w-full h-12 flex items-center justify-center gap-2 rounded-xl transition-all shadow-md text-white font-bold text-sm active:scale-[0.98] ${paymentMutation.isPending || !canBook
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-[#0071CE] hover:bg-[#005ba6] cursor-pointer"
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
            ) : (
              <>
                Book & Pay Now
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="h-px bg-gray-300 flex-1" />
            <span className="text-[10px] text-gray-400 font-medium uppercase">Or</span>
            <div className="h-px bg-gray-300 flex-1" />
          </div>

          {/* WhatsApp */}
          <a
            href={buildWaUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a852] active:scale-[0.98] flex items-center justify-center gap-2.5 rounded-xl transition-all shadow-sm"
          >
            <WhatsAppIcon className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-sm">Ask via WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  )
}
