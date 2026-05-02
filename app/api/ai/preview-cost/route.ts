import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { estimateCost } from "@/lib/services/aiCreditService";
import type { AiEndpoint } from "@/lib/config/aiCosts";

const VALID_ENDPOINTS = new Set<AiEndpoint>([
  "chat",
  "plan",
  "plan_refine",
  "search",
  "concierge",
  "day_of_trip",
  "cultural",
  "voucher_read",
]);

/**
 * POST /api/ai/preview-cost
 * Body: { endpoint: AiEndpoint, params?: { days?: number } }
 *
 * Returns the credit cost the user *would* spend on this action, plus the
 * resulting balance, plus a freeForTraveler flag for day-of-trip in trip
 * window. Used by the UI to render a "Cost: 2 cr · You have 42" pill before
 * the user clicks Submit. Spends nothing.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const endpoint = body?.endpoint as AiEndpoint;
    if (!VALID_ENDPOINTS.has(endpoint)) {
      return NextResponse.json({ error: "Unknown endpoint" }, { status: 400 });
    }

    const params = body?.params as { days?: number } | undefined;
    const estimate = await estimateCost(userId, endpoint, params);

    return NextResponse.json(estimate, {
      headers: { "Cache-Control": "private, no-cache" },
    });
  } catch (error) {
    console.error("Error estimating AI cost:", error);
    return NextResponse.json({ error: "Failed to estimate cost" }, { status: 500 });
  }
}
