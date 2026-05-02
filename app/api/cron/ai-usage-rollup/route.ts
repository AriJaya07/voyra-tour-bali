import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron: AI usage retention sweep.
 *
 * Runs daily 04:00 WITA (configurable). Two responsibilities:
 *
 * 1. Aggregate prior-day metrics into a single AiUsage row per (endpoint,status)
 *    with creditsCost = sum, tokensIn/Out = sum, durationMs = avg, meta with
 *    { rollup: true, date, calls }. Lets the admin metrics endpoint stay fast
 *    over long ranges without scanning millions of raw rows.
 *
 * 2. Hard-delete raw, non-rollup AiUsage older than 90 days. Rollup rows kept
 *    indefinitely (cheap — ~30 rows per day).
 *
 * Headers: Authorization: Bearer ${CRON_SECRET}
 */

const RAW_RETENTION_DAYS = 90;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const yStart = new Date(now);
    yStart.setUTCHours(0, 0, 0, 0);
    yStart.setUTCDate(yStart.getUTCDate() - 1);
    const yEnd = new Date(yStart.getTime() + 86_400_000);
    const dateLabel = yStart.toISOString().slice(0, 10);

    // Skip if we've already rolled up this date (idempotent).
    const existing = await prisma.aiUsage.findFirst({
      where: {
        endpoint: "_rollup",
        createdAt: { gte: yStart, lt: yEnd },
      },
      select: { id: true },
    });
    let rollupRowsCreated = 0;

    if (!existing) {
      const grouped = await prisma.aiUsage.groupBy({
        by: ["endpoint", "status"],
        where: {
          createdAt: { gte: yStart, lt: yEnd },
          NOT: { endpoint: "_rollup" },
        },
        _sum: { creditsCost: true, tokensIn: true, tokensOut: true, durationMs: true },
        _count: { _all: true },
      });

      // Marker row first so re-runs see it even if individual writes fail mid-loop.
      await prisma.aiUsage.create({
        data: {
          endpoint: "_rollup",
          creditsCost: 0,
          status: "OK",
          createdAt: yStart,
          meta: { rollupMarker: true, date: dateLabel },
        },
      });

      for (const g of grouped) {
        await prisma.aiUsage.create({
          data: {
            endpoint: `_rollup_${g.endpoint}`,
            creditsCost: g._sum.creditsCost ?? 0,
            tokensIn: g._sum.tokensIn ?? null,
            tokensOut: g._sum.tokensOut ?? null,
            durationMs:
              g._count._all > 0 && g._sum.durationMs != null
                ? Math.round((g._sum.durationMs ?? 0) / g._count._all)
                : null,
            status: g.status,
            createdAt: yStart,
            meta: {
              rollup: true,
              date: dateLabel,
              endpoint: g.endpoint,
              calls: g._count._all,
            },
          },
        });
        rollupRowsCreated++;
      }
    }

    // Retention: drop raw non-rollup rows past the window
    const cutoff = new Date(now.getTime() - RAW_RETENTION_DAYS * 86_400_000);
    const purged = await prisma.aiUsage.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        NOT: [{ endpoint: { startsWith: "_rollup" } }],
      },
    });

    return NextResponse.json({
      rolledDate: dateLabel,
      rollupRowsCreated,
      purgedRawRows: purged.count,
      retentionDays: RAW_RETENTION_DAYS,
    });
  } catch (error) {
    console.error("Error in AI usage rollup cron:", error);
    return NextResponse.json({ error: "Rollup failed" }, { status: 500 });
  }
}
