import { NextResponse } from "next/server";

/**
 * Lightweight error sink — forwards client/server errors to an n8n webhook
 * (Telegram/email alerting without a paid APM). No-op when the env var is
 * unset. See docs/n8n-workflows.md §1.
 */
const WEBHOOK_URL = process.env.N8N_ERROR_WEBHOOK_URL;
const WEBHOOK_TOKEN = process.env.N8N_WEBHOOK_TOKEN;

// Best-effort in-memory throttle (per serverless instance) so an error loop
// can't flood the webhook.
let windowStart = 0;
let windowCount = 0;
const WINDOW_MS = 60_000;
const WINDOW_MAX = 20;

export async function POST(request: Request) {
  if (!WEBHOOK_URL) return NextResponse.json({ ok: true });

  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  if (++windowCount > WINDOW_MAX) return NextResponse.json({ ok: true });

  try {
    const body = await request.json().catch(() => ({}));
    const payload = {
      source: typeof body.source === "string" ? body.source.slice(0, 40) : "client",
      message: typeof body.message === "string" ? body.message.slice(0, 500) : "Unknown",
      url: typeof body.url === "string" ? body.url.slice(0, 300) : "",
      stack: typeof body.stack === "string" ? body.stack.slice(0, 1500) : undefined,
      userAgent: request.headers.get("user-agent")?.slice(0, 200) || "",
      ts: new Date().toISOString(),
    };

    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(WEBHOOK_TOKEN ? { "x-webhook-token": WEBHOOK_TOKEN } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Never let the error sink itself throw
  }
  return NextResponse.json({ ok: true });
}
