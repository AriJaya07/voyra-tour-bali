import { NextResponse } from "next/server";
import { VIATOR_API_URL, VIATOR_HEADERS, VIATOR_MOCK_BOOKING, viatorSignal } from "@/lib/config/viator";
import { mockHoldBooking } from "@/lib/viatorMock";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      productCode,
      productOptionCode,
      travelDate,
      paxMix,
      currency,
      leadTraveler,
      travelers,
      bookingQuestionAnswers,
    } = body;

    if (!productCode || !travelDate || !paxMix) {
      return NextResponse.json(
        { error: "Missing required fields: productCode, travelDate, paxMix" },
        { status: 400 }
      );
    }

    // ── Mock mode ────────────────────────────────────────────────────
    if (VIATOR_MOCK_BOOKING) {
      const mock = await mockHoldBooking();
      return NextResponse.json(mock);
    }

    // ── Real Viator API ──────────────────────────────────────────────
    const cartItem: Record<string, unknown> = {
      productCode,
      travelDate,
      paxMix,
      currency: currency || "USD",
    };

    if (productOptionCode) {
      cartItem.productOptionCode = productOptionCode;
    }

    if (leadTraveler) {
      cartItem.bookerInfo = {
        firstName: leadTraveler.firstName,
        lastName: leadTraveler.lastName,
      };
      cartItem.communication = {
        email: leadTraveler.email,
        phone: leadTraveler.phone,
      };
    }

    if (travelers?.length) {
      cartItem.travelers = travelers;
    }

    if (bookingQuestionAnswers?.length) {
      cartItem.bookingQuestionAnswers = bookingQuestionAnswers;
    }

    const viatorRes = await fetch(`${VIATOR_API_URL}/bookings/cart/hold`, {
      method: "POST",
      headers: VIATOR_HEADERS,
      signal: viatorSignal(),
      body: JSON.stringify({ cartItems: [cartItem] }),
    });

    const data = await viatorRes.json();

    if (!viatorRes.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to hold booking" },
        { status: viatorRes.status }
      );
    }

    return NextResponse.json({
      sessionToken: data.sessionToken,
      expiration: data.expiration,
      status: data.status || "HELD",
    });
  } catch (error) {
    console.error("Cart hold error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
