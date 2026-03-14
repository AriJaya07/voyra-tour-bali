"use client"

import { useState, useEffect } from 'react'
import axios from 'axios'
import WhatappIcon from '../../assets/sosmed/WhatappIcon'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// ── Config ─────────────────────────────────────────────────────────────
const WA_NUMBER = "6281234567890"

// ── Props ───────────────────────────────────────────────────────────────
interface BookingUserProps {
    price: number;
    title: string;
    productCode?: string; // We'll add this to support Viator booking
}

// ── Formatters ──────────────────────────────────────────────────────────
const fmtIDR = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const fmtDate = (d: Date) =>
    d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// ── Component ───────────────────────────────────────────────────────────
export default function BookingUser({ price, title, productCode = 'VTR-BALI-1' }: BookingUserProps) {
    const { data: session } = useSession()
    const router = useRouter()
    
    const [date, setDate] = useState<Date | null>(null)
    const [quantity, setQuantity] = useState(1)
    
    // Viator booking state
    const [isBooking, setIsBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
    const [bookingError, setBookingError] = useState<string | null>(null);

    // Initialise date client-side to avoid SSR hydration mismatch
    useEffect(() => { setDate(new Date()) }, [])

    const total = price * quantity

    /** Build a WhatsApp deep-link with a pre-filled booking message */
    const buildWaUrl = () => {
        const selectedDate = date ? fmtDate(date) : "—"
        const lines = [
            `Halo Voyra Bali! 👋`,
            `Saya ingin memesan tiket wisata berikut:`,
            ``,
            `🏝 *Destinasi:* ${title}`,
            `📅 *Tanggal:* ${selectedDate}`,
            `👤 *Jumlah:* ${quantity} orang`,
            `💰 *Total Harga:* ${fmtIDR(total)}`,
            ``,
            `Mohon konfirmasinya, terima kasih! 🙏`,
        ]
        return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`
    }

    // Direct API Booking using our Viator Proxy Route
    const handleViatorBooking = async () => {
      // REQUIRE LOGIN
      if (!session) {
        const currentUrl = typeof window !== "undefined" ? window.location.pathname : "/";
        router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
        return;
      }

      if (!date) {
        setBookingError("Harap pilih tanggal terlebih dahulu.");
        return;
      }
      
      setIsBooking(true);
      setBookingError(null);
      setBookingSuccess(null);

      try {
        const response = await axios.post('/api/viator?action=book', {
          productCode,
          productTitle: title,
          travelDate: date.toISOString().split('T')[0],
          pax: quantity,
          totalPrice: total
        });
        
        if (response.data.status === 'SUCCESS' || response.data.bookingRef) {
          setBookingSuccess(`Booking berhasil! Ref: ${response.data.bookingRef || response.data.orderId}`);
        } else {
          setBookingError("Gagal melakukan booking. Silakan coba lagi.");
        }
      } catch (err: any) {
        console.error("Booking error", err);
        setBookingError(err.response?.data?.details || "Terjadi kesalahan sistem saat mencoba booking.");
      } finally {
        setIsBooking(false);
      }
    };

    return (
        <div className="border border-[#E6E6E6] rounded-[16px] p-6 mt-[88px] shadow-sm">

            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-2">
                <p className="text-[16px] font-bold text-black truncate">{title} · Booking</p>
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                    ✅ Tersedia
                </span>
            </div>

            <p className="text-gray-400 text-sm mb-6">
                Pilih tanggal &amp; jumlah orang untuk memesan tiket wisata ini.
            </p>

            <div className="flex flex-col sm:flex-row gap-6">

                {/* ── Calendar ── */}
                <div className="sm:w-1/2 flex justify-center">
                    {/* Scoped calendar style overrides */}
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
                        <p className="text-sm font-semibold text-gray-700 mb-3">Jumlah Orang</p>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm">Dewasa</span>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg transition cursor-pointer"
                                    aria-label="Kurangi"
                                >
                                    −
                                </button>
                                <span className="text-lg font-bold text-gray-900 w-6 text-center select-none">
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity(q => q + 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg transition cursor-pointer"
                                    aria-label="Tambah"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Selected Date Display */}
                    <div className="border border-[#E6E6E6] rounded-xl p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Tanggal Dipilih</p>
                        <p className="text-sm text-gray-500">
                            {date ? fmtDate(date) : "—"}
                        </p>
                    </div>

                    {/* Price Summary + CTAs */}
                    <div className="bg-[#F8F8F8] rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">
                                {fmtIDR(price)} × {quantity}
                            </span>
                            <span className="text-base font-black text-gray-900">
                                {fmtIDR(total)}
                            </span>
                        </div>

                        {/* Status Messages for Viator Booking */}
                        {bookingSuccess && (
                          <div className="p-3 bg-green-100 text-green-800 text-sm rounded-lg border border-green-200 font-medium">
                            {bookingSuccess}
                          </div>
                        )}
                        {bookingError && (
                          <div className="p-3 bg-red-100 text-red-800 text-sm rounded-lg border border-red-200 font-medium">
                            {bookingError}
                          </div>
                        )}

                        {/* Viator Direct API Booking Button */}
                        <button
                            onClick={handleViatorBooking}
                            disabled={isBooking || !date}
                            className={`w-full h-[48px] flex items-center justify-center gap-2.5 rounded-xl transition-all shadow-md text-white font-bold text-sm ${
                              isBooking || !date 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-[#0071CE] hover:bg-[#005ba6] active:bg-[#004780] cursor-pointer'
                            }`}
                        >
                            {isBooking ? 'Memproses...' : 'Booking Langsung'}
                        </button>

                        <div className="flex items-center gap-2">
                          <div className="h-px bg-gray-300 flex-1"></div>
                          <span className="text-xs text-gray-400 font-medium uppercase">Atau</span>
                          <div className="h-px bg-gray-300 flex-1"></div>
                        </div>

                        {/* WhatsApp button */}
                        <a
                            href={buildWaUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-[48px] bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a852] flex items-center justify-center gap-2.5 rounded-xl transition-all shadow-md"
                        >
                            <WhatappIcon />
                            <span className="text-white font-bold text-sm">Tanya via WhatsApp</span>
                        </a>
                    </div>

                </div>
            </div>
        </div>
    )
}
