import { NextRequest, NextResponse } from "next/server";
import { VIATOR_API_URL, VIATOR_HEADERS, VIATOR_MOCK_BOOKING } from "@/lib/config/viator";
import { mockGetPaymentMethods } from "@/lib/viatorMock";

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.nextUrl.searchParams.get("sessionToken");

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Missing sessionToken parameter" },
        { status: 400 }
      );
    }

    // ── Mock mode ────────────────────────────────────────────────────
    if (VIATOR_MOCK_BOOKING) {
      const methods = await mockGetPaymentMethods();
      return NextResponse.json({ paymentAccounts: methods });
    }

    // ── Real Viator API ──────────────────────────────────────────────
    const viatorRes = await fetch(
      `${VIATOR_API_URL}/v1/checkoutsessions/${encodeURIComponent(sessionToken)}/paymentaccounts`,
      {
        method: "GET",
        headers: VIATOR_HEADERS,
      }
    );

    const data = await viatorRes.json();

    if (!viatorRes.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to get payment methods" },
        { status: viatorRes.status }
      );
    }

    return NextResponse.json({
      paymentAccounts: data.paymentAccounts || data.accounts || [],
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
