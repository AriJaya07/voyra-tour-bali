import type { Product, BookingResult } from "@/types/bookingFlow";

/**
 * Viator products are booked externally.
 * We simply redirect the user to the Viator product page.
 */
export function handleViatorRedirect(product: Product): BookingResult {
  if (!product.viatorUrl) {
    return {
      type: "redirect",
      success: false,
      error: "Missing Viator URL for this product",
    };
  }

  return {
    type: "redirect",
    success: true,
    redirectUrl: product.viatorUrl,
  };
}
