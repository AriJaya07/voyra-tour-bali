"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
import { VIATOR_MOCK_BOOKING } from "@/lib/config/viator";
import { buildWhatsAppUrl } from "@/lib/config";
import WhatappIcon from "@/components/assets/sosmed/WhatappIcon";

// ── Mock fallback reasons (used when VIATOR_MOCK_BOOKING is true) ────────────

const MOCK_REASONS: CancelReason[] = [
  { reasonCode: "CHANGE_OF_PLANS", description: "Change of plans" },
  { reasonCode: "SCHEDULE_CONFLICT", description: "Schedule conflict" },
  { reasonCode: "FOUND_BETTER_PRICE", description: "Found a better price" },
  { reasonCode: "HEALTH_ISSUE", description: "Health issue" },
  { reasonCode: "WEATHER", description: "Concerned about weather" },
  { reasonCode: "OTHER", description: "Other (please specify below)" },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface CancelModalProps {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CancelModal({ booking, onClose, onSuccess }: CancelModalProps) {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(!VIATOR_MOCK_BOOKING);
  const [cancelling, setCancelling] = useState(false);
  const [quote, setQuote] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reasons, setReasons] = useState<CancelReason[]>(
    VIATOR_MOCK_BOOKING ? MOCK_REASONS : []
  );
  const [selectedReason, setSelectedReason] = useState(
    VIATOR_MOCK_BOOKING ? MOCK_REASONS[0].reasonCode : ""
  );
  const [customReason, setCustomReason] = useState("");

  // ── Fetch quote + reasons in parallel (live mode only) ──────────────────────

  useEffect(() => {
    if (VIATOR_MOCK_BOOKING) return;
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

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /** Mock mode — send pre-filled WhatsApp message to admin */
  const handleWaCancel = () => {
    if (!selectedReason) {
      toast.warning("Please select a cancellation reason first.");
      return;
    }

    const reasonDesc =
      reasons.find((r) => r.reasonCode === selectedReason)?.description || selectedReason;
    const finalReason =
      selectedReason === "OTHER" && customReason.trim()
        ? `Other — ${customReason.trim()}`
        : reasonDesc;

    const userName = session?.user?.name || "Customer";
    const userEmail = session?.user?.email || "Not specified";

    const travelDate = new Date(booking.travelDate).toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const message = [
      "Hello Voyra Bali!",
      "I would like to *cancel* the following booking:",
      "",
      `*Tour:* ${booking.productTitle}`,
      `*Product Code:* ${booking.productCode}`,
      `*Travel Date:* ${travelDate}`,
      "",
      `*Customer Details:*`,
      `   Name: ${userName}`,
      `   Email: ${userEmail}`,
      "",
      `*Reason for Cancellation:* ${finalReason}`,
      "",
      "Please process this cancellation at your earliest convenience. Thank you!",
    ].join("\n");

    window.open(buildWhatsAppUrl(message), "_blank");
    onClose();
  };

  /** Live mode — call Viator cancel API */
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

  const showCustomInput = VIATOR_MOCK_BOOKING && selectedReason === "OTHER";
  const waDisabled = !selectedReason || (showCustomInput && !customReason.trim());

  // ── UI ────────────────────────────────────────────────────────────────────────

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
            {VIATOR_MOCK_BOOKING && (
              <p className="text-xs text-orange-600 mt-2 font-semibold bg-orange-50 border border-orange-200 rounded-full px-3 py-1 inline-block">
                Your request will be sent via WhatsApp for manual processing
              </p>
            )}
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="font-bold text-gray-900 text-center mb-6">
              Are you sure you want to cancel <br className="hidden sm:block" />
              <span className="text-[#0071CE]">{booking.productTitle}</span>?
            </p>

            {/* Live mode: loading + error states */}
            {!VIATOR_MOCK_BOOKING && loading ? (
              <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0071CE] border-t-transparent mb-3" />
                <p className="text-sm font-semibold">Loading cancellation details...</p>
              </div>
            ) : !VIATOR_MOCK_BOOKING && error ? (
              <div className="bg-orange-50 p-4 rounded-xl text-orange-800 text-sm text-center border border-orange-100 mb-6 font-medium">
                {error}
              </div>
            ) : (
              <>
                {/* Refund quote (live mode only) */}
                {!VIATOR_MOCK_BOOKING && quote && (
                  <div className="bg-green-50 rounded-xl p-5 border border-green-100 text-center mb-5">
                    <p className="text-sm text-green-800 font-semibold mb-1">
                      You will receive a refund of
                    </p>
                    <p className="text-2xl font-black text-green-600 mb-2">
                      {(quote.refundDetails as Record<string, unknown> & { currencyCode: string })?.currencyCode}{" "}
                      {(quote.refundDetails as Record<string, unknown> & { refundAmount: number })?.refundAmount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-700 bg-green-100/50 inline-block px-3 py-1 rounded-full">
                      Refund processed in 5-7 business days
                    </p>
                  </div>
                )}

                {/* Reason selector */}
                {reasons.length > 0 && (
                  <div className="mb-4">
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

                {/* Custom reason textarea — visible only in mock mode when "Other" is chosen */}
                {showCustomInput && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4"
                  >
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Please describe your reason
                    </label>
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      rows={3}
                      placeholder="Tell us why you'd like to cancel..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition resize-none"
                    />
                  </motion.div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {VIATOR_MOCK_BOOKING ? (
                <button
                  onClick={handleWaCancel}
                  disabled={waDisabled}
                  className="w-full py-4 bg-[#25D366] text-white font-black rounded-xl hover:bg-[#1ebe5d] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-3"
                >
                  {/* Global WhatsApp icon from @/components/assets/sosmed/WhatappIcon */}
                  <WhatappIcon className="h-5 w-auto shrink-0" />
                  <span>Request Cancellation</span>
                </button>
              ) : (
                <button
                  onClick={handleCancel}
                  disabled={cancelling || loading || !selectedReason}
                  className="w-full py-4 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                >
                  {cancelling ? "Processing..." : "Yes, Cancel Booking"}
                </button>
              )}

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
