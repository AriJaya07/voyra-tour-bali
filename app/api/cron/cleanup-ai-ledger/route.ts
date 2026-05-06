import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron: AiCreditLedger retention sweep.
 *
 * Deletes closed audit rows past their retention window.
 *   - SETTLED / CANCELLED rows older than 180d
 *   - Plain (non-reservation) closed rows older than 365d
 * RESERVED rows are kept indefinitely (active reservations).
 *
 * Authorized by CRON_SECRET. Supports ?dryRun=1 for first-week safety check.
 */

const SETTLED_RETENTION_DAYS = 180;
const PLAIN_RETENTION_DAYS = 365;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const now = Date.now();
    const settledCutoff = new Date(now - SETTLED_RETENTION_DAYS * 86_400_000);
    const plainCutoff = new Date(now - PLAIN_RETENTION_DAYS * 86_400_000);

    const settledWhere = {
      reservationStatus: { in: ["SETTLED", "CANCELLED"] },
      settledAt: { lt: settledCutoff },
    };

    const plainWhere = {
      reservationStatus: null,
      createdAt: { lt: plainCutoff },
    };

    if (dryRun) {
      const [settledCount, plainCount] = await Promise.all([
        prisma.aiCreditLedger.count({ where: settledWhere }),
        prisma.aiCreditLedger.count({ where: plainWhere }),
      ]);
      return NextResponse.json({
        dryRun: true,
        wouldDeleteSettled: settledCount,
        wouldDeletePlain: plainCount,
      });
    }

    const [settled, plain] = await Promise.all([
      prisma.aiCreditLedger.deleteMany({ where: settledWhere }),
      prisma.aiCreditLedger.deleteMany({ where: plainWhere }),
    ]);

    return NextResponse.json({
      success: true,
      deletedSettled: settled.count,
      deletedPlain: plain.count,
      retention: { settledDays: SETTLED_RETENTION_DAYS, plainDays: PLAIN_RETENTION_DAYS },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Cron: cleanup-ai-ledger]", msg);
    return NextResponse.json({ error: "Failed to cleanup ledger" }, { status: 500 });
  }
}
