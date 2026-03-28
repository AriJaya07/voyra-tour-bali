import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { Booking } from "@/types/booking";
import {
  fetchCancelQuote,
  cancelBooking,
  updateBookingStatus,
  fetchCancelReasons,
  type CancelReason,
} from "@/lib/api/viator-client";

interface CancelModalProps {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CancelModal({ booking, onClose, onSuccess }: CancelModalProps) {
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [quote, setQuote] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cancel reasons from Viator API
  const [reasons, setReasons] = useState<CancelReason[]>([]);
  const [selectedReason, setSelectedReason] = useState("");

  // Fetch cancel quote + reasons in parallel
  useEffect(() => {
    async function loadData() {
      try {
        const [quoteData, reasonsData] = await Promise.all([
          fetchCancelQuote(booking.bookingRef),
          fetchCancelReasons(),
        ]);

        if (quoteData.refundDetails) {
          setQuote(quoteData);
        } else {
          setError("Refund policy could not be verified automatically. Contact support.");
        }

        setReasons(reasonsData);
        if (reasonsData.length > 0) {
          setSelectedReason(reasonsData[0].reasonCode);
        }
      } catch {
        setError("Error connecting to booking service.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [booking.bookingRef]);

  const handleCancel = async () => {
    if (!selectedReason) {
      toast.warning("Please select a cancellation reason.");
      return;
    }

    setCancelling(true);
    try {
      const data = await cancelBooking(booking.bookingRef, selectedReason);
      if (data.status) {
        await updateBookingStatus(booking.bookingRef, "CANCELLED").catch(() => {});
        onSuccess();
      } else {
        toast.error("Failed to cancel this booking.");
      }
    } catch {
      toast.error("Error cancelling booking. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative"
        >
          {/* Header */}
          <div className="bg-red-50 p-6 text-center border-b border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-red-900">Cancel Booking?</h2>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="font-bold text-gray-900 text-center mb-6">
              Are you sure you want to cancel <br className="hidden sm:block" />
              <span className="text-[#0071CE]">{booking.productTitle}</span>?
            </p>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0071CE] border-t-transparent mb-3" />
                <p className="text-sm font-semibold">Loading cancellation details...</p>
              </div>
            ) : error ? (
              <div className="bg-orange-50 p-4 rounded-xl text-orange-800 text-sm text-center border border-orange-100 mb-6 font-medium">
                {error}
              </div>
            ) : (
              <>
                {/* Refund quote */}
                {quote && (
                  <div className="bg-green-50 rounded-xl p-5 border border-green-100 text-center mb-5">
                    <p className="text-sm text-green-800 font-semibold mb-1">
                      You will receive a refund of
                    </p>
                    <p className="text-2xl font-black text-green-600 mb-2">
                      {(quote.refundDetails as Record<string, unknown> & { currencyCode: string; refundAmount: number })?.currencyCode}{" "}
                      {(quote.refundDetails as Record<string, unknown> & { refundAmount: number })?.refundAmount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-700 bg-green-100/50 inline-block px-3 py-1 rounded-full">
                      Refund processed in 5-7 business days
                    </p>
                  </div>
                )}

                {/* Cancel reason selector */}
                {reasons.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Reason for cancellation
                    </label>
                    <select
                      value={selectedReason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition bg-white"
                    >
                      {reasons.map((r) => (
                        <option key={r.reasonCode} value={r.reasonCode}>
                          {r.description}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleCancel}
                disabled={cancelling || loading || !selectedReason}
                className="w-full py-4 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
              >
                {cancelling ? "Processing..." : "Yes, Cancel Booking"}
              </button>
              <button
                onClick={onClose}
                disabled={cancelling}
                className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
              >
                Keep Booking
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
