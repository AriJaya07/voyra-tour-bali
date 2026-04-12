import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePaymentSuccess } from "@/lib/services/postPaymentService";

/**
 * POST /api/payment/notification/mayar
 *
 * Webhook endpoint for Mayar payment notifications.
 * Mayar calls this URL after payment status changes.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Mayar webhook payload fields
    const { id, status, amount } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(`[Mayar Webhook] Received: id=${id}, status=${status}, amount=${amount}`);

    // Map Mayar status to our internal status
    // Mayar statuses: "active" (paid), "expired", "failed"
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus === "active" || normalizedStatus === "paid" || normalizedStatus === "settlement") {
      // Payment successful — find booking and process
      // Mayar's callback includes the transaction ID; we need to find the booking
      // The orderId was embedded in the description or we look up by searching
      // Since we pass orderId in the description, search by pattern

      // Try to find booking - Mayar sends back our orderId in metadata
      // We store the Mayar link in snapToken, and orderId in paymentId
      // Look for the booking that has this Mayar transaction context
      const orderId = body.orderId || body.order_id || body.metadata?.orderId;

      if (orderId) {
        const result = await handlePaymentSuccess(orderId);
        if (!result.success) {
          console.error(`[Mayar Webhook] Post-payment failed for ${orderId}: ${result.error}`);
        }
      } else {
        // Fallback: search by description pattern or recent pending bookings
        // The description contains our order info
        console.warn(`[Mayar Webhook] No orderId in payload, searching by amount...`);
        const pendingBooking = await prisma.booking.findFirst({
          where: {
            status: "PENDING",
            totalPrice: Number(amount),
          },
          orderBy: { createdAt: "desc" },
        });

        if (pendingBooking?.paymentId) {
          const result = await handlePaymentSuccess(pendingBooking.paymentId);
          if (!result.success) {
            console.error(`[Mayar Webhook] Post-payment failed: ${result.error}`);
          }
        } else {
          console.warn(`[Mayar Webhook] Could not find matching booking for amount=${amount}`);
        }
      }
    } else if (normalizedStatus === "expired" || normalizedStatus === "failed" || normalizedStatus === "cancel") {
      // Payment failed or expired
      const orderId = body.orderId || body.order_id || body.metadata?.orderId;
      if (orderId) {
        await prisma.booking.update({
          where: { paymentId: orderId },
          data: { status: "CANCELLED" },
        });
        console.log(`[Mayar Webhook] ${orderId} → CANCELLED (${normalizedStatus})`);
      }
    }

    return NextResponse.json({ message: "OK" });
  } catch (error: any) {
    console.error("[Mayar Webhook] Error:", error?.message || error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
