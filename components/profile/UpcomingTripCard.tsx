"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OptimizedImage from "@/components/common/OptimizedImage";
import type { Booking } from "@/types/booking";

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";

interface Props {
  bookings: Booking[];
  onViewTicket: (b: Booking) => void;
}

function dayDiff(target: Date) {
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function UpcomingTripCard({ bookings, onViewTicket }: Props) {
  const next = bookings
    .filter((b) => b.status === "COMPLETED" || b.status === "CONFIRMED")
    .filter((b) => dayDiff(new Date(b.travelDate)) >= 0)
    .sort((a, b) => new Date(a.travelDate).getTime() - new Date(b.travelDate).getTime())[0];

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  if (!next) return null;

  const days = dayDiff(new Date(next.travelDate));
  const isToday = days === 0;
  const isTomorrow = days === 1;

  const headlineLabel = isToday
    ? "Your trip is TODAY 🎉"
    : isTomorrow
    ? "Your trip is TOMORROW"
    : `Your next trip is in ${days} day${days === 1 ? "" : "s"}`;

  const dateStr = new Date(next.travelDate).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    `Hi, I have a question about booking ${next.bookingRef}`
  )}`;

  // Avoid SSR/CSR mismatch on the live "now" stamp
  const ariaTimeNow = new Date(now).toISOString();

  return (
    <div className="bg-gradient-to-br from-[#0071CE] to-[#005ba6] rounded-3xl shadow-lg overflow-hidden mb-8 text-white">
      <div className="px-6 sm:px-8 pt-6 pb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-100">{headlineLabel}</p>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-semibold">{next.status}</span>
      </div>

      <div className="px-6 sm:px-8 pb-6 pt-2 flex flex-col sm:flex-row gap-5">
        <div className="relative w-full sm:w-32 h-32 rounded-2xl overflow-hidden bg-white/10 shrink-0">
          {next.productImage ? (
            <OptimizedImage
              src={next.productImage}
              alt={next.productTitle}
              fill
              sizes="(max-width: 640px) 100vw, 128px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400/30 to-blue-600/30" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-black leading-tight mb-1">{next.productTitle}</h2>
          <p className="text-sm text-blue-100 mb-3" suppressHydrationWarning data-now={ariaTimeNow}>
            📅 {dateStr}
            {next.travelTime ? ` · ${next.travelTime}` : ""}
          </p>
          {next.meetingPoint && (
            <p className="text-sm text-blue-100 mb-3 flex items-start gap-2">
              <span className="shrink-0">📍</span>
              <span className="line-clamp-2">{next.meetingPoint}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {next.status === "COMPLETED" && next.ticketToken && (
              <button
                onClick={() => onViewTicket(next)}
                className="px-4 py-2.5 bg-white text-[#0071CE] text-sm font-bold rounded-xl hover:bg-blue-50 transition shadow-sm"
              >
                View Ticket & QR
              </button>
            )}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-[#25D366] text-white text-sm font-bold rounded-xl hover:bg-[#1ebe5b] transition shadow-sm flex items-center gap-2"
            >
              WhatsApp Support
            </a>
            <Link
              href="#my-bookings"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition"
            >
              All bookings
            </Link>
          </div>
        </div>
      </div>

      {(isToday || isTomorrow) && (
        <div className="bg-amber-400/20 backdrop-blur-sm px-6 sm:px-8 py-3 border-t border-white/10">
          <p className="text-xs sm:text-sm text-amber-50">
            {isToday
              ? "💡 Show your QR code at the meeting point. Arrive 15 minutes early."
              : "💡 Pack sunscreen, water, and comfortable shoes. Check the weather tonight."}
          </p>
        </div>
      )}
    </div>
  );
}
