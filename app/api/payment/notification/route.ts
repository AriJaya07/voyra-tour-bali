import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { MIDTRANS_SERVER_KEY } from "@/lib/config/midtrans";
import { handlePaymentSuccess } from "@/lib/services/postPaymentService";

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
): "PENDING" | "PAYMENT" | "CONFIRMED" | "CANCELLED" | null {
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

    // Handle non-confirmation statuses (PENDING, CANCELLED)
    if (newStatus !== "CONFIRMED") {
      await prisma.booking.update({
        where: { paymentId: order_id },
        data: { status: newStatus },
      });
      console.log(`Midtrans webhook: ${order_id} → ${newStatus} (was ${booking.status})`);
      return NextResponse.json({ message: "OK" });
    }

    // Payment confirmed — use shared post-payment service
    console.log(
      `Midtrans webhook: ${order_id} → CONFIRMED (was ${booking.status}${booking.isMockMode ? ", mock mode" : ""})`
    );

    const result = await handlePaymentSuccess(order_id);
    if (!result.success) {
      console.error(`[Midtrans Webhook] Post-payment processing failed: ${result.error}`);
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
