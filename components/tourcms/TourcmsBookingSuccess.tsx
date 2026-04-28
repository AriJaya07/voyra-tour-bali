"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import api from "@/lib/axios";

interface BookingShape {
  id: number;
  status: string;
  bookingRef: string;
  ticketToken: string | null;
  productTitle: string;
}

export default function TourcmsBookingSuccess() {
  const sp = useSearchParams();
  const orderId = sp.get("orderId") || "";
  const [booking, setBooking] = useState<BookingShape | null>(null);
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get(
          `/tourcms/bookings/by-order/${encodeURIComponent(orderId)}`
        );
        if (!cancelled) {
          setBooking(res.data);
          if (
            ["CONFIRMED", "COMPLETED", "CANCELLED"].includes(res.data.status)
          ) {
            setDone(true);
          }
        }
      } catch {
        if (!cancelled) setTries((t) => t + 1);
      }
    }
    load();
    const interval = setInterval(() => {
      if (!done && tries < 20) load();
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId, done, tries]);

  return (
    <div className="max-w-xl mx-auto py-16 text-center">
      <h1 className="text-2xl font-bold mb-3">Thanks for your booking!</h1>
      <p className="text-gray-600 mb-6">
        We&apos;re confirming your TourCMS reservation. This page updates
        automatically.
      </p>

      <div className="border rounded-xl p-6 bg-white shadow-sm">
        <div className="text-sm text-gray-500 mb-2">Order</div>
        <div className="font-bold mb-4">{orderId}</div>

        <div className="text-sm text-gray-500 mb-1">Status</div>
        <div className="text-lg font-bold mb-4">
          {booking?.status || "Checking…"}
        </div>

        {booking?.ticketToken && (
          <Link
            href={`/tourcms/ticket/${booking.ticketToken}`}
            className="inline-block px-6 py-3 bg-[#0071CE] text-white rounded-xl font-bold"
          >
            View ticket
          </Link>
        )}

        {!done && tries >= 20 && (
          <div className="text-xs text-amber-600 mt-3">
            Still confirming. You&apos;ll receive an email once your booking is
            ready. You may safely close this page.
          </div>
        )}
      </div>
    </div>
  );
}
