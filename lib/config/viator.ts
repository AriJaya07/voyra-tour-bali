export const VIATOR_API_KEY = process.env.VIATOR_API_KEY || "";
export const VIATOR_API_URL =
  process.env.VIATOR_API_URL || "https://api.viator.com/partner";
export const VIATOR_MOCK_BOOKING =
  process.env.NEXT_PUBLIC_VIATOR_MOCK_BOOKING === "true";

// ── Affiliate partner id (used to build outbound deep-links to viator.com) ─
export const VIATOR_PARTNER_ID =
  process.env.NEXT_PUBLIC_VIATOR_PARTNER_ID || "P00292613";

function slugifyTitle(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build a Viator product deep-link with affiliate tracking.
 * Falls back to a generic slug when no title is available.
 */
export function buildViatorProductUrl(
  productCode: string,
  title?: string | null
): string {
  const slug = title ? slugifyTitle(title) : "activity";
  const url = new URL(
    `https://www.viator.com/tours/Bali/${slug}/d98-${encodeURIComponent(productCode)}`
  );
  url.searchParams.set("pid", VIATOR_PARTNER_ID);
  url.searchParams.set("medium", "link.partner");
  return url.toString();
}

export const VIATOR_HEADERS = {
  Accept: "application/json;version=2.0",
  "Accept-Language": "en-US",
  "Content-Type": "application/json",
  "exp-api-key": VIATOR_API_KEY,
};

/** Viator API timeout — 120 seconds as required by certification. */
export const VIATOR_TIMEOUT_MS = 120000;

/**
 * Create an AbortSignal that times out after the Viator-required 120s.
 * Use with native fetch: `fetch(url, { signal: viatorSignal(), ... })`
 */
export function viatorSignal(): AbortSignal {
  return AbortSignal.timeout(VIATOR_TIMEOUT_MS);
}
