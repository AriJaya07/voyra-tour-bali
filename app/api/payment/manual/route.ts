import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/midtrans";

/**
 * POST /api/payment/manual
 * Creates a Midtrans Snap token for a mock booking using manualPrice.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingRef } = await request.json();
    if (!bookingRef) {
      return NextResponse.json({ error: "Missing bookingRef" }, { status: 400 });
    }

    const booking = await prisma.booking.findFirst({
      where: { bookingRef },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.userId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!booking.isMockMode || !booking.manualPrice) {
      return NextResponse.json({ error: "No manual price set for this booking" }, { status: 400 });
    }
    if (booking.status === "CONFIRMED") {
      return NextResponse.json({ error: "Booking already paid" }, { status: 400 });
    }

    const grossAmount = Math.round(booking.manualPrice);
    const orderId = `VOYRA-MANUAL-${booking.id}-${Date.now()}`;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: booking.productCode,
          price: grossAmount,
          quantity: 1,
          name: booking.productTitle.substring(0, 50),
        },
      ],
      customer_details: {
        first_name: booking.leadFirstName || booking.user.name || "Guest",
        last_name: booking.leadLastName || "",
        email: booking.leadEmail || booking.user.email || "",
        phone: "",
      },
      callbacks: {
        finish: `${process.env.NEXTAUTH_URL}/payment/success`,
        unfinish: `${process.env.NEXTAUTH_URL}/payment/pending`,
        error: `${process.env.NEXTAUTH_URL}/payment/error`,
      },
    };

    const snapResponse = await snap.createTransaction(parameter);

    // Update booking with new paymentId/snapToken so the webhook can find it
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentId: orderId,
        snapToken: snapResponse.token,
      },
    });

    return NextResponse.json({
      snapToken: snapResponse.token,
      orderId,
    });
  } catch (error: any) {
    console.error("Manual payment error:", error?.message || error);
    return NextResponse.json(
      { error: "Failed to create payment", details: error?.message },
      { status: 500 }
    );
  }
}
