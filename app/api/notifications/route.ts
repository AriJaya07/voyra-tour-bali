import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const status = req.nextUrl.searchParams.get("status") || "all";
    const limit = Math.max(
      1,
      Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "20"))
    );
    const cursorRaw = req.nextUrl.searchParams.get("cursor");
    const cursor = cursorRaw ? parseInt(cursorRaw) : null;
    const category = req.nextUrl.searchParams.get("category");

    const where: Record<string, unknown> = { userId, dismissedAt: null };
    if (status === "unread") where.readAt = null;
    if (status === "read") where.readAt = { not: null };
    if (category) where.category = category;

    const items = await prisma.appNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > limit;
    const slice = hasMore ? items.slice(0, limit) : items;

    const unreadCount = await prisma.appNotification.count({
      where: { userId, readAt: null, dismissedAt: null },
    });

    return NextResponse.json({
      items: slice,
      unreadCount,
      nextCursor: hasMore ? slice[slice.length - 1].id : null,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
