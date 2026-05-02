import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);
    const result = await prisma.appNotification.updateMany({
      where: { userId, readAt: null, dismissedAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ message: "All marked read", count: result.count });
  } catch (error) {
    console.error("Error marking all read:", error);
    return NextResponse.json(
      { error: "Failed to mark all read" },
      { status: 500 }
    );
  }
}
