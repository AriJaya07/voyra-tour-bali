import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron: AiCreditLedger + AiCreditGrant retention sweep.
 *
 * Ledger:
 *   - SETTLED / CANCELLED rows older than 180d
 *   - Plain (non-reservation) closed rows older than 365d
 *   - RESERVED rows kept indefinitely (active reservations).
 *
 * Grants (added 2026-05):
 *   - Fully consumed (`remaining = 0`) grants whose `expiresAt` is older than
 *     180d → delete. Keeps recent receipts for audit while stopping unbounded
 *     growth.
 *
 * Authorized by CRON_SECRET. Supports ?dryRun=1 for first-week safety check.
 */

const SETTLED_RETENTION_DAYS = 180;
const PLAIN_RETENTION_DAYS = 365;
const CONSUMED_GRANT_RETENTION_DAYS = 180;

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

    const grantCutoff = new Date(now - CONSUMED_GRANT_RETENTION_DAYS * 86_400_000);

    const settledWhere = {
      reservationStatus: { in: ["SETTLED", "CANCELLED"] },
      settledAt: { lt: settledCutoff },
    };

    const plainWhere = {
      reservationStatus: null,
      createdAt: { lt: plainCutoff },
    };

    const grantWhere = {
      remaining: 0,
      expiresAt: { lt: grantCutoff },
    };

    if (dryRun) {
      const [settledCount, plainCount, grantCount] = await Promise.all([
        prisma.aiCreditLedger.count({ where: settledWhere }),
        prisma.aiCreditLedger.count({ where: plainWhere }),
        prisma.aiCreditGrant.count({ where: grantWhere }),
      ]);
      return NextResponse.json({
        dryRun: true,
        wouldDeleteSettled: settledCount,
        wouldDeletePlain: plainCount,
        wouldDeleteGrants: grantCount,
      });
    }

    const [settled, plain, grants] = await Promise.all([
      prisma.aiCreditLedger.deleteMany({ where: settledWhere }),
      prisma.aiCreditLedger.deleteMany({ where: plainWhere }),
      prisma.aiCreditGrant.deleteMany({ where: grantWhere }),
    ]);

    return NextResponse.json({
      success: true,
      deletedSettled: settled.count,
      deletedPlain: plain.count,
      deletedGrants: grants.count,
      retention: {
        settledDays: SETTLED_RETENTION_DAYS,
        plainDays: PLAIN_RETENTION_DAYS,
        grantDays: CONSUMED_GRANT_RETENTION_DAYS,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Cron: cleanup-ai-ledger]", msg);
    return NextResponse.json({ error: "Failed to cleanup ledger" }, { status: 500 });
  }
}
