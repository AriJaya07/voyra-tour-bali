import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBroadcast } from "@/lib/services/notificationService";

/**
 * Picks SCHEDULED broadcasts whose scheduledAt has elapsed and fans them out.
 * Authorized via CRON_SECRET Bearer token. Designed to run every 5 minutes.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.notificationBroadcast.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: new Date() },
    },
    select: { id: true },
    take: 25,
  });

  let sent = 0;
  const errors: { id: number; error: string }[] = [];
  for (const b of due) {
    try {
      await sendBroadcast(b.id);
      sent++;
    } catch (err) {
      errors.push({ id: b.id, error: err instanceof Error ? err.message : "Unknown" });
    }
  }

  return NextResponse.json({ sent, candidates: due.length, errors });
}
