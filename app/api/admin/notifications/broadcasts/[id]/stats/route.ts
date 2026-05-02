import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user?.id || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    const [delivered, read, dismissed] = await Promise.all([
      prisma.appNotification.count({ where: { broadcastId: id } }),
      prisma.appNotification.count({
        where: { broadcastId: id, readAt: { not: null } },
      }),
      prisma.appNotification.count({
        where: { broadcastId: id, dismissedAt: { not: null } },
      }),
    ]);

    return NextResponse.json({ delivered, read, dismissed });
  } catch (error) {
    console.error("Error fetching broadcast stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
