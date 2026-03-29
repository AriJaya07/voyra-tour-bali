import { NextResponse } from "next/server";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS, viatorSignal } from "@/lib/config/viator";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productCode = searchParams.get("productCode");

    if (!productCode) {
      return NextResponse.json(
        { error: "productCode is required" },
        { status: 400 }
      );
    }
    if (!VIATOR_API_KEY) {
      // Mock fallback for development
      return NextResponse.json({
        bookingQuestions: [
          {
            questionId: "AGEBAND",
            question: "Age of traveler",
            required: true,
            inputType: "TEXT",
          },
        ],
      });
    }

    const res = await fetch(
      `${VIATOR_API_URL}/products/${productCode}/booking-questions`,
      { headers: VIATOR_HEADERS, signal: viatorSignal() }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || "Failed to fetch booking questions" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Booking questions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking questions" },
      { status: 500 }
    );
  }
}
