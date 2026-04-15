"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { Booking } from "@/types/booking";
import { CheckmarkIcon } from "@/components/assets/Icon/shared";

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const transactionStatus = searchParams.get("transaction_status") || "settlement";

  const isPending = transactionStatus === "pending";

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const { data } = await api.get("/bookings");
      return data;
    },
    staleTime: 0,
    refetchInterval: 5000, // Poll every 5s to catch webhook updates
  });

  const booking = bookings?.find((b) => b.paymentId === orderId);
  const ticketToken = booking?.ticketToken;
  const viatorRef = (booking as any)?.viatorBookingRef;
  const voucherUrl = (booking as any)?.viatorVoucherUrl;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${isPending ? "bg-yellow-100" : "bg-green-100"}`}>
          {isPending ? (
            <svg className="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <CheckmarkIcon className="w-10 h-10 text-green-500" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isPending ? "Waiting for Payment" : "Payment Successful!"}
        </h1>
        <p className="text-gray-500 mb-6">
          {isPending
            ? "Please complete your payment via the method you selected. Check your email for payment instructions."
            : "Your booking is being confirmed with the supplier. Check your email for your e-ticket."}
        </p>

        {orderId && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Order ID</p>
            <p className="text-sm font-mono font-bold text-gray-900">{orderId}</p>
            <p className="text-xs text-gray-400 mt-1 capitalize">
              Payment: {transactionStatus.replace(/_/g, " ")}
            </p>
          </div>
        )}

        {/* Viator Booking Status */}
        {booking && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Booking Details</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Tour</span>
                <span className="text-xs font-bold text-gray-900 text-right max-w-[60%] truncate">
                  {booking.productTitle}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Date</span>
                <span className="text-xs font-bold text-gray-900">
                  {new Date(booking.travelDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Travelers</span>
                <span className="text-xs font-bold text-gray-900">{booking.pax} pax</span>
              </div>
              {viatorRef && (
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Supplier Ref</span>
                  <span className="text-xs font-bold text-green-600">{viatorRef}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Status</span>
                <span className={`text-xs font-bold ${booking.status === "CONFIRMED" ? "text-green-600" : "text-yellow-600"}`}>
                  {booking.status === "CONFIRMED" ? "Confirmed" : "Processing..."}
                </span>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0071CE] border-t-transparent" />
            <span className="text-sm text-gray-500">Loading booking details...</span>
          </div>
        )}

        {/* What happens next */}
        <div className={`${isPending ? "bg-yellow-50" : "bg-blue-50"} rounded-xl p-4 mb-6 text-left`}>
          <p className={`text-xs font-bold uppercase mb-3 ${isPending ? "text-yellow-700" : "text-blue-700"}`}>What happens next</p>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className={`w-5 h-5 rounded-full ${isPending ? "bg-yellow-400 animate-pulse" : "bg-green-500"} text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>1</span>
              <p className="text-xs text-gray-700">
                {isPending ? "Complete your payment (check email for instructions)" : "Payment confirmed"}
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className={`w-5 h-5 rounded-full ${!isPending && viatorRef ? "bg-green-500" : !isPending ? "bg-blue-500 animate-pulse" : "bg-gray-300"} text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>2</span>
              <p className="text-xs text-gray-700">
                {!isPending && viatorRef ? "Booking confirmed with supplier" : "Confirming with supplier..."}
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className={`w-5 h-5 rounded-full ${ticketToken ? "bg-green-500" : "bg-gray-300"} text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>3</span>
              <p className="text-xs text-gray-700">E-ticket & voucher sent to your email</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-gray-300 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
              <p className="text-xs text-gray-700">Show QR code or voucher at destination</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {voucherUrl && (
            <a
              href={voucherUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Voucher (PDF)
            </a>
          )}
          {ticketToken && (
            <Link
              href={`/ticket/${ticketToken}`}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition text-sm"
            >
              View My Ticket & QR Code
            </Link>
          )}
          <Link
            href="/profile"
            className="w-full py-3 bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold rounded-xl transition text-sm"
          >
            View My Bookings
          </Link>
          <Link
            href="/"
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-sm"
          >
            Explore More Tours
          </Link>
        </div>
      </div>
    </div>
  );
}
