import { NextRequest, NextResponse } from "next/server";

/**
 * Daily cron dispatcher (Vercel Hobby plan workaround).
 *
 * Hobby plan caps cron jobs at 2 per project AND only allows daily schedules.
 * This single endpoint fans out to every daily task IN PARALLEL via
 * `Promise.allSettled` so the dispatcher's wall-clock time is bounded by the
 * slowest task, not the sum of all of them. Stays under the 60s Hobby
 * function timeout.
 *
 * Each downstream cron handler keeps its own route so it can still be
 * invoked directly (manual ops, ad-hoc triggers, tests). Each is idempotent
 * by design — order-independence is safe.
 */

// Hobby plan max function duration (seconds).
export const maxDuration = 60;

interface TaskResult {
  path: string;
  ok: boolean;
  status: number;
  durationMs: number;
  error?: string;
  body?: unknown;
}

const DAILY_TASKS: string[] = [
  // === Reminders + outreach ===
  "/api/cron/calendar-event-reminders",
  "/api/cron/notification-broadcasts",
  "/api/cron/trip-reminders",
  "/api/cron/abandoned-wishlist",
  "/api/cron/trip-anniversary",
  "/api/cron/nyepi-reminder",
  "/api/cron/volcano-alert",
  "/api/cron/weather-alert",
  "/api/cron/ai-renewal-reminders",
  "/api/cron/ai-welcome-followup",

  // === State-machine ticks ===
  "/api/cron/auto-complete-bookings",
  "/api/cron/ai-subscription-renewals",
  "/api/cron/ai-grace-sweep",

  // === Sweeps + cleanups ===
  "/api/cron/cleanup-booking-tokens",
  "/api/cron/cleanup-recently-viewed",
  "/api/cron/booking-clawback-sweep",
  "/api/cron/ai-expire-credits",

  // === Viator sync ===
  "/api/cron/viator-daily-sync",
  "/api/cron/viator-sync",
  "/api/cron/viator-products-sync",

  // === Rollups (last) ===
  "/api/cron/ai-usage-rollup",
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const startedAt = Date.now();

  async function runTask(path: string): Promise<TaskResult> {
    const taskStart = Date.now();
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: "GET",
        headers: { Authorization: expected },
        // Per-task timeout safely under the 60s Hobby budget so we can collect
        // partial results even if one task hangs.
        signal: AbortSignal.timeout(45_000),
        cache: "no-store",
      });
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        // body may be plain text — keep raw
      }
      return {
        path,
        ok: res.ok,
        status: res.status,
        durationMs: Date.now() - taskStart,
        body: parsed,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      console.error(`[cron-dispatcher] ${path} threw:`, message);
      return {
        path,
        ok: false,
        status: 0,
        durationMs: Date.now() - taskStart,
        error: message,
      };
    }
  }

  // All tasks fan out in parallel. Idempotent by design — order-independence safe.
  const settled = await Promise.allSettled(DAILY_TASKS.map(runTask));
  const results: TaskResult[] = settled.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : {
          path: DAILY_TASKS[i]!,
          ok: false,
          status: 0,
          durationMs: 0,
          error: s.reason instanceof Error ? s.reason.message : "rejected",
        }
  );

  const totalMs = Date.now() - startedAt;
  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  console.log(`[cron-dispatcher] done in ${totalMs}ms — ${okCount} ok / ${failCount} failed`);

  return NextResponse.json({
    totalTasks: results.length,
    okCount,
    failCount,
    totalMs,
    results,
  });
}
