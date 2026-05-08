"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { MIDTRANS_SNAP_URL, MIDTRANS_CLIENT_KEY } from "@/lib/config/midtrans";
import { SpinnerIcon, AlertIcon } from "@/components/assets/Icon/shared";
import PriceLabel from "@/components/common/PriceLabel";

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: Record<string, unknown>) => void;
    };
  }
}

interface BookingDetail {
  id: number;
  bookingRef: string;
  productCode: string;
  productTitle: string;
  productImage: string | null;
  travelDate: string;
  pax: number;
  manualPrice: number;
  currency: string;
  leadFirstName: string | null;
  leadLastName: string | null;
  leadEmail: string | null;
  promoCode: string | null;
  status: string;
}

export default function ManualPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const bookingRef = params.bookingRef as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (!bookingRef) return;
    fetch(`/api/bookings/manual/${encodeURIComponent(bookingRef)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBooking(data);
      })
      .catch((err) => {
        toast.error(err.message || "Booking not found");
      })
      .finally(() => setIsLoading(false));
  }, [bookingRef]);

  // Load Midtrans Snap script
  useEffect(() => {
    if (!MIDTRANS_SNAP_URL) return;
    const script = document.createElement("script");
    script.src = MIDTRANS_SNAP_URL;
    script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY);
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  const handlePay = async () => {
    if (!booking || !session) return;
    setIsPaying(true);
    try {
      const res = await fetch("/api/payment/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef: booking.bookingRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate payment");

      window.snap?.pay(data.snapToken, {
        onSuccess: () => router.push("/payment/success"),
        onPending: () => router.push("/payment/pending"),
        onError: () => { toast.error("Payment failed. Please try again."); setIsPaying(false); },
        onClose: async () => {
          setIsPaying(false);
          // Re-fetch booking to reflect any webhook-driven status change (e.g. GoPay scanned on phone)
          try {
            const r = await fetch(`/api/bookings/manual/${encodeURIComponent(bookingRef)}`);
            const updated = await r.json();
            if (!updated.error) setBooking(updated);
          } catch {}
        },
      });
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="w-10 h-10 border-2 border-[#0071CE] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-sm text-gray-500">This payment link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (!booking.manualPrice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertIcon className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Price Not Set Yet</h2>
          <p className="text-sm text-gray-500">
            Our team is preparing your custom price. You will receive a WhatsApp message once it is ready.
          </p>
        </div>
      </div>
    );
  }

  const travelDate = new Date(booking.travelDate).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-24 pb-16 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Payment</h1>
          <p className="text-sm text-gray-500 mt-1">Review your booking and proceed to secure checkout.</p>
        </div>

        {/* Booking Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] overflow-hidden mb-6">
          {booking.productImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={booking.productImage}
              alt={booking.productTitle}
              className="w-full h-48 object-cover"
            />
          )}
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
              <p className="text-base font-bold text-gray-900 leading-snug">{booking.productTitle}</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">{booking.productCode}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Travel Date</p>
                <p className="text-sm font-semibold text-gray-900">{travelDate}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Travelers</p>
                <p className="text-sm font-semibold text-gray-900">{booking.pax} person(s)</p>
              </div>
            </div>

            {(booking.leadFirstName || booking.leadLastName) && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Lead Traveler</p>
                <p className="text-sm font-semibold text-gray-900">
                  {[booking.leadFirstName, booking.leadLastName].filter(Boolean).join(" ")}
                </p>
                {booking.leadEmail && (
                  <p className="text-xs text-gray-500">{booking.leadEmail}</p>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Booking Ref</p>
              <p className="text-xs font-mono text-gray-600">{booking.bookingRef}</p>
            </div>

            {booking.promoCode && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Promo Code:</p>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-mono rounded border border-green-200">
                  {booking.promoCode}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Price Box */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-bold text-gray-700">Total Amount</span>
            <PriceLabel
              amount={Math.round(booking.manualPrice)}
              sourceCurrency="IDR"
              withSecondary
              className="text-2xl font-black text-[#0071CE]"
              secondaryClassName="ml-2 text-sm font-medium text-slate-500 tabular-nums whitespace-nowrap"
            />
          </div>
          <p className="text-xs text-gray-400">
            Charged in IDR via Midtrans. Final price set by our team.
          </p>
        </div>

        {/* Pay Button */}
        {booking.status === "CONFIRMED" || booking.status === "COMPLETED" ? (
          <div className="p-4 bg-green-50 rounded-2xl border border-green-200 text-center">
            <p className="text-sm font-bold text-green-800">Payment Completed</p>
            <p className="text-xs text-green-600 mt-1">Your booking has been paid successfully. Check your profile for updates.</p>
          </div>
        ) : booking.status === "CANCELLED" ? (
          <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-center">
            <p className="text-sm font-bold text-red-800">Booking Cancelled</p>
            <p className="text-xs text-red-600 mt-1">This booking has been cancelled.</p>
          </div>
        ) : (
          <button
            onClick={handlePay}
            disabled={isPaying || !session}
            className="w-full py-4 bg-[#0071CE] hover:bg-[#005ba6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {isPaying ? (
              <>
                <SpinnerIcon className="w-5 h-5" />
                Processing...
              </>
            ) : (
              <>
                <span>💳</span>
                Pay Now
              </>
            )}
          </button>
        )}
        {!session && (
          <p className="text-center text-xs text-red-500 mt-3">
            Please sign in to complete your payment.
          </p>
        )}
      </div>
    </div>
  );
}
