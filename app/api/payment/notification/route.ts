import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { generateTicketToken } from "@/lib/ticket";
import { sendBookingConfirmation } from "@/lib/email";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_MOCK_BOOKING, viatorSignal } from "@/lib/config/viator";
import { MIDTRANS_SERVER_KEY } from "@/lib/config/midtrans";

/**
 * Verify Midtrans notification signature.
 */
function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const payload = orderId + statusCode + grossAmount + MIDTRANS_SERVER_KEY;
  const computed = crypto.createHash("sha512").update(payload).digest("hex");
  return computed === signatureKey;
}

/**
 * Map Midtrans transaction_status to our BookingStatus.
 */
function mapStatus(
  transactionStatus: string,
  fraudStatus?: string
): "PENDING" | "CONFIRMED" | "CANCELLED" | null {
  switch (transactionStatus) {
    case "capture":
      return fraudStatus === "accept" ? "CONFIRMED" : "PENDING";
    case "settlement":
      return "CONFIRMED";
    case "cancel":
    case "deny":
    case "expire":
      return "CANCELLED";
    case "pending":
      return "PENDING";
    default:
      return null;
  }
}

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
    // Build paxMix from stored data
    const paxMix = booking.paxMixJson || [
      { ageBand: "ADULT", numberOfTravelers: booking.pax },
    ];

    // Build travelers list
    const travelers =
      booking.travelersJson?.map((t: any) => ({
        ageBand: t.ageBand || "ADULT",
        firstName: t.firstName,
        lastName: t.lastName,
      })) || [];

    // Build booking questions
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

    console.log(
      `[Viator] Confirming booking for order ${booking.paymentId}...`
    );

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
      console.log(
        `[Viator] Booking confirmed: ${data.bookingRef} for order ${booking.paymentId}`
      );
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
    console.error(
      `[Viator] Booking error for ${booking.paymentId}:`,
      error?.message || error
    );
    return { success: false, error: error?.message || "Unknown error" };
  }
}

// Midtrans calls this endpoint — no auth required
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body;

    // Verify signature
    if (!verifySignature(order_id, status_code, gross_amount, signature_key)) {
      console.warn("Midtrans webhook: invalid signature for", order_id);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    // Map to our status
    const newStatus = mapStatus(transaction_status, fraud_status);
    if (!newStatus) {
      return NextResponse.json({ message: "Acknowledged" });
    }

    // Find booking by paymentId (order_id)
    const booking = await prisma.booking.findUnique({
      where: { paymentId: order_id },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!booking) {
      console.warn("Midtrans webhook: booking not found for", order_id);
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Don't downgrade terminal statuses
    const terminalStatuses = ["COMPLETED", "CANCELLED"];
    if (terminalStatuses.includes(booking.status)) {
      return NextResponse.json({ message: "Booking already finalized" });
    }

    // Check for idempotency — don't re-process if already confirmed
    const isNewConfirmation =
      newStatus === "CONFIRMED" && booking.status !== "CONFIRMED";
    const ticketToken = isNewConfirmation
      ? generateTicketToken()
      : booking.ticketToken;

    // Update payment status
    await prisma.booking.update({
      where: { paymentId: order_id },
      data: {
        status: newStatus,
        paidAt: newStatus === "CONFIRMED" ? new Date() : booking.paidAt,
        ticketToken,
      },
    });

    console.log(
      `Midtrans webhook: ${order_id} → ${newStatus} (was ${booking.status})`
    );

    // ── CRITICAL: After payment success, confirm with Viator ──
    if (isNewConfirmation) {
      // Prevent duplicate Viator bookings
      if (booking.viatorBookingRef) {
        console.log(
          `[Viator] Already booked: ${booking.viatorBookingRef}, skipping`
        );
      } else {
        const viatorResult = await confirmViatorBooking(booking);

        if (viatorResult.success) {
          await prisma.booking.update({
            where: { paymentId: order_id },
            data: {
              viatorBookingRef: viatorResult.bookingRef || null,
              viatorBookingStatus: "CONFIRMED",
              viatorVoucherUrl: viatorResult.voucherUrl || null,
              viatorBookingError: null,
            },
          });
        } else {
          // Payment succeeded but Viator booking failed — flag for retry
          await prisma.booking.update({
            where: { paymentId: order_id },
            data: {
              viatorBookingStatus: "FAILED",
              viatorBookingError: viatorResult.error || "Unknown error",
              viatorRetryCount: { increment: 1 },
            },
          });
          console.error(
            `[CRITICAL] Payment OK but Viator booking FAILED for ${order_id}. Manual intervention needed.`
          );
        }
      }

      // Send confirmation email with ticket link (non-blocking)
      if (ticketToken) {
        sendBookingConfirmation({
          email: booking.user.email,
          userName: booking.user.name || "",
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
        }).catch((err) => {
          console.error("[Email] Failed to send booking confirmation:", err);
        });
      }
    }

    return NextResponse.json({ message: "OK" });
  } catch (error: any) {
    console.error("Midtrans webhook error:", error?.message || error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
