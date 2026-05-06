import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";

/**
 * POST /api/admin/db-stats/cleanup
 * Body: { target: "ledger" | "appNotifications" | "emailDelivery", dryRun?: boolean }
 *
 * ADMIN-only proxy that triggers the cleanup cron with CRON_SECRET, so the
 * dashboard can run sweeps on demand without exposing the secret to the client.
 */

const TARGETS: Record<string, string> = {
  ledger: "/api/cron/cleanup-ai-ledger",
  appNotifications: "/api/cron/cleanup-app-notifications",
  emailDelivery: "/api/cron/cleanup-email-delivery",
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { target, dryRun } = body as { target?: string; dryRun?: boolean };

    if (!target || !TARGETS[target]) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const path = TARGETS[target];
    const url = `${origin}${path}${dryRun ? "?dryRun=1" : ""}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(60_000),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.error || "Cleanup failed" }, { status: res.status });
    }
    return NextResponse.json({ target, ...data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Error triggering cleanup:", msg);
    return NextResponse.json({ error: "Failed to trigger cleanup" }, { status: 500 });
  }
}
