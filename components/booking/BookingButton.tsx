"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { handleBooking } from "@/lib/services/bookingService";
import type { Product, BookingInput, BookingResult } from "@/types/bookingFlow";

interface BookingButtonProps {
  product: Product;
  bookingInput?: BookingInput;
  termsAccepted?: boolean;
  disabled?: boolean;
  onSuccess?: (result: BookingResult) => void;
  onError?: (error: string) => void;
}

export default function BookingButton({
  product,
  bookingInput,
  termsAccepted = true,
  disabled = false,
  onSuccess,
  onError,
}: BookingButtonProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    if (!termsAccepted) {
      toast.warning("Please accept the Terms of Use.");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await handleBooking(
        product,
        bookingInput || ({} as BookingInput)
      );

      if (!result.success) {
        const errorMsg = result.error || "Booking failed. Please try again.";
        toast.error(errorMsg);
        onError?.(errorMsg);
        return;
      }

      if (result.type === "redirect" && result.redirectUrl) {
        // VIATOR: redirect to external booking page
        window.location.href = result.redirectUrl;
        return;
      }

      if (result.type === "payment" && result.snapToken) {
        // LOCAL (Midtrans): open Snap popup
        const win = window as unknown as Record<string, unknown>;
        if (typeof window !== "undefined" && win.snap) {
          const snap = win.snap as {
            pay: (token: string, callbacks: Record<string, () => void>) => void;
          };
          snap.pay(result.snapToken, {
            onSuccess: () => {
              onSuccess?.(result);
              router.push(
                `/payment/success?order_id=${result.orderId}&transaction_status=settlement`
              );
            },
            onPending: () => {
              router.push(`/payment/pending?order_id=${result.orderId}`);
            },
            onError: () => {
              toast.error("Payment failed. Please try again.");
              setIsProcessing(false);
            },
            onClose: () => {
              toast.info("Payment window closed. You can retry.");
              setIsProcessing(false);
            },
          });
          return;
        } else if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
          return;
        }
        toast.error("Could not initialize payment.");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
      onError?.("Unexpected error");
    } finally {
      setIsProcessing(false);
    }
  };

  const isViator = product.source === "VIATOR";
  const label = isViator ? "Book on Viator" : "Book Now";
  const priceLabel = `${product.price.toLocaleString()} ${product.currency}`;

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing || disabled || (!isViator && !termsAccepted)}
      className="w-full bg-[#0071CE] hover:bg-[#005ba6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
    >
      {isProcessing ? (
        <>
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {isViator ? "Redirecting..." : "Processing..."}
        </>
      ) : (
        <>
          {isViator ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
          {label} — {priceLabel}
        </>
      )}
    </button>
  );
}
