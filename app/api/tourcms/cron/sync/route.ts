import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { tourcmsClient } from "@/lib/api/tourcms-client";
import { TOURCMS_MOCK } from "@/lib/config/tourcms";
import { retryTourcmsCommit } from "@/lib/services/tourcmsPostPaymentService";

export async function GET(req: NextRequest) {
  if (
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const failedCommits = await prisma.tourcmsBooking.findMany({
      where: {
        status: "CONFIRMED",
        tourcmsBookingStatus: "FAILED",
        tourcmsRetryCount: { lt: 3 },
      },
      select: { id: true },
      take: 50,
    });

    let retried = 0;
    for (const b of failedCommits) {
      const ok = await retryTourcmsCommit(b.id);
      if (ok) retried++;
    }

    let cancelled = 0;
    if (!TOURCMS_MOCK) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const channels = await prisma.tourcmsBooking.findMany({
        where: { tourcmsBookingRef: { not: null } },
        select: { channelId: true },
        distinct: ["channelId"],
      });
      for (const c of channels) {
        try {
          const remoteList = await tourcmsClient.listBookings({
            channelId: c.channelId,
            modifiedSince: since.split("T")[0],
            perPage: 100,
          });
          for (const item of remoteList) {
            if (item.status.toUpperCase() === "CANCELLED" && item.bookingRef) {
              const updated = await prisma.tourcmsBooking.updateMany({
                where: {
                  tourcmsBookingRef: item.bookingRef,
                  status: { notIn: ["CANCELLED", "COMPLETED"] },
                },
                data: { status: "CANCELLED", tourcmsBookingStatus: "CANCELLED" },
              });
              cancelled += updated.count;
            }
          }
        } catch (err) {
          console.error(
            "[TourCMS][cron] sync channel failed:",
            err instanceof Error ? err.message : "Unknown"
          );
        }
      }
    }

    return NextResponse.json({
      message: "Sync complete",
      retriedCommits: retried,
      remoteCancellations: cancelled,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[TourCMS][cron] error:", msg);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
