import { NextRequest, NextResponse } from "next/server";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS, viatorSignal } from "@/lib/config/viator";

/**
 * GET /api/viator/reviews?productCode=XXX&page=1&count=10
 *
 * Fetches product reviews from Viator /reviews/product endpoint.
 * Content is rendered client-side only (not indexed).
 */
export async function GET(req: NextRequest) {
  try {
    const productCode = req.nextUrl.searchParams.get("productCode");
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
    const count = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("count") || "10", 10)));

    if (!productCode) {
      return NextResponse.json({ error: "Missing productCode" }, { status: 400 });
    }

    if (!VIATOR_API_KEY) {
      return NextResponse.json({
        reviews: [
          {
            reviewId: "mock-1",
            rating: 5,
            title: "Amazing experience!",
            text: "This was one of the best tours I have ever taken. Our guide was incredibly knowledgeable.",
            author: "John D.",
            publishedDate: "2025-01-15",
            provider: "VIATOR",
          },
          {
            reviewId: "mock-2",
            rating: 4,
            title: "Great tour, minor delays",
            text: "The tour itself was fantastic but we had a 20 minute delay at pickup.",
            author: "Sarah M.",
            publishedDate: "2025-02-03",
            provider: "TRIPADVISOR",
          },
        ],
        totalCount: 2,
        page,
        count,
        hasMore: false,
      });
    }

    const start = (page - 1) * count + 1;

    const res = await fetch(`${VIATOR_API_URL}/reviews/product`, {
      method: "POST",
      headers: VIATOR_HEADERS,
      signal: viatorSignal(),
      body: JSON.stringify({
        productCode,
        pagination: { start, count },
        sorting: { sort: "MOST_RECENT" },
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.message || "Failed to fetch reviews" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const totalCount = data.totalCount || 0;

    return NextResponse.json({
      reviews: data.reviews || [],
      totalCount,
      page,
      count,
      hasMore: start + count - 1 < totalCount,
    });
  } catch (error) {
    console.error("Reviews error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
