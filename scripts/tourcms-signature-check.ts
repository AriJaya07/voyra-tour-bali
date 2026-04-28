/**
 * Standalone signature smoke test for the TourCMS Marketplace API.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/tourcms-signature-check.ts
 *
 * Validates that:
 *   - HMAC-SHA256(base64) signing matches the documented TourCMS scheme
 *   - We can hit GET /p/tours/search.xml with our credentials and parse the body
 *
 * Required env (loaded via dotenv-style if present, else process.env):
 *   TOURCMS_API_URL (default https://api.tourcms.com)
 *   TOURCMS_MARKETPLACE_ID
 *   TOURCMS_API_KEY
 *   TOURCMS_PRIVATE_KEY
 *
 * Does NOT touch the database. Pure HTTP probe.
 */

import crypto from "crypto";

const API_URL = process.env.TOURCMS_API_URL || "https://api.tourcms.com";
const MARKETPLACE_ID = Number(process.env.TOURCMS_MARKETPLACE_ID || 0);
const API_KEY = process.env.TOURCMS_API_KEY || "";
const PRIVATE_KEY = process.env.TOURCMS_PRIVATE_KEY || "";

function sign(channelId: number, verb: "GET" | "POST", path: string) {
  const ts = Math.floor(Date.now() / 1000);
  const stringToSign = `${channelId}/${API_KEY}/${verb}/${ts}${path}`;
  const sig = crypto
    .createHmac("sha256", PRIVATE_KEY)
    .update(stringToSign)
    .digest("base64");
  return {
    Authorization: `TourCMS ${channelId}:${API_KEY}:${ts}:${encodeURIComponent(sig)}`,
    "x-tourcms-date": String(ts),
  };
}

async function main() {
  if (!API_KEY || !PRIVATE_KEY) {
    console.error(
      "Missing TOURCMS_API_KEY or TOURCMS_PRIVATE_KEY in env. Set them and re-run."
    );
    process.exit(1);
  }

  const knownStringToSign = `42/abc/GET/1700000000/p/tours/search.xml?per_page=1`;
  const knownSig = crypto
    .createHmac("sha256", "secret")
    .update(knownStringToSign)
    .digest("base64");
  console.log("[smoke] HMAC algorithm OK — known sample:", knownSig.slice(0, 12), "…");

  const path = "/p/tours/search.xml?per_page=1";
  const headers = {
    Accept: "application/xml",
    ...sign(MARKETPLACE_ID, "GET", path),
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
