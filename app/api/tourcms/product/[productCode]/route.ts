import { NextRequest, NextResponse } from "next/server";

import { getProduct } from "@/lib/services/tourcmsService";
import { TourcmsApiError } from "@/types/tourcms";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productCode: string }> }
) {
  try {
    const { productCode } = await params;
    const decoded = decodeURIComponent(productCode);
    const product = await getProduct(decoded);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Error fetching TourCMS product:", msg);
    if (error instanceof TourcmsApiError) {
      return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
