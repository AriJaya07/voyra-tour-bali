const FALLBACK_RATES_TO_IDR: Record<string, number> = {
  IDR: 1,
  USD: 16500,
  EUR: 17800,
  GBP: 20800,
  AUD: 10800,
  CAD: 12100,
  SGD: 12200,
  JPY: 110,
};

let cachedRates: Record<string, number> | null = null;
let cacheExpiry = 0;

async function fetchRatesViaInternal(): Promise<Record<string, number> | null> {
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) return null;
  try {
    const res = await fetch(`${baseUrl}/api/viator/exchange-rates`, {
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: Record<string, number> };
    if (!data.rates || typeof data.rates !== "object") return null;
    return data.rates;
  } catch {
    return null;
  }
}

export async function getRateToIdr(currency: string): Promise<number> {
  const cur = (currency || "IDR").toUpperCase();
  if (cur === "IDR") return 1;

  if (cachedRates && Date.now() < cacheExpiry) {
    if (cachedRates[cur] && cachedRates.IDR) {
      return cachedRates.IDR / cachedRates[cur];
    }
  }

  const rates = await fetchRatesViaInternal();
  if (rates && rates[cur] && rates.IDR) {
    cachedRates = rates;
    cacheExpiry = Date.now() + 30 * 60 * 1000;
    return rates.IDR / rates[cur];
  }

  return FALLBACK_RATES_TO_IDR[cur] ?? FALLBACK_RATES_TO_IDR.USD;
}
