import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Daily: find users who saved wishlist items 3+ days ago and never booked
 * a tour matching that wishlist item. Queue an "abandoned wishlist" reminder.
 *
 * Stub — actual email send wired via lib/email when ESP integration ready.
 * Records EmailDelivery rows so re-runs don't double-send.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  // Wishlist items saved 3-7 days ago
  const items = await prisma.wishlistItem.findMany({
    where: {
      savedAt: { gte: sevenDaysAgo, lte: threeDaysAgo },
    },
    select: { userId: true, productCode: true, source: true, title: true },
  });

  // Group by user
  const byUser = new Map<number, typeof items>();
  for (const it of items) {
    const list = byUser.get(it.userId) ?? [];
    list.push(it);
    byUser.set(it.userId, list);
  }

  let queued = 0;
  for (const [userId, list] of byUser.entries()) {
    // Skip if we sent ABANDONED_WISHLIST in last 14 days
    const recent = await prisma.emailDelivery.findFirst({
      where: {
        userId,
        type: "ABANDONED_WISHLIST",
        createdAt: { gte: new Date(Date.now() - 14 * 24 * 3600 * 1000) },
      },
    });
    if (recent) continue;

    await prisma.emailDelivery.create({
      data: {
        userId,
        type: "ABANDONED_WISHLIST",
        meta: { items: list.slice(0, 3).map((i) => ({ title: i.title, productCode: i.productCode, source: i.source })) },
      },
    });
    queued++;
  }

  // TODO: actual email send via lib/email — read EmailDelivery rows w/ sentAt=null
  return NextResponse.json({
    ok: true,
    candidates: items.length,
    usersQueued: queued,
    note: "Email send not wired. Stub creates EmailDelivery rows; ESP send TODO.",
  });
}
