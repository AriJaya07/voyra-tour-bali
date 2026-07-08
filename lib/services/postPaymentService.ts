/**
 * Shared Post-Payment Service
 *
 * Contains logic that runs after a successful payment confirmation,
 * shared between Midtrans webhook handlers.
 * - Confirms Viator booking (for non-mock bookings)
 * - Sends confirmation email with ticket link
 */

import { prisma } from "@/lib/prisma";
import { generateTicketToken } from "@/lib/ticket";
import { sendBookingConfirmation } from "@/lib/email";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_MOCK_BOOKING, viatorSignal } from "@/lib/config/viator";
import { applyBookingRewards } from "@/lib/services/rewardService";

/**
 * Confirm booking with Viator Partner API after payment success.
 */
async function confirmViatorBooking(booking: any): Promise<{
  success: boolean;
  bookingRef?: string;
  voucherUrl?: string;
  error?: string;
}> {
  if (!VIATOR_API_KEY || VIATOR_MOCK_BOOKING) {
    console.log("[Viator] Mock mode — simulating successful booking confirmation");
    return {
      success: true,
      bookingRef: `MOCK-VTR-${booking.id}-${Date.now()}`,
      voucherUrl: undefined,
    };
  }

  try {
    const paxMix = booking.paxMixJson || [
      { ageBand: "ADULT", numberOfTravelers: booking.pax },
    ];

    const travelers =
      booking.travelersJson?.map((t: any) => ({
        ageBand: t.ageBand || "ADULT",
        firstName: t.firstName,
        lastName: t.lastName,
      })) || [];

    const bookingQuestions =
      booking.bookingQuestionsJson?.map((q: any) => ({
        questionId: q.questionId,
        answer: q.answer,
      })) || [];

    const viatorPayload: Record<string, unknown> = {
      productCode: booking.productCode,
      travelDate: booking.travelDate.toISOString().split("T")[0],
      paxMix,
      bookerInfo: {
        firstName: booking.leadFirstName || "Guest",
        lastName: booking.leadLastName || "",
      },
      communication: {
        email: booking.leadEmail || "",
        phone: booking.leadPhone || "",
      },
    };

    if (booking.productOptionCode) {
      viatorPayload.productOptionCode = booking.productOptionCode;
    }
    if (booking.tourGradeCode) {
      viatorPayload.tourGradeCode = booking.tourGradeCode;
    }
    if (booking.startTime) {
      viatorPayload.startTime = booking.startTime;
    }
    if (travelers.length > 0) {
      viatorPayload.travelers = travelers;
      viatorPayload.leadTraveler = {
        firstName: booking.leadFirstName || travelers[0]?.firstName,
        lastName: booking.leadLastName || travelers[0]?.lastName,
        email: booking.leadEmail,
        phone: booking.leadPhone,
      };
    }
    if (bookingQuestions.length > 0) {
      viatorPayload.bookingQuestions = bookingQuestions;
    }
    if (booking.languageGuide) {
      viatorPayload.languageGuide = booking.languageGuide;
    }

    console.log(`[Viator] Confirming booking for order ${booking.paymentId}...`);

    const res = await fetch(`${VIATOR_API_URL}/bookings/book`, {
      method: "POST",
      headers: {
        Accept: "application/json;version=2.0",
        "Content-Type": "application/json",
        "exp-api-key": VIATOR_API_KEY,
      },
      signal: viatorSignal(),
      body: JSON.stringify(viatorPayload),
    });

    const data = await res.json();

    if (res.ok && data.bookingRef) {
      console.log(`[Viator] Booking confirmed: ${data.bookingRef} for order ${booking.paymentId}`);
      return {
        success: true,
        bookingRef: data.bookingRef,
        voucherUrl: data.voucherInfo?.url || null,
      };
    }

    const errMsg = data.message || data.error || JSON.stringify(data);
    console.error(`[Viator] Booking failed for ${booking.paymentId}: ${errMsg}`);
    return { success: false, error: errMsg };
  } catch (error: any) {
    console.error(`[Viator] Booking error for ${booking.paymentId}:`, error?.message || error);
    return { success: false, error: error?.message || "Unknown error" };
  }
}

/**
 * Handle post-payment success logic:
 * 1. Generate ticket token
 * 2. Update booking status to CONFIRMED
 * 3. Confirm with Viator (if applicable)
 * 4. Send confirmation email
 *
 * @param orderId - The payment order ID (paymentId in DB)
 * @returns Updated booking status
 */
export async function handlePaymentSuccess(orderId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { paymentId: orderId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // Don't re-process if already confirmed or finalized
    const terminalStatuses = ["CONFIRMED", "COMPLETED", "CANCELLED"];
    if (terminalStatuses.includes(booking.status)) {
      return { success: true }; // Already processed
    }

    const ticketToken = generateTicketToken();

    // Update booking to CONFIRMED. Clear payment-only tokens — Midtrans snapToken expires after 15min,
    // idempotencyKey is only used during checkout. Both are dead weight after CONFIRMED.
    await prisma.booking.update({
      where: { paymentId: orderId },
      data: {
        status: "CONFIRMED",
        paidAt: new Date(),
        ticketToken,
        snapToken: null,
        idempotencyKey: null,
      },
    });

    console.log(`[PostPayment] ${orderId} → CONFIRMED`);

    // Booking + referral rewards (Phase 10: all rewards now mint AI credits)
    try {
      const fullBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      if (fullBooking) {
        await applyBookingRewards(fullBooking);
      }
    } catch (e) {
      console.error("[Reward] failed to apply booking rewards:", e instanceof Error ? e.message : e);
    }

    // Confirm with Viator (skip for mock bookings, local source, or already-booked)
    if (booking.isMockMode) {
      console.log(`[Viator] Mock booking ${orderId} — skipping Viator confirmation`);
    } else if (booking.source !== "viator") {
      console.log(`[Viator] Source=${booking.source} for ${orderId} — skipping Viator confirmation`);
    } else if (booking.viatorBookingRef) {
      console.log(`[Viator] Already booked: ${booking.viatorBookingRef}, skipping`);
    } else {
      const viatorResult = await confirmViatorBooking(booking);

      if (viatorResult.success) {
        await prisma.booking.update({
          where: { paymentId: orderId },
          data: {
            viatorBookingRef: viatorResult.bookingRef || null,
            viatorBookingStatus: "CONFIRMED",
            viatorVoucherUrl: viatorResult.voucherUrl || null,
            viatorBookingError: null,
          },
        });
      } else {
        await prisma.booking.update({
          where: { paymentId: orderId },
          data: {
            viatorBookingStatus: "FAILED",
            viatorBookingError: viatorResult.error || "Unknown error",
            viatorRetryCount: { increment: 1 },
          },
        });
        console.error(
          `[CRITICAL] Payment OK but Viator booking FAILED for ${orderId}. Manual intervention needed.`
        );
      }
    }

    // Send confirmation email (non-blocking). Guest bookings have no user — fall back to lead contact.
    const recipientEmail = booking.user?.email || booking.leadEmail;
    const recipientName =
      booking.user?.name ||
      [booking.leadFirstName, booking.leadLastName].filter(Boolean).join(" ");
    if (!recipientEmail) {
      console.error(`[Email] No recipient for ${orderId} — guest booking without leadEmail`);
    }
    if (ticketToken && recipientEmail) {
      sendBookingConfirmation({
        email: recipientEmail,
        userName: recipientName || "",
        bookingRef: booking.bookingRef,
        productTitle: booking.productTitle,
        travelDate: booking.travelDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        pax: booking.pax,
        totalPrice: `Rp ${Math.round(booking.totalPrice).toLocaleString("id-ID")}`,
        ticketToken,
        meetingPoint: booking.meetingPoint,
        travelTime: booking.travelTime,
      }).catch((err) => {
        console.error("[Email] Failed to send booking confirmation:", err);
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error(`[PostPayment] Error processing ${orderId}:`, error?.message || error);
    return { success: false, error: error?.message || "Unknown error" };
  }
}
