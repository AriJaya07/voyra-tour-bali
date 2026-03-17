import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/midtrans";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { productCode, productTitle, travelDate, pax, totalPrice } = body;

    if (!productCode || !productTitle || !travelDate || !pax || !totalPrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create booking in DB with PENDING status
    const booking = await prisma.booking.create({
      data: {
        userId: Number(session.user.id),
        bookingRef: "",
        productCode,
        productTitle,
        totalPrice: Math.round(Number(totalPrice)),
        travelDate: new Date(travelDate),
        pax: Number(pax),
        status: "PENDING",
      },
    });

    const orderId = `VOYRA-${booking.id}-${Date.now()}`;

    // Create Midtrans Snap transaction
    // Midtrans IDR requires whole numbers — round per-item price and derive gross from it
    const perItemPrice = Math.round(Number(totalPrice) / Number(pax));
    const grossAmount = perItemPrice * Number(pax);

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: productCode,
          price: perItemPrice,
          quantity: Number(pax),
          name: productTitle.substring(0, 50),
        },
      ],
      customer_details: {
        first_name: session.user.name || "Guest",
        email: session.user.email || "",
      },
      callbacks: {
        finish: `${process.env.NEXTAUTH_URL}/payment/success`,
        unfinish: `${process.env.NEXTAUTH_URL}/payment/pending`,
        error: `${process.env.NEXTAUTH_URL}/payment/error`,
      },
    };

    const snapResponse = await snap.createTransaction(parameter);

    // Update booking with payment info
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentId: orderId,
        snapToken: snapResponse.token,
        bookingRef: orderId,
      },
    });

    return NextResponse.json({
      bookingId: booking.id,
      orderId,
      snapToken: snapResponse.token,
      redirectUrl: snapResponse.redirect_url,
    });
  } catch (error: any) {
    console.error("Payment creation error:", error?.message || error);

    return NextResponse.json(
      {
        error: "Failed to create payment",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
