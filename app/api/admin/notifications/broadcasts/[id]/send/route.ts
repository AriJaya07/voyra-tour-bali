import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { sendBroadcast } from "@/lib/services/notificationService";

export async function POST(
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
    const broadcast = await prisma.notificationBroadcast.findUnique({ where: { id } });
    if (!broadcast) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (broadcast.status === "SENT") {
      return NextResponse.json(
        { error: "Broadcast already sent." },
        { status: 400 }
      );
    }
    if (broadcast.status === "SENDING") {
      return NextResponse.json(
        { error: "Broadcast is already being sent." },
        { status: 400 }
      );
    }

    const result = await sendBroadcast(id);
    return NextResponse.json({ message: "Broadcast sent", ...result });
  } catch (error) {
    console.error("Error sending broadcast:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send" },
      { status: 500 }
    );
  }
}
