import { NextResponse } from "next/server";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS, viatorSignal } from "@/lib/config/viator";

/**
 * GET /api/viator/exchange-rates
 *
 * Fetches exchange rates from Viator.
 * Cached and refreshed based on the expiry timestamp from the response.
 */

// In-memory cache for exchange rates
let cachedRates: Record<string, number> | null = null;
let cacheExpiry = 0;

export async function GET() {
  try {
    // Return cached if still valid
    if (cachedRates && Date.now() < cacheExpiry) {
      return NextResponse.json({
        rates: cachedRates,
        cached: true,
        expiresAt: new Date(cacheExpiry).toISOString(),
      });
    }

    if (!VIATOR_API_KEY) {
      return NextResponse.json({
        rates: {
          USD: 1,
          IDR: 15850,
          EUR: 0.92,
          GBP: 0.79,
          AUD: 1.53,
          CAD: 1.36,
        },
        cached: false,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
    }

    const res = await fetch(`${VIATOR_API_URL}/exchange-rates`, {
      headers: VIATOR_HEADERS,
      signal: viatorSignal(),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.message || "Failed to fetch exchange rates" },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Build rate map
    const rates: Record<string, number> = {};
    for (const rate of data.rates || data.exchangeRates || []) {
      if (rate.targetCurrency && rate.rate) {
        rates[rate.targetCurrency] = rate.rate;
      }
    }

    // Cache based on expiry from response, or default 24 hours
    const expiryStr = data.expiry || data.expiresAt;
    const expiryMs = expiryStr
      ? new Date(expiryStr).getTime()
      : Date.now() + 86400000;

    cachedRates = rates;
    cacheExpiry = expiryMs;

    return NextResponse.json({
      rates,
      cached: false,
      expiresAt: new Date(expiryMs).toISOString(),
    });
  } catch (error) {
    console.error("Exchange rates error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
