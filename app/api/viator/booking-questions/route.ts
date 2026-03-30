import { NextRequest, NextResponse } from "next/server";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS, viatorSignal } from "@/lib/config/viator";

export async function GET(req: NextRequest) {
  try {
    const productCode = req.nextUrl.searchParams.get("productCode");

    if (!productCode) {
      return NextResponse.json({ error: "Missing productCode" }, { status: 400 });
    }

    if (!VIATOR_API_KEY) {
      // Mock Data
      return NextResponse.json({
        bookingQuestions: [
          {
            questionId: "NAME",
            question: "What is the lead traveler's name?",
            required: true,
            allowedAnswers: [],
            message: "Lead traveler full name for manifest."
          },
          {
            questionId: "DIETARY",
            question: "Do you have any dietary requirements?",
            required: false,
            allowedAnswers: ["None", "Vegetarian", "Vegan", "Gluten Free"],
          }
        ]
      });
    }

    const res = await fetch(`${VIATOR_API_URL}/products/${productCode}`, {
      method: "GET",
      headers: VIATOR_HEADERS,
      signal: viatorSignal(),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.message || "Failed to fetch product details" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const bookingQuestions = data.bookingQuestions || [];

    // Viator product endpoint usually returns string arrays or objects, we should normalize to the expected format in CheckoutClient
    // If it's just raw strings, map them, but Viator v2 returns complex objects for booking questions (if any).
    // The previous implementation assumed an array of objects with `questionId`, `question`, `required`, and `allowedAnswers`.

    // In Viator v2 /products/{productCode}, bookingQuestions is typically an array of string IDs representing question IDs.
    // If the data shape is exactly what's needed, just return it. Else, we return raw to let UI handle, or normalize here.
    // Wait, the UI expects:
    // interface BookingQuestion {
    //   questionId: string;
    //   question: string;
    //   required?: boolean;
    //   allowedAnswers?: string[];
    // }
    
    // For now, return what we found under `bookingQuestions` if it's there. 
    // Since /products/{id} returns an array of strings in standard v2 (just IDs), we might actually need to return a structured list.
    // Actually, Viator has a separate endpoint or includes details? 
    // Some endpoints may return structured. Let's return raw first. If it's strings, UI might have an issue.
    // Let's assume the UI expects the format we mocked above.
    // If we only get strings like ["TRANSFER_ARRIVAL_FLIGHT_NO"], we map them to basic objects to prevent UI crash.
    let mappedQuestions = bookingQuestions;
    if (bookingQuestions.length > 0 && typeof bookingQuestions[0] === 'string') {
        mappedQuestions = bookingQuestions.map((qId: string) => ({
            questionId: qId,
            question: `Please provide information for: ${qId.replace(/_/g, ' ')}`,
            required: true,
            allowedAnswers: []
        }));
    }

    return NextResponse.json({ bookingQuestions: mappedQuestions });

  } catch (error) {
    console.error("Booking Questions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
