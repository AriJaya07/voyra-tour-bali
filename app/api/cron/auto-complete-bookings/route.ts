import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Nightly Cron Job: Automatically move CONFIRMED bookings to COMPLETED 
 * if the travel date has passed.
 * Authorized by CRON_SECRET header to prevent public abuse.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await prisma.booking.updateMany({
      where: {
        status: "CONFIRMED",
        travelDate: { lt: today },
      },
      data: {
        status: "COMPLETED",
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Successfully completed ${result.count} past bookings.`,
    });
  } catch (error: any) {
    console.error("[Cron: Auto-Complete Error]", error?.message);
    return NextResponse.json(
      { error: "Failed to auto-complete bookings" },
      { status: 500 }
    );
  }
}
