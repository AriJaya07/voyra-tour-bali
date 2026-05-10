import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TIMEOUT_MS = 2500;

export async function GET() {
  const startedAt = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, rej) => setTimeout(() => rej(new Error("DB_TIMEOUT")), TIMEOUT_MS)),
    ]);
    return NextResponse.json(
      { ok: true, latencyMs: Date.now() - startedAt },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("[health/db] DB unreachable:", message);
    return NextResponse.json(
      { ok: false, error: message, latencyMs: Date.now() - startedAt },
      { status: 503 },
    );
  }
}
