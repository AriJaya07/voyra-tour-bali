import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentGateway } from "@/lib/services/paymentGateway";
import { resolveServerPrice, PricingError } from "@/lib/services/pricingService";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    // Guest checkout allowed — session optional, guests must provide a lead email
    const session = await getServerSession(authOptions);

    const body = await request.json();
    const {
      source,
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
    const safeSource =
      source === "local" || source === "viator" || source === "tourcms" ? source : "viator";

    if (!productCode || !productTitle || !travelDate || !pax || !totalPrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId && !leadEmail) {
      return NextResponse.json(
        { error: "Email is required for guest bookings" },
        { status: 400 }
      );
    }

    // Server-side price resolution — the client total is never trusted for
    // DB-priced products; live Viator products are re-quoted and flagged on
    // suspicious deviation.
    const resolvedPrice = await resolveServerPrice({
      source: safeSource,
      productCode,
      pax: Number(pax),
      paxMix: paxMix || null,
      travelDate,
      productOptionCode: productOptionCode || null,
      startTime: startTime || null,
      clientTotal: Number(totalPrice),
      currency: currency || "IDR",
    });
    const chargeTotal = Math.round(resolvedPrice.totalPrice);
    if (resolvedPrice.suspicious) {
      console.error(
        `[PRICE-MISMATCH] user=${userId ?? "guest"} product=${productCode} client=${totalPrice} server=${chargeTotal} source=${resolvedPrice.priceSource}`
      );
    }

    // Generate idempotency key to prevent duplicate bookings
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${userId ?? leadEmail}-${productCode}-${travelDate}-${Date.now()}`)
      .digest("hex")
      .substring(0, 32);

    // Create booking in DB with PENDING status + all booking data
    const booking = await prisma.booking.create({
      data: {
        userId,
        bookingRef: "", // Will be set after Midtrans order ID
        source: safeSource,
        productCode,
        productTitle,
        productImage: productImage || null,
        productOptionCode: productOptionCode || null,
        tourGradeCode: tourGradeCode || null,
        startTime: startTime || null,
        totalPrice: chargeTotal,
        currency: currency || "IDR",
        isFraudFlagged: resolvedPrice.suspicious,
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

    // IDR requires whole numbers. Distribute the server-resolved total across
    // pax so gross_amount always equals the charged total (no rounding drift).
    const perItemPrice = Math.floor(chargeTotal / Number(pax));
    const remainder = chargeTotal - perItemPrice * Number(pax);
    const grossAmount = chargeTotal;

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
        // Keeps item_details sum equal to gross_amount after whole-IDR split
        ...(remainder > 0
          ? [{ id: `${productCode}-ADJ`, price: remainder, quantity: 1, name: "Rounding adjustment" }]
          : []),
      ],
      customerDetails: {
        firstName: leadFirstName || session?.user?.name || "Guest",
        lastName: leadLastName || "",
        email: leadEmail || session?.user?.email || "",
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
  } catch (error) {
    if (error instanceof PricingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Payment creation error:", error instanceof Error ? error.message : "Unknown");

    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
