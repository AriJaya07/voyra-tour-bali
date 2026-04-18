"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MIDTRANS_SNAP_URL, MIDTRANS_CLIENT_KEY } from "@/lib/config/midtrans";
import type { Booking } from "@/types/booking";
import { SpinnerIcon } from "@/components/assets/Icon/shared";

interface PayNowButtonProps {
  booking: Booking;
  className?: string;
}

/**
 * Pay Now button that handles payment routing:
 *
 * - Midtrans gateway: Local PENDING with snapToken → opens Midtrans Snap popup
 * - Mock PAYMENT with manualPrice → links to /payment/manual/[ref]
 */
export default function PayNowButton({ booking, className = "" }: PayNowButtonProps) {
  const [paying, setPaying] = useState(false);
  const currency = booking.currency || "IDR";

  const isLocalPending = booking.status === "PENDING" && booking.snapToken && !booking.isMockMode;
  const isMockPayment = (booking.status === "PAYMENT" || booking.status === "PENDING") && booking.manualPrice && booking.isMockMode;

  // Load Midtrans Snap script for local bookings
  useEffect(() => {
    if (!isLocalPending || !MIDTRANS_SNAP_URL) return;

    const existing = document.querySelector(`script[src="${MIDTRANS_SNAP_URL}"]`);
    if (existing) return;

    const script = document.createElement("script");
    script.src = MIDTRANS_SNAP_URL;
    script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY);
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, [isLocalPending]);

  if (!isLocalPending && !isMockPayment) return null;

  // Mock booking → link to manual payment page
  if (isMockPayment) {
    return (
      <Link
        href={`/payment/manual/${booking.bookingRef}`}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-lg transition shadow-sm active:scale-[0.98] ${className}`}
      >
        💳 Pay Now — {currency} {booking.manualPrice!.toLocaleString()}
      </Link>
    );
  }

  // Midtrans gateway → open Snap popup
  const handleSnapPay = () => {
    if (!booking.snapToken) return;
    setPaying(true);

    const w = window as any;
    if (w.snap) {
      w.snap.pay(booking.snapToken, {
        onSuccess: () => window.location.reload(),
        onPending: () => { setPaying(false); window.location.reload(); },
        onError: () => setPaying(false),
        onClose: () => { setPaying(false); window.location.reload(); },
      });
    } else {
      setPaying(false);
    }
  };

  return (
    <button
      onClick={handleSnapPay}
      disabled={paying}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] disabled:bg-gray-300 text-white font-bold text-sm rounded-lg transition shadow-sm active:scale-[0.98] ${className}`}
    >
      {paying ? (
        <>
          <SpinnerIcon className="w-4 h-4" />
          Processing...
        </>
      ) : (
        <>
          💳 Pay Now — {currency} {booking.totalPrice.toLocaleString()}
        </>
      )}
    </button>
  );
}
