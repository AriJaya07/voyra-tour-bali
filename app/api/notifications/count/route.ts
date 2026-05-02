import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ unread: 0 });
    }
    const userId = parseInt(session.user.id);
    const unread = await prisma.appNotification.count({
      where: { userId, readAt: null, dismissedAt: null },
    });
    return NextResponse.json({ unread });
  } catch (error) {
    console.error("Error fetching notification count:", error);
    return NextResponse.json({ unread: 0 });
  }
}
