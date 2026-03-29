import { NextResponse } from "next/server";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS, viatorSignal } from "@/lib/config/viator";

/**
 * GET /api/viator/cancel-reasons
 *
 * Fetches the list of valid cancellation reasons from Viator.
 * Used by the CancelModal to let the user pick a reason.
 */
export async function GET() {
  try {
    if (!VIATOR_API_KEY) {
      // Mock fallback for development
      return NextResponse.json({
        reasons: [
          { reasonCode: "CUSTOMER_SERVICE", description: "Customer service issue" },
          { reasonCode: "DUPLICATE_BOOKING", description: "Duplicate booking" },
          { reasonCode: "BOOKED_WRONG_TOUR", description: "Booked wrong tour" },
          { reasonCode: "CHANGE_OF_PLANS", description: "Change of plans" },
          { reasonCode: "TOO_EXPENSIVE", description: "Too expensive" },
          { reasonCode: "OTHER", description: "Other reason" },
        ],
      });
    }

    const res = await fetch(`${VIATOR_API_URL}/bookings/cancel-reasons`, {
      headers: VIATOR_HEADERS,
      signal: viatorSignal(),
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.message || "Failed to fetch cancel reasons" },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      reasons: data.reasons || data.cancelReasons || [],
    });
  } catch (error) {
    console.error("Cancel reasons error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
