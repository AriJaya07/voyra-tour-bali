"use client"

import { useState, useEffect } from 'react'
import WhatappIcon from '../../assets/sosmed/WhatappIcon'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

// ── Config ─────────────────────────────────────────────────────────────
// Replace with the actual admin WhatsApp number (digits only, no + or spaces)
const WA_NUMBER = "6281234567890"

// ── Props ───────────────────────────────────────────────────────────────
interface BookingUserProps {
    price: number;
    title: string;
}

// ── Formatters ──────────────────────────────────────────────────────────
const fmtIDR = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const fmtDate = (d: Date) =>
    d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// ── Component ───────────────────────────────────────────────────────────
export default function BookingUser({ price, title }: BookingUserProps) {
    const [date, setDate] = useState<Date | null>(null)
    const [quantity, setQuantity] = useState(1)

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
                Pilih tanggal &amp; jumlah, lalu hubungi kami via WhatsApp.
            </p>

            <div className="flex flex-col sm:flex-row gap-6">

                {/* ── Calendar ── */}
                <div className="sm:w-1/2 flex justify-center">
                    {/* Scoped calendar style overrides */}
                    <style>{`
                        .booking-calendar { width: 100%; border: none !important; font-family: inherit; }
                        .booking-calendar .react-calendar__tile--active { background: #25D366 !important; color: white !important; border-radius: 8px; }
                        .booking-calendar .react-calendar__tile--now { background: #e8fdf0 !important; border-radius: 8px; }
                        .booking-calendar .react-calendar__tile:hover { background: #d1fae5 !important; border-radius: 8px; }
                        .booking-calendar .react-calendar__navigation button:hover { background: #f0fdf4 !important; border-radius: 8px; }
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

                    {/* Price Summary + WhatsApp CTA */}
                    <div className="bg-[#F8F8F8] rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                {fmtIDR(price)} × {quantity} orang
                            </span>
                            <span className="text-base font-black text-gray-900">
                                {fmtIDR(total)}
                            </span>
                        </div>

                        {/* WhatsApp button — opens link in new tab */}
                        <a
                            href={buildWaUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-[48px] bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a852] flex items-center justify-center gap-2.5 rounded-xl transition-all shadow-md"
                        >
                            <WhatappIcon />
                            <span className="text-white font-bold text-sm">Pesan via WhatsApp</span>
                        </a>

                        <p className="text-xs text-gray-400 text-center leading-relaxed">
                            Anda akan diarahkan ke WhatsApp dengan pesan booking yang sudah terisi otomatis.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    )
}
