import crypto from "crypto";

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const TOURCMS_API_URL =
  process.env.TOURCMS_API_URL || "https://api.tourcms.com";
export const TOURCMS_MARKETPLACE_ID = intEnv("TOURCMS_MARKETPLACE_ID", 0);
export const TOURCMS_PRIVATE_KEY = process.env.TOURCMS_PRIVATE_KEY || "";
export const TOURCMS_DEFAULT_CHANNEL = intEnv("TOURCMS_DEFAULT_CHANNEL", 0);
/**
 * Channel id used by the listing page when no explicit channel is requested.
 * 0 = marketplace search (`/p/tours/search.xml`, signed with channel=0).
 * Set to a specific operator's channel id to scope the listing to one operator.
 */
export const TOURCMS_LISTING_CHANNEL = intEnv("TOURCMS_LISTING_CHANNEL", 0);
/**
 * Mock mode auto-engages only when credentials are missing.
 * Used by booking/cancel/cron paths as a no-creds safety fallback —
 * product listing/detail always go live to TourCMS.
 */
export const TOURCMS_MOCK = !TOURCMS_PRIVATE_KEY || !TOURCMS_MARKETPLACE_ID;

export const TOURCMS_TIMEOUT_MS = 30_000;

/**
 * Geographic scope filter. Defaults to Bali, Indonesia.
 * Disable by setting TOURCMS_GEO_FILTER=off.
 *
 * Bali bounding circle: centered near Denpasar, ~80km radius covers
 * the entire island incl. Nusa Penida + Nusa Lembongan.
 */
export const TOURCMS_GEO_FILTER =
  (process.env.TOURCMS_GEO_FILTER || "bali").toLowerCase();

export const TOURCMS_GEO_LAT = Number(
  process.env.TOURCMS_GEO_LAT || -8.4095
);
export const TOURCMS_GEO_LONG = Number(
  process.env.TOURCMS_GEO_LONG || 115.1889
);
export const TOURCMS_GEO_RADIUS_KM = Number(
  process.env.TOURCMS_GEO_RADIUS_KM || 80
);
export const TOURCMS_COUNTRY_ISO =
  process.env.TOURCMS_COUNTRY_ISO || "ID";

/**
 * City keyword used for the post-fetch defense-in-depth filter.
 * Comma-separated lowercase substrings — match if any matches city/location/country.
 */
export const TOURCMS_LOCATION_KEYWORDS = (
  process.env.TOURCMS_LOCATION_KEYWORDS ||
  "bali,denpasar,ubud,kuta,seminyak,canggu,sanur,nusa,uluwatu,jimbaran,lovina,amed,tabanan,gianyar"
)
  .toLowerCase()
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function tourcmsSignal(): AbortSignal {
  return AbortSignal.timeout(TOURCMS_TIMEOUT_MS);
}

/**
 * Build TourCMS Marketplace API auth headers.
 *
 * Signature scheme (per official PHP client TourCMS.php):
 *   stringToSign = `${channelId}/${marketpId}/${verb}/${unixTime}${pathWithQuery}`
 *   sig          = rawurlencode(base64(hmac_sha256(privateKey, stringToSign)))
 *   Authorization = `TourCMS ${channelId}:${marketpId}:${sig}`
 *   Date         = RFC 822 GMT, eg "Tue, 28 Apr 2026 17:12:05 GMT"
 *
 * @param channelId 0 for marketplace-wide endpoints, otherwise the channel id
 */
export function buildTourcmsAuthHeader(opts: {
  channelId: number;
  verb: "GET" | "POST";
  pathWithQuery: string;
}): { Authorization: string; Date: string; "x-tourcms-date": string } {
  const ts = Math.floor(Date.now() / 1000);
  const stringToSign = `${opts.channelId}/${TOURCMS_MARKETPLACE_ID}/${opts.verb}/${ts}${opts.pathWithQuery}`;
  const raw = crypto
    .createHmac("sha256", TOURCMS_PRIVATE_KEY)
    .update(stringToSign)
    .digest("base64");
  const sig = encodeURIComponent(raw);
  const dateHeader = new Date(ts * 1000).toUTCString();
  return {
    Authorization: `TourCMS ${opts.channelId}:${TOURCMS_MARKETPLACE_ID}:${sig}`,
    Date: dateHeader,
    "x-tourcms-date": dateHeader,
  };
}
