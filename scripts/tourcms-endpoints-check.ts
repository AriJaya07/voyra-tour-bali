/**
 * Probe key TourCMS endpoints we use in production.
 *
 * Run:
 *   set -a && source .env && set +a && \
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/tourcms-endpoints-check.ts
 *
 * Hits (with caching disabled):
 *   1. /p/tours/search.xml — Bali geo filter
 *   2. /c/tour/show.xml    — first tour from search
 *   3. /c/tour/datesprices/checkavail.xml — first tour, +14 days, 2 adults
 */

import crypto from "crypto";

const API_URL = process.env.TOURCMS_API_URL || "https://api.tourcms.com";
const MARKETPLACE_ID = Number(process.env.TOURCMS_MARKETPLACE_ID || 0);
const PRIVATE_KEY = process.env.TOURCMS_PRIVATE_KEY || "";

const GEO_LAT = process.env.TOURCMS_GEO_LAT || "-8.4095";
const GEO_LONG = process.env.TOURCMS_GEO_LONG || "115.1889";
const GEO_RADIUS_KM = process.env.TOURCMS_GEO_RADIUS_KM || "80";
const COUNTRY_ISO = process.env.TOURCMS_COUNTRY_ISO || "ID";

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

async function call(channelId: number, verb: "GET" | "POST", path: string) {
  const headers = {
    Accept: "application/xml",
    ...sign(channelId, verb, path),
  };
  const res = await fetch(`${API_URL}${path}`, { method: verb, headers });
  const body = await res.text();
  return { status: res.status, body };
}

function pluck(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
  return m ? m[1] : null;
}

async function main() {
  if (!MARKETPLACE_ID || !PRIVATE_KEY) {
    console.error("Missing TOURCMS_MARKETPLACE_ID or TOURCMS_PRIVATE_KEY in env.");
    process.exit(1);
  }

  console.log("=== 1. Search Bali tours (geo + country filter) ===");
  const searchPath =
    `/p/tours/search.xml?per_page=3&page=1&` +
    `lat=${GEO_LAT}&long=${GEO_LONG}&` +
    `geo_distance=${GEO_RADIUS_KM}&geo_unit=km&country=${COUNTRY_ISO}`;
  const search = await call(0, "GET", searchPath);
  console.log(`HTTP ${search.status}`);
  console.log("total_tour_count:", pluck(search.body, "total_tour_count"));
  const channelId = Number(pluck(search.body, "channel_id") || 0);
  const tourId = Number(pluck(search.body, "tour_id") || 0);
  const tourName = pluck(search.body, "tour_name");
  const country = pluck(search.body, "country");
  const city = pluck(search.body, "location") || pluck(search.body, "city");
  console.log(`first tour: channel=${channelId} id=${tourId} "${tourName}" — ${city ?? "?"} / ${country ?? "?"}`);
  console.log("excerpt:", search.body.slice(0, 300));

  if (!tourId || !channelId) {
    console.error("\nNo tours returned for Bali filter. Cannot continue.");
    process.exit(2);
  }

  console.log("\n=== 2. Show tour details ===");
  const showPath = `/c/tour/show.xml?id=${tourId}`;
  const show = await call(channelId, "GET", showPath);
  console.log(`HTTP ${show.status}`);
  console.log("error:", pluck(show.body, "error"));
  console.log("tour_name:", pluck(show.body, "tour_name"));
  console.log("from_price:", pluck(show.body, "from_price"));
  console.log("currency:", pluck(show.body, "sale_currency") || pluck(show.body, "currency"));
  console.log("excerpt:", show.body.slice(0, 250));

  console.log("\n=== 3. Check availability (T+14, 2 adults) ===");
  const date = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
  const availPath = `/c/tour/datesprices/checkavail.xml?id=${tourId}&date=${date}&adults=2`;
  const avail = await call(channelId, "GET", availPath);
  console.log(`HTTP ${avail.status}`);
  console.log("error:", pluck(avail.body, "error"));
  console.log("first component_key:", pluck(avail.body, "component_key"));
  console.log("excerpt:", avail.body.slice(0, 350));

  console.log("\n=== Summary ===");
  console.log("Search:", search.status === 200 ? "✓" : "✗");
  console.log("Show:  ", show.status === 200 ? "✓" : "✗");
  console.log("Avail: ", avail.status === 200 ? "✓" : "✗");
}

main().catch((err) => {
  console.error("[probe] failed:", err instanceof Error ? err.message : err);
  process.exit(3);
});
