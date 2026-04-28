import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  TOURCMS_MIDTRANS_SERVER_KEY,
  TOURCMS_ORDER_PREFIX,
} from "@/lib/config/tourcms-midtrans";
import { handleTourcmsPaymentSuccess } from "@/lib/services/tourcmsPostPaymentService";

interface MidtransNotification {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
}

function mapStatus(
  txStatus: string,
  fraudStatus?: string
): "PENDING" | "PAYMENT" | "CONFIRMED" | "CANCELLED" {
  switch (txStatus) {
    case "capture":
      return fraudStatus === "challenge" ? "PENDING" : "CONFIRMED";
    case "settlement":
      return "CONFIRMED";
    case "pending":
      return "PAYMENT";
    case "deny":
    case "cancel":
    case "expire":
    case "refund":
    case "partial_refund":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MidtransNotification;
    const orderId = body.order_id || "";

    if (!orderId.startsWith(TOURCMS_ORDER_PREFIX)) {
      return NextResponse.json({ message: "Acknowledged (not TC)" });
    }

    const expected = crypto
      .createHash("sha512")
      .update(
        `${orderId}${body.status_code || ""}${body.gross_amount || ""}${TOURCMS_MIDTRANS_SERVER_KEY}`
      )
      .digest("hex");
    if (expected !== body.signature_key) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    const booking = await prisma.tourcmsBooking.findUnique({
      where: { paymentId: orderId },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const newStatus = mapStatus(
      body.transaction_status || "",
      body.fraud_status
    );

    if (newStatus === "CONFIRMED") {
      await handleTourcmsPaymentSuccess(orderId);
    } else if (newStatus !== booking.status) {
      await prisma.tourcmsBooking.update({
        where: { paymentId: orderId },
        data: {
          status: newStatus,
          isFraudFlagged:
            body.fraud_status === "challenge" ? true : booking.isFraudFlagged,
        },
      });
    }

    return NextResponse.json({ message: "Acknowledged" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("TourCMS payment notification error:", msg);
    return NextResponse.json({ message: "Acknowledged" });
  }
}
