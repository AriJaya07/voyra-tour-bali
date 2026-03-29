export const VIATOR_API_KEY = process.env.VIATOR_API_KEY || "";
export const VIATOR_API_URL =
  process.env.VIATOR_API_URL || "https://api.viator.com/partner";
export const VIATOR_MOCK_BOOKING =
  process.env.VIATOR_MOCK_BOOKING === "true";

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
