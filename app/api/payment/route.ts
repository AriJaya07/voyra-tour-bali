import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentGateway } from "@/lib/services/paymentGateway";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      productCode,
      productTitle,
      productImage,
      productOptionCode,
      tourGradeCode,
      startTime,
      travelDate,
      pax,
      paxMix,
      totalPrice,
      currency,
      leadFirstName,
      leadLastName,
      leadEmail,
      leadPhone,
      travelers,
      meetingPoint,
      languageGuide,
      bookingQuestionAnswers,
    } = body;

    if (!productCode || !productTitle || !travelDate || !pax || !totalPrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate idempotency key to prevent duplicate bookings
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${session.user.id}-${productCode}-${travelDate}-${Date.now()}`)
      .digest("hex")
      .substring(0, 32);

    // Create booking in DB with PENDING status + all booking data
    const booking = await prisma.booking.create({
      data: {
        userId: Number(session.user.id),
        bookingRef: "", // Will be set after Midtrans order ID
        productCode,
        productTitle,
        productImage: productImage || null,
        productOptionCode: productOptionCode || null,
        tourGradeCode: tourGradeCode || null,
        startTime: startTime || null,
        totalPrice: Math.round(Number(totalPrice)),
        currency: currency || "IDR",
        travelDate: new Date(travelDate),
        pax: Number(pax),
        paxMixJson: paxMix || null,
        meetingPoint: meetingPoint || null,
        languageGuide: languageGuide || null,
        bookingQuestionsJson: bookingQuestionAnswers || null,
        leadFirstName: leadFirstName || null,
        leadLastName: leadLastName || null,
        leadEmail: leadEmail || null,
        leadPhone: leadPhone || null,
        travelersJson: travelers || null,
        idempotencyKey,
        status: "PENDING",
      },
    });

    // Save travelers individually
    if (travelers && Array.isArray(travelers) && travelers.length > 0) {
      await prisma.bookingTraveler.createMany({
        data: travelers.map((t: any) => ({
          bookingId: booking.id,
          bookingRef: "", // Will update after orderId
          firstName: t.firstName || "",
          lastName: t.lastName || "",
          fullName: `${t.firstName || ""} ${t.lastName || ""}`.trim(),
          ageBand: t.ageBand || "ADULT",
        })),
      });
    }

    const orderId = `VOYRA-${booking.id}-${Date.now()}`;

    // IDR requires whole numbers
    const perItemPrice = Math.round(Number(totalPrice) / Number(pax));
    const grossAmount = perItemPrice * Number(pax);

    // Guard: NEXTAUTH_URL must be set to build correct Midtrans callback URLs
    const siteUrl = process.env.NEXTAUTH_URL;
    if (!siteUrl) {
      return NextResponse.json(
        { error: "Server misconfiguration: NEXTAUTH_URL is not set" },
        { status: 500 }
      );
    }

    const gateway = getPaymentGateway();
    const gatewayResult = await gateway.createTransaction({
      orderId,
      grossAmount,
      itemDetails: [
        {
          id: productCode,
          price: perItemPrice,
          quantity: Number(pax),
          name: productTitle.substring(0, 50),
        },
      ],
      customerDetails: {
        firstName: leadFirstName || session.user.name || "Guest",
        lastName: leadLastName || "",
        email: leadEmail || session.user.email || "",
        phone: leadPhone || "",
      },
      callbackUrls: {
        success: `${siteUrl}/payment/success`,
        pending: `${siteUrl}/payment/pending`,
        error: `${siteUrl}/payment/error`,
      },
    });

    // Update booking with payment info
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentId: orderId,
        snapToken: gatewayResult.token || gatewayResult.redirectUrl || null,
        bookingRef: orderId,
      },
    });

    // Update traveler bookingRefs
    await prisma.bookingTraveler.updateMany({
      where: { bookingId: booking.id },
      data: { bookingRef: orderId },
    });

    return NextResponse.json({
      bookingId: booking.id,
      orderId,
      snapToken: gatewayResult.token,
      redirectUrl: gatewayResult.redirectUrl,
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
