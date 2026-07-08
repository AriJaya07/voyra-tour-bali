import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Daily cron: bookings whose trip finished yesterday → n8n post-trip workflow
 * (review request + friend-referral email). See docs/n8n-workflows.md §4.
 * Window is exactly yesterday so each booking fires once on a daily cadence.
 *
 * No-op when N8N_POSTTRIP_WEBHOOK_URL is unset.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.N8N_POSTTRIP_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ ok: true, skipped: "N8N_POSTTRIP_WEBHOOK_URL not set" });
  }

  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 3600_000);

    const completed = await prisma.booking.findMany({
      where: {
        status: { in: ["COMPLETED", "CONFIRMED"] },
        isMockMode: false,
        travelDate: { gte: startOfYesterday, lt: startOfToday },
      },
      select: {
        bookingRef: true,
        productTitle: true,
        leadFirstName: true,
        leadEmail: true,
        user: { select: { name: true, email: true } },
      },
      take: 100,
    });

    let sent = 0;
    for (const b of completed) {
      const email = b.leadEmail || b.user?.email;
      if (!email) continue;
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(process.env.N8N_WEBHOOK_TOKEN
              ? { "x-webhook-token": process.env.N8N_WEBHOOK_TOKEN }
              : {}),
          },
          body: JSON.stringify({
            bookingRef: b.bookingRef,
            productTitle: b.productTitle,
            leadFirstName: b.leadFirstName || b.user?.name || "",
            leadEmail: email,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        sent++;
      } catch (e) {
        console.error(
          "[Cron: post-trip] webhook failed:",
          e instanceof Error ? e.message : "Unknown"
        );
      }
    }

    return NextResponse.json({ ok: true, found: completed.length, sent });
  } catch (error) {
    console.error("[Cron: post-trip]", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
