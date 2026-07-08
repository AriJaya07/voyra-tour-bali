import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Daily cron: find bookings that started checkout but never paid, and forward
 * them to the n8n recovery workflow (email/WhatsApp nudge). See
 * docs/n8n-workflows.md §2 — n8n dedupes by bookingRef, but the 1–25h window
 * also means a booking is only picked up once on a daily cadence.
 *
 * No-op when N8N_ABANDONED_WEBHOOK_URL is unset.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.N8N_ABANDONED_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ ok: true, skipped: "N8N_ABANDONED_WEBHOOK_URL not set" });
  }

  try {
    const now = Date.now();
    const abandoned = await prisma.booking.findMany({
      where: {
        status: { in: ["PENDING", "PAYMENT"] },
        leadEmail: { not: null },
        isMockMode: false,
        createdAt: {
          gte: new Date(now - 25 * 3600_000),
          lte: new Date(now - 1 * 3600_000),
        },
      },
      select: {
        bookingRef: true,
        productCode: true,
        productTitle: true,
        totalPrice: true,
        currency: true,
        travelDate: true,
        leadFirstName: true,
        leadEmail: true,
        leadPhone: true,
      },
      take: 100,
    });

    const siteUrl = process.env.NEXTAUTH_URL || "";
    let sent = 0;
    for (const b of abandoned) {
      // Best resume point we have: the product page for local tours, home otherwise
      const checkoutUrl = b.productCode.startsWith("LOCAL-")
        ? `${siteUrl}/detail/${b.productCode.replace(/^LOCAL-/, "")}`
        : siteUrl;
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
            totalPrice: b.totalPrice,
            currency: b.currency,
            travelDate: b.travelDate.toISOString().split("T")[0],
            leadFirstName: b.leadFirstName || "",
            leadEmail: b.leadEmail,
            leadPhone: b.leadPhone || "",
            checkoutUrl,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        sent++;
      } catch (e) {
        console.error(
          "[Cron: abandoned-checkout] webhook failed:",
          e instanceof Error ? e.message : "Unknown"
        );
      }
    }

    return NextResponse.json({ ok: true, found: abandoned.length, sent });
  } catch (error) {
    console.error(
      "[Cron: abandoned-checkout]",
      error instanceof Error ? error.message : "Unknown"
    );
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
