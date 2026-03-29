import { NextResponse } from "next/server";
import { VIATOR_API_URL, VIATOR_HEADERS, VIATOR_MOCK_BOOKING, viatorSignal } from "@/lib/config/viator";
import { mockConfirmBooking } from "@/lib/viatorMock";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionToken, paymentAccountId } = body;

    if (!sessionToken || !paymentAccountId) {
      return NextResponse.json(
        { error: "Missing required fields: sessionToken, paymentAccountId" },
        { status: 400 }
      );
    }

    // ── Mock mode ────────────────────────────────────────────────────
    if (VIATOR_MOCK_BOOKING) {
      const mock = await mockConfirmBooking();
      return NextResponse.json(mock);
    }

    // ── Real Viator API ──────────────────────────────────────────────
    const viatorRes = await fetch(`${VIATOR_API_URL}/bookings/cart/book`, {
      method: "POST",
      headers: VIATOR_HEADERS,
      signal: viatorSignal(),
      body: JSON.stringify({
        sessionToken,
        paymentAccountId,
      }),
    });

    const data = await viatorRes.json();

    if (!viatorRes.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to confirm booking" },
        { status: viatorRes.status }
      );
    }

    return NextResponse.json({
      bookingRef: data.bookingRef || data.orderId,
      status: data.status || "CONFIRMED",
      voucherInfo: data.voucherInfo,
    });
  } catch (error) {
    console.error("Cart book error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
