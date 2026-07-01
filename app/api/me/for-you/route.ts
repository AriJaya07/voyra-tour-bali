import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { getRecommendationsForUser } from "@/lib/services/recommendationService";

/**
 * GET /api/me/for-you — personalized "For You" catalog rail (Feature 3).
 *
 * Deterministic, credit-free ranking of the Voyra catalog against the user's
 * Traveler DNA profile. Returns empty (authed=false) for guests so the homepage
 * rail simply doesn't render for them.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { authed: false, personalized: false, items: [] },
        { status: 200, headers: { "Cache-Control": "private, max-age=60" } }
      );
    }
    const userId = parseInt(session.user.id);

    const { items, personalized } = await getRecommendationsForUser(userId, 8);

    return NextResponse.json(
      { authed: true, personalized, items },
      { status: 200, headers: { "Cache-Control": "private, max-age=60" } }
    );
  } catch (error) {
    console.error("[api/me/for-you]", error instanceof Error ? error.message : "Unknown");
    // Never break the homepage — degrade to empty.
    return NextResponse.json({ authed: false, personalized: false, items: [] }, { status: 200 });
  }
}
