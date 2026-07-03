import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { createLocalBooking } from "@/lib/services/localBookingService";
import { resolveServerPrice, PricingError } from "@/lib/services/pricingService";

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
      travelDate,
      pax,
      totalPrice,
      currency,
      leadFirstName,
      leadLastName,
      leadEmail,
      leadPhone,
      travelers,
      meetingPoint,
      notes,
    } = body;

    if (!productCode || !productTitle || !travelDate || !pax || !totalPrice) {
      return NextResponse.json(
        { error: "Missing required fields: productCode, productTitle, travelDate, pax, totalPrice" },
        { status: 400 }
      );
    }

    // Never trust the client total — resolve from our own catalog.
    const resolvedPrice = await resolveServerPrice({
      source: "local",
      productCode,
      pax: Number(pax),
      travelDate,
      clientTotal: Number(totalPrice),
      currency: currency || "IDR",
    });

    const result = await createLocalBooking({
      userId: Number(session.user.id),
      productCode,
      productTitle,
      productImage,
      travelDate,
      pax: Number(pax),
      totalPrice: resolvedPrice.totalPrice,
      currency,
      leadFirstName,
      leadLastName,
      leadEmail,
      leadPhone,
      travelers,
      meetingPoint,
      notes,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof PricingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Local booking error:", message);

    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
