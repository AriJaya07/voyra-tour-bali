"use client"

import { useState, useEffect } from 'react'
import WhatappIcon from '../../assets/sosmed/WhatappIcon'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCreatePayment } from '@/utils/hooks/usePayment'
import { formatPrice } from '@/utils/formatPrice'
import { useCurrency } from '@/utils/hooks/useCurrency'
import CurrencySwitch from '@/components/common/CurrencySwitch'

// ── Config ─────────────────────────────────────────────────────────────
const WA_NUMBER = "6281234567890"

// ── Props ───────────────────────────────────────────────────────────────
interface BookingUserProps {
    price: number;
    title: string;
    productCode?: string;
}

const fmtDate = (d: Date) =>
    d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// ── Component ───────────────────────────────────────────────────────────
export default function BookingUser({ price, title, productCode = 'VTR-BALI-1' }: BookingUserProps) {
    const { data: session } = useSession()
    const router = useRouter()
    const { currency } = useCurrency()

    const [date, setDate] = useState<Date | null>(null)
    const [quantity, setQuantity] = useState(1)

    const paymentMutation = useCreatePayment()

    // Initialise date client-side to avoid SSR hydration mismatch
    useEffect(() => { setDate(new Date()) }, [])

    const total = price * quantity

    /** Build a WhatsApp deep-link with a pre-filled booking message */
    const buildWaUrl = () => {
        const selectedDate = date ? fmtDate(date) : "—"
        const lines = [
            `Hello Voyra Bali!`,
            `I would like to book the following tour ticket:`,
            ``,
            `Destination: ${title}`,
            `Date: ${selectedDate}`,
            `Guests: ${quantity} person(s)`,
            `Total Price: ${formatPrice(total, currency)}`,
            ``,
            `Please confirm, thank you!`,
        ]
        return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`
    }

    const handleBooking = async () => {
      if (!session) {
        const currentUrl = typeof window !== "undefined" ? window.location.pathname : "/";
        router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
        return;
      }

      if (!date) return;

      paymentMutation.mutate(
        {
          productCode,
          productTitle: title,
          travelDate: date.toISOString().split('T')[0],
          pax: quantity,
          totalPrice: total,
        },
        {
          onSuccess: (data) => {
            // Redirect to Midtrans payment page
            window.location.href = data.redirectUrl;
          },
        }
      );
    };

    const paymentError = paymentMutation.isError
      ? paymentMutation.error?.message || "A system error occurred while processing your booking."
      : null;

    return (
        <div className="border border-[#E6E6E6] rounded-[16px] p-6 my-[88px] shadow-sm">

            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-2">
                <p className="text-[16px] font-bold text-black truncate">{title} · Booking</p>
                <div className="flex items-center gap-2">
                    <CurrencySwitch size="sm" />
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                        Available
                    </span>
                </div>
            </div>

            <p className="text-gray-400 text-sm mb-6">
                Select a date &amp; number of guests to book this tour.
            </p>

            <div className="flex flex-col sm:flex-row gap-6">

                {/* ── Calendar ── */}
                <div className="sm:w-1/2 flex justify-center">
                    <style>{`
                        .booking-calendar { width: 100%; border: none !important; font-family: inherit; }
                        .booking-calendar .react-calendar__tile--active { background: #0071CE !important; color: white !important; border-radius: 8px; }
                        .booking-calendar .react-calendar__tile--now { background: #e0f0ff !important; border-radius: 8px; }
                        .booking-calendar .react-calendar__tile:hover { background: #b3d9ff !important; border-radius: 8px; }
                        .booking-calendar .react-calendar__navigation button:hover { background: #f0f7ff !important; border-radius: 8px; }
                        .booking-calendar .react-calendar__navigation button { font-weight: 700; color: #1a1a1a; }
                        .booking-calendar .react-calendar__tile:disabled { background: #f5f5f5; color: #c0c0c0; }
                    `}</style>
                    <Calendar
                        onChange={(val) => setDate(val as Date)}
                        value={date}
                        minDate={new Date()}
                        className="booking-calendar"
                    />
                </div>

                {/* ── Right panel ── */}
                <div className="sm:w-1/2 flex flex-col gap-4">

                    {/* Quantity Selector */}
                    <div className="border border-[#E6E6E6] rounded-xl p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Number of Guests</p>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm">Adult</span>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg transition cursor-pointer"
                                    aria-label="Decrease"
                                >
                                    −
                                </button>
                                <span className="text-lg font-bold text-gray-900 w-6 text-center select-none">
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity(q => q + 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg transition cursor-pointer"
                                    aria-label="Increase"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Selected Date Display */}
                    <div className="border border-[#E6E6E6] rounded-xl p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Selected Date</p>
                        <p className="text-sm text-gray-500">
                            {date ? fmtDate(date) : "—"}
                        </p>
                    </div>

                    {/* Price Summary + CTAs */}
                    <div className="bg-[#F8F8F8] rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">
                                {formatPrice(price, currency)} × {quantity}
                            </span>
                            <span className="text-base font-black text-gray-900">
                                {formatPrice(total, currency)}
                            </span>
                        </div>

                        {paymentError && (
                          <div className="p-3 bg-red-100 text-red-800 text-sm rounded-lg border border-red-200 font-medium">
                            {paymentError}
                          </div>
                        )}

                        <button
                            onClick={handleBooking}
                            disabled={paymentMutation.isPending || !date}
                            className={`w-full h-[48px] flex items-center justify-center gap-2.5 rounded-xl transition-all shadow-md text-white font-bold text-sm ${
                              paymentMutation.isPending || !date
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 cursor-pointer'
                            }`}
                        >
                            {paymentMutation.isPending ? 'Redirecting to payment...' : 'Book & Pay Now'}
                        </button>

                        <div className="flex items-center gap-2">
                          <div className="h-px bg-gray-300 flex-1"></div>
                          <span className="text-xs text-gray-400 font-medium uppercase">Or</span>
                          <div className="h-px bg-gray-300 flex-1"></div>
                        </div>

                        <a
                            href={buildWaUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-[48px] bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a852] flex items-center justify-center gap-2.5 rounded-xl transition-all shadow-md"
                        >
                            <WhatappIcon />
                            <span className="text-white font-bold text-sm">Ask via WhatsApp</span>
                        </a>
                    </div>

                </div>
            </div>
        </div>
    )
}
