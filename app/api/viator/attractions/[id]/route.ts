import { NextRequest, NextResponse } from "next/server";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS } from "@/lib/config/viator";

/**
 * GET /api/viator/attractions/[id]
 *
 * Fetches detail for a specific attraction.
 * Content rendered client-side only (noindex pages).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing attraction ID" }, { status: 400 });
    }

    if (!VIATOR_API_KEY) {
      return NextResponse.json({
        attractionId: id,
        name: "Uluwatu Temple",
        description: "Uluwatu Temple (Pura Luhur Uluwatu) is a Balinese Hindu sea temple perched on a steep cliff about 70 meters above sea level.",
        imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4",
        productCount: 45,
        latitude: -8.8291,
        longitude: 115.0849,
      });
    }

    const res = await fetch(`${VIATOR_API_URL}/attractions/${id}`, {
      headers: VIATOR_HEADERS,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.message || "Failed to fetch attraction" },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      attractionId: data.attractionId || data.seoId || id,
      name: data.title || data.name,
      description: data.description || data.shortDescription || "",
      imageUrl: extractImageUrl(data),
      productCount: data.productCount || 0,
      latitude: data.latitude,
      longitude: data.longitude,
      destinationId: data.destinationId,
    });
  } catch (error) {
    console.error("Attraction detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function extractImageUrl(attraction: Record<string, unknown>): string {
  const images = attraction.images as Array<Record<string, unknown>> | undefined;
  if (!images || images.length === 0) return "";
  const variants = images[0].variants as Array<{ url: string; width: number }> | undefined;
  if (!variants || variants.length === 0) return (images[0].url as string) || "";
  const sorted = [...variants].sort((a, b) => Math.abs(a.width - 720) - Math.abs(b.width - 720));
  return sorted[0]?.url || "";
}
