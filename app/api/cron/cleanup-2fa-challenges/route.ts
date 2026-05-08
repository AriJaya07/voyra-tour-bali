import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron: TwoFactorChallenge retention sweep.
 *
 * Each login attempt + email-OTP send creates a row. Most are short-lived
 * but never cleaned. Strategy:
 *   - Unverified expired rows older than 7d: delete (forensic value gone)
 *   - Verified/consumed rows older than 30d: delete
 *
 * Authorized by CRON_SECRET. Supports ?dryRun=1.
 */

const UNVERIFIED_RETENTION_DAYS = 7;
const VERIFIED_RETENTION_DAYS = 30;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const now = Date.now();
    const unverifiedCutoff = new Date(now - UNVERIFIED_RETENTION_DAYS * 86_400_000);
    const verifiedCutoff = new Date(now - VERIFIED_RETENTION_DAYS * 86_400_000);

    const unverifiedWhere = {
      verified: false,
      consumedAt: null,
      expiresAt: { lt: unverifiedCutoff },
    };

    const verifiedWhere = {
      OR: [
        { verified: true, createdAt: { lt: verifiedCutoff } },
        { consumedAt: { lt: verifiedCutoff } },
      ],
    };

    if (dryRun) {
      const [unverifiedCount, verifiedCount] = await Promise.all([
        prisma.twoFactorChallenge.count({ where: unverifiedWhere }),
        prisma.twoFactorChallenge.count({ where: verifiedWhere }),
      ]);
      return NextResponse.json({
        dryRun: true,
        wouldDeleteUnverified: unverifiedCount,
        wouldDeleteVerified: verifiedCount,
      });
    }

    const [unverified, verified] = await Promise.all([
      prisma.twoFactorChallenge.deleteMany({ where: unverifiedWhere }),
      prisma.twoFactorChallenge.deleteMany({ where: verifiedWhere }),
    ]);

    return NextResponse.json({
      success: true,
      deletedUnverified: unverified.count,
      deletedVerified: verified.count,
      retention: {
        unverifiedDays: UNVERIFIED_RETENTION_DAYS,
        verifiedDays: VERIFIED_RETENTION_DAYS,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Cron: cleanup-2fa-challenges]", msg);
    return NextResponse.json({ error: "Failed to cleanup 2FA challenges" }, { status: 500 });
  }
}
