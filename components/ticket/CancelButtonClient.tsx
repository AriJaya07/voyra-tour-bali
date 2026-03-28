"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  fetchCancelQuote,
  cancelBooking,
  fetchCancelReasons,
  type CancelReason,
} from "@/lib/api/viator-client";

interface CancelQuote {
  refundDetails: {
    refundAmount: number;
    currencyCode: string;
  };
  status: string;
}

export default function CancelButtonClient({ bookingRef }: { bookingRef: string; token: string }) {
  const router = useRouter();
  const [isQuoting, setIsQuoting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [quote, setQuote] = useState<CancelQuote | null>(null);

  const [reasons, setReasons] = useState<CancelReason[]>([]);
  const [selectedReason, setSelectedReason] = useState("");

  // Load cancel reasons once
  useEffect(() => {
    fetchCancelReasons().then((data) => {
      setReasons(data);
      if (data.length > 0) setSelectedReason(data[0].reasonCode);
    });
  }, []);

  const handleGetQuote = async () => {
    try {
      setIsQuoting(true);
      const data = await fetchCancelQuote(bookingRef);
      if (data.refundDetails) {
        setQuote(data);
      } else {
        toast.error("Could not get cancellation quote.");
      }
    } catch {
      toast.error("Error fetching cancellation quote.");
    } finally {
      setIsQuoting(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedReason) {
      toast.warning("Please select a cancellation reason.");
      return;
    }

    try {
      setIsCancelling(true);
      const data = await cancelBooking(bookingRef, selectedReason);
      if (data.status) {
        toast.success("Booking cancelled successfully.");
        router.refresh();
      } else {
        toast.error("Failed to cancel booking.");
      }
    } catch {
      toast.error("Error cancelling booking. Please try again.");
    } finally {
      setIsCancelling(false);
      setQuote(null);
    }
  };

  if (!bookingRef) return null;

  return (
    <div className="mt-4">
      {quote ? (
        <div className="bg-red-50 p-4 rounded-xl text-center border border-red-100">
          <h3 className="font-bold text-red-700 mb-2">Cancel Booking?</h3>
          <p className="text-sm text-red-600 mb-3">
            If you cancel now, your refund will be <strong>{quote.refundDetails.refundAmount} {quote.refundDetails.currencyCode}</strong>.
          </p>

          {/* Reason selector */}
          {reasons.length > 0 && (
            <div className="mb-4 text-left">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Reason
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 bg-white"
              >
                {reasons.map((r) => (
                  <option key={r.reasonCode} value={r.reasonCode}>
                    {r.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setQuote(null)}
              disabled={isCancelling}
              className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition"
            >
              Keep Booking
            </button>
            <button
              onClick={handleCancel}
              disabled={isCancelling || !selectedReason}
              className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-60"
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleGetQuote}
          disabled={isQuoting}
          className="w-full text-center py-3 bg-red-100 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-200 transition"
        >
          {isQuoting ? "Checking Policy..." : "Request Cancellation"}
        </button>
      )}
    </div>
  );
}
