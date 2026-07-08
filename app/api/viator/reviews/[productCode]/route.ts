import { NextRequest, NextResponse } from "next/server";
import { fetchProductReviewsFull } from "@/lib/services/viatorSyncService";

/**
 * Public review summary + recent reviews for a Viator product.
 * Cached at the edge for a day — review data moves slowly and the Viator
 * endpoint is rate-limited.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productCode: string }> }
) {
  const { productCode } = await params;
  if (!productCode || !/^[A-Za-z0-9_-]{1,32}$/.test(productCode)) {
    return NextResponse.json({ error: "Invalid product code" }, { status: 400 });
  }

  const data = await fetchProductReviewsFull(productCode, 5);

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
