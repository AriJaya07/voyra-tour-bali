import type {
  BookingInput,
  BookingResult,
  ViatorHoldResponse,
  ViatorPaymentAccount,
  ViatorConfirmInput,
  ViatorConfirmResponse,
} from "@/types/bookingFlow";

/**
 * Viator Checkout Flow (client-side):
 *   1. Hold booking  → sessionToken + expiration
 *   2. Get payment methods → list of payment accounts
 *   3. Confirm booking → bookingRef
 *
 * Each step calls our own API routes which proxy to Viator.
 */

// ── Step 1: Hold Booking ───────────────────────────────────────────

export async function holdBooking(
  input: BookingInput
): Promise<ViatorHoldResponse> {
  const res = await fetch("/api/viator/cart/hold", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productCode: input.productCode,
      productOptionCode: input.productOptionCode,
      travelDate: input.travelDate,
      paxMix: input.paxMix,
      currency: input.currency,
      leadTraveler: input.leadTraveler,
      travelers: input.travelers,
      bookingQuestionAnswers: input.bookingQuestionAnswers,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to hold booking");
  }

  return res.json();
}

// ── Step 2: Get Payment Methods ────────────────────────────────────

export async function getPaymentMethods(
  sessionToken: string
): Promise<ViatorPaymentAccount[]> {
  const res = await fetch(
    `/api/viator/checkout-session?sessionToken=${encodeURIComponent(sessionToken)}`
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to get payment methods");
  }

  const data = await res.json();
  return data.paymentAccounts || [];
}

// ── Step 3: Confirm Booking ────────────────────────────────────────

export async function confirmBooking(
  params: ViatorConfirmInput
): Promise<ViatorConfirmResponse> {
  const res = await fetch("/api/viator/cart/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to confirm booking");
  }

  return res.json();
}

// ── Full Viator Flow ───────────────────────────────────────────────

export async function viatorBookingFlow(
  input: BookingInput
): Promise<BookingResult> {
  try {
    // Step 1: Hold the booking
    const holdRes = await holdBooking(input);

    // Step 2: Get available payment methods
    const paymentMethods = await getPaymentMethods(holdRes.sessionToken);

    if (!paymentMethods.length) {
      return {
        type: "redirect",
        success: false,
        error: "No payment methods available for this booking",
      };
    }

    // Select the first available payment method
    const selectedPayment = paymentMethods[0];

    // Step 3: Confirm the booking
    const booking = await confirmBooking({
      sessionToken: holdRes.sessionToken,
      paymentAccountId: selectedPayment.id,
    });

    return {
      type: "redirect",
      success: true,
      bookingRef: booking.bookingRef,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Viator booking failed";
    return {
      type: "redirect",
      success: false,
      error: message,
    };
  }
}
