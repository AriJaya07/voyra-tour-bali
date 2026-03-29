import { NextRequest, NextResponse } from "next/server";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS, viatorSignal } from "@/lib/config/viator";

const BALI_DESTINATION_ID = "98";

/**
 * GET /api/viator/attractions?query=temple&page=1&count=10
 *
 * Searches Viator attractions within Bali using /search/freetext
 * with searchType=ATTRACTIONS.
 * Content rendered client-side only (noindex pages).
 */
export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("query") || "bali";
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
    const count = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("count") || "10", 10)));

    if (!VIATOR_API_KEY) {
      return NextResponse.json({
        attractions: [
          {
            attractionId: "12900",
            name: "Uluwatu Temple (Pura Luhur Uluwatu)",
            description: "Iconic clifftop temple with stunning sunset views.",
            imageUrl: "https://dynamic-media.tacdn.com/media/photo-o/31/ff/10/ec/caption.jpg?w=800&h=500&s=1",
            productCount: 449,
            rating: 4.9,
            reviewCount: 26946,
          },
          {
            attractionId: "2338",
            name: "Tegallalang Rice Terraces",
            description: "Famous cascading rice terraces in Ubud.",
            imageUrl: "https://images.unsplash.com/photo-1531592937781-2a5e143da5c3",
            productCount: 320,
            rating: 4.7,
            reviewCount: 8540,
          },
          {
            attractionId: "5638",
            name: "Sacred Monkey Forest Sanctuary",
            description: "Natural habitat for Balinese long-tailed monkeys.",
            imageUrl: "https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8",
            productCount: 280,
            rating: 4.6,
            reviewCount: 12300,
          },
        ],
        totalCount: 3,
        page,
        count,
        hasMore: false,
      });
    }

    const start = (page - 1) * count + 1;

    const res = await fetch(`${VIATOR_API_URL}/search/freetext`, {
      method: "POST",
      headers: VIATOR_HEADERS,
      signal: viatorSignal(),
      body: JSON.stringify({
        searchTerm: query.trim() || "bali",
        searchTypes: [
          {
            searchType: "ATTRACTIONS",
            pagination: { start, count },
          },
        ],
        currency: "USD",
        filtering: { destination: BALI_DESTINATION_ID },
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.message || "Failed to search attractions" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const attractionsData = data.attractions || {};
    const totalCount = attractionsData.totalCount || 0;
    const results = attractionsData.results || [];

    const attractions = results.map((a: Record<string, unknown>) => ({
      attractionId: String(a.id || ""),
      name: a.name || "",
      description: (a.description as string) || "",
      imageUrl: extractImageUrl(a),
      productCount: (a.productsCount as number) || 0,
      rating: (a.reviews as Record<string, unknown>)?.combinedAverageRating || null,
      reviewCount: (a.reviews as Record<string, unknown>)?.totalReviews || 0,
      destinationId: a.primaryDestinationId,
    }));

    return NextResponse.json({
      attractions,
      totalCount,
      page,
      count,
      hasMore: start + count - 1 < totalCount,
    });
  } catch (error) {
    console.error("Attractions search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function extractImageUrl(attraction: Record<string, unknown>): string {
  const images = attraction.images as Array<Record<string, unknown>> | undefined;
  if (!images || images.length === 0) return "";
  const variants = images[0].variants as Array<{ url: string; width: number }> | undefined;
  if (!variants || variants.length === 0) return "";
  const sorted = [...variants].sort((a, b) => Math.abs(a.width - 480) - Math.abs(b.width - 480));
  return sorted[0]?.url || "";
}
