import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const [
    user,
    bookings,
    importedTrips,
    wishlist,
    recentlyViewed,
    notes,
    itineraries,
    preferences,
    notificationPref,
    savedTravelers,
    reviews,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        image: true,
        role: true,
        currency: true,
        provider: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.booking.findMany({ where: { userId }, include: { travelers: true } }),
    prisma.importedTrip.findMany({ where: { userId } }),
    prisma.wishlistItem.findMany({ where: { userId } }),
    prisma.recentlyViewedItem.findMany({ where: { userId } }),
    prisma.baliNote.findMany({ where: { userId } }),
    prisma.savedItinerary.findMany({ where: { userId } }),
    prisma.userPreferences.findUnique({ where: { userId } }),
    prisma.notificationPref.findUnique({ where: { userId } }),
    prisma.savedTraveler.findMany({ where: { userId } }),
    prisma.review.findMany({ where: { userId } }),
  ]);

  const dump = {
    exportedAt: new Date().toISOString(),
    user,
    preferences,
    notificationPref,
    bookings,
    importedTrips,
    wishlist,
    recentlyViewed,
    baliNotes: notes,
    itineraries,
    savedTravelers,
    reviews,
  };

  return new NextResponse(JSON.stringify(dump, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename=voyra-export-${userId}-${Date.now()}.json`,
    },
  });
}
