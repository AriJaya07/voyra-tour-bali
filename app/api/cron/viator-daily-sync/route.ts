import { NextResponse } from "next/server";
import { VIATOR_API_KEY } from "@/lib/config/viator";
import {
  fetchProductTags,
  fetchLocationsBulk,
} from "@/lib/services/viatorSyncService";

/**
 * GET /api/cron/viator-daily-sync
 *
 * Daily cron job to sync:
 * - /products/tags — category mappings
 * - /locations/bulk — pickup and meeting point data
 *
 * vercel.json:
 *   path: /api/cron/viator-daily-sync, schedule: every 24 hours
 */

// In-memory caches (refreshed daily by this cron)
let cachedTags: Array<{ tagId: number; name: string; parentTagIds?: number[] }> = [];
let cachedLocationRefs: string[] = [];
let lastSyncAt: string | null = null;

export { cachedTags, lastSyncAt };

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!VIATOR_API_KEY) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    console.log("[DAILY SYNC] Starting daily sync...");

    // 1. Sync product tags
    const tags = await fetchProductTags();
    cachedTags = tags;
    console.log(`[DAILY SYNC] Fetched ${tags.length} product tags`);

    // 2. Sync locations if we have cached refs from previous product fetches
    let locationsCount = 0;
    if (cachedLocationRefs.length > 0) {
      const locations = await fetchLocationsBulk(cachedLocationRefs);
      locationsCount = locations.length;
      console.log(`[DAILY SYNC] Refreshed ${locationsCount} locations`);
    }

    lastSyncAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      tagsCount: tags.length,
      locationsCount,
      syncedAt: lastSyncAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[DAILY SYNC] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Register location refs to be refreshed on the next daily sync.
 */
export function registerLocationRefs(refs: string[]) {
  const unique = new Set([...cachedLocationRefs, ...refs]);
  cachedLocationRefs = [...unique].slice(0, 5000);
}
