import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await prisma.tourcmsBooking.updateMany({
      where: {
        status: "CONFIRMED",
        travelDate: { lt: new Date() },
      },
      data: { status: "COMPLETED" },
    });
    return NextResponse.json({
      message: "Auto-complete done",
      completed: result.count,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[TourCMS][cron] auto-complete error:", msg);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
