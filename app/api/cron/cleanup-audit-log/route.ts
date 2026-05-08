import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron: AuditLog retention sweep.
 *
 * Two retention buckets:
 *   - Security events (login attempts, 2FA, lockouts, admin resets) — 365d
 *   - Low-value events (admin views, OTP sends, retention runs) — 90d
 *
 * Authorized by CRON_SECRET. Supports ?dryRun=1.
 */

const SECURITY_RETENTION_DAYS = 365;
const LOW_VALUE_RETENTION_DAYS = 90;

const LOW_VALUE_EVENTS = [
  "ADMIN_USER_VIEW",
  "2FA_EMAIL_OTP_SENT",
  "RETENTION_RUN",
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const now = Date.now();
    const securityCutoff = new Date(now - SECURITY_RETENTION_DAYS * 86_400_000);
    const lowValueCutoff = new Date(now - LOW_VALUE_RETENTION_DAYS * 86_400_000);

    const lowValueWhere = {
      event: { in: LOW_VALUE_EVENTS },
      createdAt: { lt: lowValueCutoff },
    };

    const securityWhere = {
      event: { notIn: LOW_VALUE_EVENTS },
      createdAt: { lt: securityCutoff },
    };

    if (dryRun) {
      const [lowValueCount, securityCount] = await Promise.all([
        prisma.auditLog.count({ where: lowValueWhere }),
        prisma.auditLog.count({ where: securityWhere }),
      ]);
      return NextResponse.json({
        dryRun: true,
        wouldDeleteLowValue: lowValueCount,
        wouldDeleteSecurity: securityCount,
      });
    }

    const [lowValue, security] = await Promise.all([
      prisma.auditLog.deleteMany({ where: lowValueWhere }),
      prisma.auditLog.deleteMany({ where: securityWhere }),
    ]);

    const total = lowValue.count + security.count;
    if (total > 0) {
      await prisma.auditLog
        .create({
          data: {
            event: "RETENTION_RUN",
            meta: {
              table: "AuditLog",
              deletedLowValue: lowValue.count,
              deletedSecurity: security.count,
            },
          },
        })
        .catch(() => null);
    }

    return NextResponse.json({
      success: true,
      deletedLowValue: lowValue.count,
      deletedSecurity: security.count,
      retention: {
        securityDays: SECURITY_RETENTION_DAYS,
        lowValueDays: LOW_VALUE_RETENTION_DAYS,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Cron: cleanup-audit-log]", msg);
    return NextResponse.json({ error: "Failed to cleanup audit log" }, { status: 500 });
  }
}
