import { NextResponse } from "next/server";
import { AI_PACKS, AI_PLANS } from "@/lib/config/aiPlans";

/**
 * GET /api/ai/plans
 *
 * Public catalog of subscription plans + top-up packs. Used by /plans page
 * and the in-app upgrade modal. Cacheable.
 */
export function GET() {
  return NextResponse.json(
    {
      plans: Object.values(AI_PLANS),
      packs: Object.values(AI_PACKS),
    },
    {
      headers: { "Cache-Control": "public, max-age=300" },
    }
  );
}
