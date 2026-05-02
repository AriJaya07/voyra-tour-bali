import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { getEffectivePlan } from "@/lib/services/aiCreditService";

const EMPTY = {
  authed: false,
  unreadInbox: 0,
  upcomingEvents: 0,
  nextEvent: null,
  nextTrip: null,
  wishlistCount: 0,
  notesCount: 0,
  itineraryCount: 0,
  loyaltyPoints: 0,
  aiCreditsRemaining: 0,
  aiPlan: "FREE" as const,
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(EMPTY, { status: 200 });
    }
    const userId = parseInt(session.user.id);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfWindow = new Date(startOfToday.getTime() + 7 * 86400000);

    const [
      unreadInbox,
      wishlistCount,
      notesCount,
      itineraryCount,
      upcomingEvents,
      nextEvent,
      nextTrip,
      loyalty,
      aiWallet,
      aiPlan,
    ] = await Promise.all([
      prisma.appNotification.count({
        where: { userId, readAt: null, dismissedAt: null },
      }),
      prisma.wishlistItem.count({ where: { userId } }),
      prisma.baliNote.count({ where: { userId } }),
      prisma.savedItinerary.count({ where: { userId } }),
      prisma.calendarEvent.count({
        where: { userId, date: { gte: startOfToday, lt: endOfWindow } },
      }),
      prisma.calendarEvent.findFirst({
        where: { userId, date: { gte: startOfToday } },
        orderBy: { date: "asc" },
        select: { id: true, title: true, date: true, startTime: true, location: true },
      }),
      prisma.importedTrip.findFirst({
        where: { userId, travelDate: { gte: startOfToday } },
        orderBy: { travelDate: "asc" },
        select: { id: true, productTitle: true, travelDate: true, productImage: true },
      }),
      prisma.loyaltyAccount.findUnique({
        where: { userId },
        select: { pointsBalance: true, tier: true },
      }),
      prisma.aiCreditWallet.findUnique({ where: { userId }, select: { balance: true } }),
      getEffectivePlan(userId),
    ]);

    return NextResponse.json(
      {
        authed: true,
        unreadInbox,
        upcomingEvents,
        nextEvent,
        nextTrip,
        wishlistCount,
        notesCount,
        itineraryCount,
        loyaltyPoints: loyalty?.pointsBalance ?? 0,
        loyaltyTier: loyalty?.tier ?? null,
        aiCreditsRemaining: aiWallet?.balance ?? 0,
        aiPlan,
      },
      {
        headers: { "Cache-Control": "private, max-age=30" },
      }
    );
  } catch (error) {
    console.error("Error fetching toolkit data:", error);
    return NextResponse.json(EMPTY, { status: 200 });
  }
}
