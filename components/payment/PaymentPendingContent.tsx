"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClockIcon } from "@/components/assets/Icon/shared";

export default function PaymentPendingContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
          <ClockIcon className="w-10 h-10 text-amber-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Pending</h1>
        <p className="text-gray-500 mb-6">
          Your payment is being processed. Please complete the payment to confirm your booking.
        </p>

        {orderId && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Order ID</p>
            <p className="text-sm font-mono font-bold text-gray-900">{orderId}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link href="/profile" className="w-full py-3 bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold rounded-xl transition text-sm">
            View My Bookings
          </Link>
          <Link href="/" className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
