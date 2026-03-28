export const VIATOR_API_KEY = process.env.VIATOR_API_KEY || "";
export const VIATOR_API_URL =
  process.env.VIATOR_API_URL || "https://api.viator.com/partner";

export const VIATOR_HEADERS = {
  Accept: "application/json;version=2.0",
  "Accept-Language": "en-US",
  "Content-Type": "application/json",
  "exp-api-key": VIATOR_API_KEY,
};
