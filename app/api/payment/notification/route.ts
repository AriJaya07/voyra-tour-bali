import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";

/**
 * Verify Midtrans notification signature.
 * signature_key = SHA512(order_id + status_code + gross_amount + serverKey)
 */
function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const payload = orderId + statusCode + grossAmount + SERVER_KEY;
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
      // Unknown status — acknowledge but don't update
      return NextResponse.json({ message: "Acknowledged" });
    }

    // Find booking by paymentId (order_id)
    const booking = await prisma.booking.findUnique({
      where: { paymentId: order_id },
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

    // Update booking status
    await prisma.booking.update({
      where: { paymentId: order_id },
      data: {
        status: newStatus,
        paidAt:
          newStatus === "CONFIRMED" ? new Date() : booking.paidAt,
      },
    });

    console.log(
      `Midtrans webhook: ${order_id} → ${newStatus} (was ${booking.status})`
    );

    return NextResponse.json({ message: "OK" });
  } catch (error: any) {
    console.error("Midtrans webhook error:", error?.message || error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
