import { NextResponse } from "next/server";
import { VIATOR_API_KEY } from "@/lib/config/viator";
import { fetchModifiedProducts } from "@/lib/services/viatorSyncService";

/**
 * GET /api/cron/viator-products-sync
 *
 * Cron job to check for modified Viator products.
 * Run every 6 hours to keep product data fresh.
 *
 * vercel.json:
 *   path: /api/cron/viator-products-sync, schedule: every 6 hours
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!VIATOR_API_KEY) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    // Look back 7 hours to safely cover 6-hour intervals
    const modifiedSince = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();

    console.log(`[PRODUCTS SYNC] Checking modifications since ${modifiedSince}`);

    const modifiedProducts = await fetchModifiedProducts(modifiedSince);

    console.log(`[PRODUCTS SYNC] Found ${modifiedProducts.length} modified products`);

    // Products are fetched on-demand from Viator API (not stored in DB).
    // React Query caches them client-side with a 5-min staleTime.
    // This cron job logs modifications for monitoring purposes.
    // If you add a local product cache in the future, sync it here.

    return NextResponse.json({
      success: true,
      modifiedCount: modifiedProducts.length,
      modifiedProducts: modifiedProducts.slice(0, 50), // Log first 50
      checkedSince: modifiedSince,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[PRODUCTS SYNC] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
