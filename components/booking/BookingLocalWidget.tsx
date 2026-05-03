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
import { trackBeginCheckout } from "@/utils/analytics"
import WhatsAppIcon from "../assets/sosmed/WhatsAppIcon"
import VoryaIcon from "../assets/Icon/VoyraIcon"
import { CalendarIcon, CheckmarkIcon, SpinnerIcon, LockIcon } from "@/components/assets/Icon/shared"

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890"

// ── Types ──────────────────────────────────────────────────────────────

interface Traveler {
  ageBand: string
  label: string
  icon: string
  count: number
  price: number
}

interface BookingLocalWidgetProps {
  price: number
  title: string
  productCode?: string
  pricingCurrency?: string
  image?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "long", year: "numeric" })

const toISODate = (d: Date) => d.toISOString().split("T")[0]

// ── Traveler Row ────────────────────────────────────────────────────────

function TravelerRow({
  traveler,
  currency,
  pricingCurrency,
  onIncrement,
  onDecrement,
}: {
  traveler: Traveler
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

export default function BookingLocalWidget({
  price,
  title,
  productCode = "LOCAL-TOUR",
  pricingCurrency = "IDR",
  image,
}: BookingLocalWidgetProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { currency } = useCurrency()
  const paymentMutation = useCreatePayment()

  const [date, setDate] = useState<Date | null>(null)
  const [travelers, setTravelers] = useState<Traveler[]>([
    { ageBand: "ADULT", label: "Adult", icon: "👤", count: 0, price },
    { ageBand: "CHILD", label: "Child", icon: "🧒", count: 0, price },
  ])

  useEffect(() => { setDate(new Date()) }, [])
  useEffect(() => { setTravelers((prev) => prev.map((t) => ({ ...t, price }))) }, [price])

  const updateCount = (index: number, delta: number) => {
    setTravelers((prev) =>
      prev.map((t, i) => i === index ? { ...t, count: Math.max(0, t.count + delta) } : t)
    )
  }

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

  // ── Booking handler → Midtrans ────────────────────────────────────────
  const handleBooking = () => {
    if (!session) {
      const currentUrl = typeof window !== "undefined" ? window.location.pathname : "/"
      router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`)
      return
    }
    if (!canBook) return

    trackBeginCheckout({ productCode, title, price: totalPrice, currency: pricingCurrency, travelers: totalTravelers })

    paymentMutation.mutate(
      {
        source: "local",
        productCode,
        productTitle: title,
        productImage: image,
        travelDate: toISODate(date!),
        pax: totalTravelers,
        totalPrice,
        currency: pricingCurrency,
      },
      {
        onSuccess: (data) => {
          // purchase event fires from /booking-success once payment confirmed.
          window.location.href = data.redirectUrl
        },
      }
    )
  }

  const paymentError = paymentMutation.isError
    ? paymentMutation.error?.message || "A system error occurred while processing your booking."
    : null

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="border border-[#E6E6E6] rounded-2xl overflow-hidden shadow-sm bg-white">
      {!session ? (
        /* Clean Flow Login Prompt */
        <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 h-[350px]">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <VoryaIcon className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">Login Required</h3>
          <p className="text-sm text-gray-500 mb-8 text-center italic max-w-[240px] mx-auto leading-relaxed">
            Please login to check availability, see prices, and book your tour.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full max-w-[260px] py-4 bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold rounded-xl transition shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-2"
          >
            Login to Continue
          </button>
        </div>
      ) : (
        <>
          {/* Header image */}
          {image && (
            <div className="relative h-32 overflow-hidden">
              <img src={image} alt={title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="text-white font-bold text-sm leading-tight line-clamp-2 drop-shadow-sm">{title}</p>
              </div>
            </div>
          )}

          <div className="p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <p className="text-base font-bold text-black truncate pr-2">
                {image ? "Select your trip" : "Booking"}
              </p>
              <CurrencySwitch size="sm" />
            </div>
            <p className="text-gray-400 text-xs mb-5">Pick a date, add travelers, and book instantly.</p>

            {/* Calendar */}
            <div className="mb-5">
              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-[#0071CE]" />
                Select Date
              </p>
              <style>{`
                .local-widget-cal { width: 100%; border: none !important; font-family: inherit; font-size: 13px; }
                .local-widget-cal .react-calendar__tile--active { background: #0071CE !important; color: white !important; border-radius: 8px; }
                .local-widget-cal .react-calendar__tile--now { background: #e0f0ff !important; border-radius: 8px; }
                .local-widget-cal .react-calendar__tile:hover { background: #b3d9ff !important; border-radius: 8px; }
                .local-widget-cal .react-calendar__navigation button:hover { background: #f0f7ff !important; border-radius: 8px; }
                .local-widget-cal .react-calendar__navigation button { font-weight: 700; color: #1a1a1a; font-size: 14px; }
                .local-widget-cal .react-calendar__tile:disabled { background: #f5f5f5; color: #c0c0c0; }
                .local-widget-cal .react-calendar__tile { padding: 8px 4px; }
              `}</style>
              <Calendar
                onChange={(val) => setDate(val as Date)}
                value={date}
                minDate={new Date()}
                locale="en-US"
                className="local-widget-cal"
              />
            </div>

            {/* Selected date */}
            {date && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
                <CheckmarkIcon className="w-4 h-4 text-[#0071CE] shrink-0" />
                <p className="text-sm font-medium text-[#0071CE]">{fmtDate(date)}</p>
              </div>
            )}

            {/* Travelers */}
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

            {/* Price breakdown & actions */}
            <div className="bg-[#F8F8F8] rounded-xl p-4 flex flex-col gap-2.5">
              {travelers.filter((t) => t.count > 0).map((t) => (
                <div key={t.ageBand} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t.label} x {t.count}</span>
                  <span className="text-gray-700 font-medium">
                    {formatPrice(t.count * t.price, currency, pricingCurrency as CurrencyCode)}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-lg font-black text-gray-900">
                  {totalTravelers > 0
                    ? formatPrice(totalPrice, currency, pricingCurrency as CurrencyCode)
                    : formatPrice(0, currency)}
                </span>
              </div>

              {!canBook && (
                <p className="text-xs text-amber-600 text-center">
                  {!date ? "Please select a date" : "Add at least 1 traveler"}
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
                className={`w-full h-12 flex items-center justify-center gap-2 rounded-xl transition-all shadow-md text-white font-bold text-sm active:scale-[0.98] ${paymentMutation.isPending || !canBook
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-[#0071CE] hover:bg-[#005ba6] cursor-pointer"
                  }`}
              >
                {paymentMutation.isPending ? (
                  <>
                    <SpinnerIcon className="w-4 h-4" />
                    Redirecting to payment...
                  </>
                ) : (
                  <>
                    Book & Pay Now
                    <LockIcon className="w-4 h-4" />
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
                <WhatsAppIcon className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-sm">Ask via WhatsApp</span>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
