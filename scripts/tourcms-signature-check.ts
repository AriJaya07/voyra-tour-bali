/**
 * Standalone signature smoke test for the TourCMS Marketplace API.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/tourcms-signature-check.ts
 *
 * Validates:
 *   - HMAC-SHA256(base64) signing matches the official TourCMS PHP client
 *   - GET /p/tours/search.xml succeeds with the provided creds
 *
 * Required env:
 *   TOURCMS_API_URL (default https://api.tourcms.com)
 *   TOURCMS_MARKETPLACE_ID  ← "TourCMS Marketplace Account ID" in dashboard
 *   TOURCMS_PRIVATE_KEY     ← "Private API key" in dashboard (HMAC secret)
 *
 * Pure HTTP probe. No DB writes.
 */

import crypto from "crypto";

const API_URL = process.env.TOURCMS_API_URL || "https://api.tourcms.com";
const MARKETPLACE_ID = Number(process.env.TOURCMS_MARKETPLACE_ID || 0);
const PRIVATE_KEY = process.env.TOURCMS_PRIVATE_KEY || "";

function sign(channelId: number, verb: "GET" | "POST", path: string) {
  const ts = Math.floor(Date.now() / 1000);
  const stringToSign = `${channelId}/${MARKETPLACE_ID}/${verb}/${ts}${path}`;
  const sig = crypto
    .createHmac("sha256", PRIVATE_KEY)
    .update(stringToSign)
    .digest("base64");
  return {
    Authorization: `TourCMS ${channelId}:${MARKETPLACE_ID}:${encodeURIComponent(sig)}`,
    Date: new Date(ts * 1000).toUTCString(),
  };
}

async function main() {
  if (!MARKETPLACE_ID || !PRIVATE_KEY) {
    console.error(
      "Missing TOURCMS_MARKETPLACE_ID or TOURCMS_PRIVATE_KEY in env. Set them and re-run."
    );
    process.exit(1);
  }

  const path = "/p/tours/search.xml?per_page=1";
  const headers = {
    Accept: "application/xml",
    ...sign(0, "GET", path),
  };

  const res = await fetch(`${API_URL}${path}`, { headers });
  const body = await res.text();
  console.log(`[smoke] HTTP ${res.status} ${res.statusText}`);
  console.log("[smoke] Body preview:");
  console.log(body.slice(0, 400));

  if (!res.ok) {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error("[smoke] failed:", err instanceof Error ? err.message : err);
  process.exit(3);
});
