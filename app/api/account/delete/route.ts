import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * Hard-deletes the authenticated user. Cascades remove most owned data
 * (Wishlist, RecentlyViewed, ImportedTrip, BaliNote, Itinerary, SavedTraveler,
 * UserPreferences, NotificationPref, RecentlyViewedItem).
 *
 * Bookings cascade-delete too — but we're conservative: bookings tied to
 * payments may have legal-retention requirements. We anonymise rather than
 * delete to keep accounting integrity.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "DELETE") {
    return NextResponse.json(
      { error: "Confirmation required: send { confirm: 'DELETE' }" },
      { status: 400 }
    );
  }

  // Anonymise bookings instead of deleting (legal retention)
  await prisma.booking.updateMany({
    where: { userId },
    data: {
      leadFirstName: "DELETED",
      leadLastName: "USER",
      leadEmail: `deleted-${userId}@voyra.local`,
      leadPhone: null,
      travelersJson: undefined as never,
    },
  });

  // Delete user — cascades remove preferences, wishlist, recentlyViewed, importedTrips,
  // baliNotes, savedItineraries, notificationPref, savedTravelers
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}
