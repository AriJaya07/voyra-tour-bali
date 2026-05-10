import { Prisma } from "@prisma/client";

type Snapshot<T> = { value: T; savedAt: number };

const snapshots = new Map<string, Snapshot<unknown>>();

const DEFAULT_TIMEOUT_MS = 2500;

function isDbDownError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientRustPanicError) return true;
  if (err instanceof Prisma.PrismaClientUnknownRequestError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1000", "P1001", "P1002", "P1008", "P1017"].includes(err.code);
  }
  if (err instanceof Error && err.message === "DB_TIMEOUT") return true;
  return false;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("DB_TIMEOUT")), ms)),
  ]);
}

/**
 * Run a Prisma read fail-soft. Returns last successful snapshot when DB is
 * unreachable / times out; otherwise returns the provided fallback. Successful
 * reads are cached in-memory per `key` so subsequent failures degrade to
 * stale-but-usable data instead of blank pages.
 *
 * Use ONLY for non-critical public reads. Booking, payment, auth must surface
 * real errors.
 */
export async function safeDb<T>(
  key: string,
  fn: () => Promise<T>,
  fallback: T,
  opts?: { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    const value = await withTimeout(fn(), timeoutMs);
    snapshots.set(key, { value, savedAt: Date.now() });
    return value;
  } catch (err) {
    const stale = snapshots.get(key) as Snapshot<T> | undefined;
    if (isDbDownError(err)) {
      console.error(
        `[safeDb] DB unreachable for "${key}" — serving ${stale ? "stale snapshot" : "fallback"}.`,
        err instanceof Error ? err.message : err
      );
      return stale ? stale.value : fallback;
    }
    // Unknown error — log and still degrade to fallback rather than 500.
    console.error(`[safeDb] read failed for "${key}":`, err);
    return stale ? stale.value : fallback;
  }
}

export function clearSafeDbCache(key?: string) {
  if (key) snapshots.delete(key);
  else snapshots.clear();
}

/**
 * One-off fail-soft Prisma read. No cache (use for per-slug / per-id reads
 * where caching is unhelpful). Returns `fallback` on timeout / DB-down /
 * unexpected error so the page can render a friendly "unavailable" state
 * instead of a 500.
 */
export async function tryDb<T>(
  fn: () => Promise<T>,
  fallback: T,
  opts?: { timeoutMs?: number; label?: string }
): Promise<T> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    return await withTimeout(fn(), timeoutMs);
  } catch (err) {
    if (isDbDownError(err)) {
      console.error(
        `[tryDb] DB unreachable${opts?.label ? ` (${opts.label})` : ""} — using fallback.`,
        err instanceof Error ? err.message : err
      );
    } else {
      console.error(`[tryDb] read failed${opts?.label ? ` (${opts.label})` : ""}:`, err);
    }
    return fallback;
  }
}
