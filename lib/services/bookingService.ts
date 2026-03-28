import type { Product, BookingInput, BookingResult } from "@/types/bookingFlow";
import { handleViatorRedirect } from "./viatorService";
import { handleMidtransBooking } from "./midtransService";

/**
 * Unified booking entry point.
 *
 * Routes based on product.source:
 *   VIATOR → redirect to Viator (no internal payment)
 *   LOCAL  → Midtrans payment
 */
export async function handleBooking(
  product: Product,
  input: BookingInput
): Promise<BookingResult> {
  if (product.source === "VIATOR") {
    return handleViatorRedirect(product);
  }

  return handleMidtransBooking(input);
}
