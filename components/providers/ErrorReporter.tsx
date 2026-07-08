"use client";

import { useEffect } from "react";

/**
 * Global client-side error reporter. Catches uncaught errors + unhandled
 * promise rejections and ships them to /api/monitoring/error (→ n8n alert).
 * Deduped and capped per page load so a render loop can't spam the sink.
 */
const seen = new Set<string>();
let sent = 0;
const MAX_PER_LOAD = 5;

const NOISE = [
  "ResizeObserver loop",
  "Script error.",
  "Load failed",
  "NetworkError",
  "AbortError",
];

function report(source: string, message: string, stack?: string) {
  if (!message || sent >= MAX_PER_LOAD) return;
  if (NOISE.some((n) => message.includes(n))) return;
  const key = `${source}:${message}`;
  if (seen.has(key)) return;
  seen.add(key);
  sent++;
  try {
    fetch("/api/monitoring/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        message,
        stack,
        url: window.location.href,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never break the page from the reporter */
  }
}

export default function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      report("window.onerror", e.message, e.error?.stack);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      report(
        "unhandledrejection",
        reason instanceof Error ? reason.message : String(reason ?? "Unknown"),
        reason instanceof Error ? reason.stack : undefined
      );
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
