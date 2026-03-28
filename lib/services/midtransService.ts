import type { BookingInput, BookingResult } from "@/types/bookingFlow";

/**
 * LOCAL products are booked via Midtrans.
 * Creates a booking in our DB + gets a Midtrans Snap token.
 */
export async function handleMidtransBooking(
  input: BookingInput
): Promise<BookingResult> {
  try {
    const totalTravelers = input.paxMix.reduce(
      (acc, p) => acc + p.numberOfTravelers,
      0
    );

    const res = await fetch("/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productCode: input.productCode,
        productTitle: input.productTitle,
        productImage: input.productImage,
        productOptionCode: input.productOptionCode,
        tourGradeCode: input.tourGradeCode,
        startTime: input.startTime,
        travelDate: input.travelDate,
        pax: totalTravelers,
        paxMix: input.paxMix,
        totalPrice: input.totalPrice,
        currency: input.currency,
        leadFirstName: input.leadTraveler.firstName,
        leadLastName: input.leadTraveler.lastName,
        leadEmail: input.leadTraveler.email,
        leadPhone: input.leadTraveler.phone,
        travelers: input.travelers,
        meetingPoint: input.meetingPoint,
        languageGuide: input.languageGuide,
        bookingQuestionAnswers: input.bookingQuestionAnswers,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        type: "payment",
        success: false,
        error: data.error || "Failed to create payment",
      };
    }

    return {
      type: "payment",
      success: true,
      snapToken: data.snapToken,
      redirectUrl: data.redirectUrl,
      orderId: data.orderId,
      bookingRef: data.orderId,
    };
  } catch {
    return {
      type: "payment",
      success: false,
      error: "Failed to process payment. Please try again.",
    };
  }
}
