"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const transactionStatus = searchParams.get("transaction_status") || "settlement";

  // Fetch the booking to get ticketToken (webhook may have already set it)
  const { data: bookings } = useQuery<any[]>({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const { data } = await api.get("/bookings");
      return data;
    },
    staleTime: 0,
  });

  // Find the booking matching this order
  const booking = bookings?.find((b: any) => b.paymentId === orderId);
  const ticketToken = booking?.ticketToken;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-500 mb-6">
          Your booking has been confirmed. Check your email for your e-ticket with QR code.
        </p>

        {orderId && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Order ID</p>
            <p className="text-sm font-mono font-bold text-gray-900">{orderId}</p>
            <p className="text-xs text-gray-400 mt-1 capitalize">
              Status: {transactionStatus.replace(/_/g, " ")}
            </p>
          </div>
        )}

        {/* Booking steps confirmation */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-bold text-blue-700 uppercase mb-3">What happens next</p>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <p className="text-xs text-gray-700">Payment confirmed</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <p className="text-xs text-gray-700">Confirmation email sent with e-ticket</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <p className="text-xs text-gray-700">Show QR code at destination for entry</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
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

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
