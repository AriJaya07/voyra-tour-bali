import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteImageFromS3 } from "@/utils/common/s3";

/**
 * Cron: Orphan Image reaper.
 *
 * App contract: each Image row attaches to exactly one of
 * destination/package/content/location. Rows with all four FKs null are
 * leftovers from interrupted upload flows or aborted creates. After 7d there
 * is no in-flight create that could still adopt them.
 *
 * Each orphan is deleted from S3 first, then from DB. Best-effort: an S3
 * failure does not block DB cleanup but is logged.
 *
 * Authorized by CRON_SECRET. Supports ?dryRun=1.
 */

const ORPHAN_GRACE_DAYS = 7;
const BATCH_LIMIT = 200;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const cutoff = new Date(Date.now() - ORPHAN_GRACE_DAYS * 86_400_000);
    const where = {
      destinationId: null,
      packageId: null,
      contentId: null,
      locationId: null,
      createdAt: { lt: cutoff },
    };

    if (dryRun) {
      const wouldDelete = await prisma.image.count({ where });
      return NextResponse.json({ dryRun: true, wouldDelete });
    }

    const orphans = await prisma.image.findMany({
      where,
      select: { id: true, key: true },
      take: BATCH_LIMIT,
    });

    let s3Errors = 0;
    await Promise.all(
      orphans.map(async (o) => {
        if (!o.key) return;
        try {
          await deleteImageFromS3(o.key);
        } catch (err) {
          s3Errors++;
          console.error(
            "[Cron: cleanup-orphan-images] S3 delete failed:",
            err instanceof Error ? err.message : "Unknown"
          );
        }
      })
    );

    const ids = orphans.map((o) => o.id);
    const result = ids.length
      ? await prisma.image.deleteMany({ where: { id: { in: ids } } })
      : { count: 0 };

    return NextResponse.json({
      success: true,
      deleted: result.count,
      s3Errors,
      batchLimit: BATCH_LIMIT,
      retention: { graceDays: ORPHAN_GRACE_DAYS },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Cron: cleanup-orphan-images]", msg);
    return NextResponse.json({ error: "Failed to cleanup orphan images" }, { status: 500 });
  }
}
