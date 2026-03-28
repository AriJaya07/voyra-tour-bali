export type CurrencyCode = "IDR" | "USD";

// Fallback rates — used when Viator rates aren't loaded yet
const FALLBACK_IDR_TO_USD = 0.000063;
const FALLBACK_USD_TO_IDR = 1 / FALLBACK_IDR_TO_USD;

const formatters: Record<CurrencyCode, Intl.NumberFormat> = {
  IDR: new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
  USD: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
};

/**
 * Format a number as a currency string.
 *
 * @param amount        - The price value
 * @param currency      - Target display currency ("IDR" or "USD")
 * @param sourceCurrency - Original currency of the amount (if different, will convert)
 * @param liveRates     - Viator exchange rates (e.g. { USD: 1, IDR: 15850 })
 */
export function formatPrice(
  amount: number,
  currency: CurrencyCode = "IDR",
  sourceCurrency?: CurrencyCode,
  liveRates?: Record<string, number> | null
): string {
  let value = amount;

  if (sourceCurrency && sourceCurrency !== currency) {
    if (liveRates && liveRates[sourceCurrency] && liveRates[currency]) {
      // Use Viator exchange rates: convert source → USD base → target
      const sourceToUsd = 1 / liveRates[sourceCurrency];
      const usdToTarget = liveRates[currency];
      value = amount * sourceToUsd * usdToTarget;
    } else {
      // Fallback to hardcoded rates
      if (sourceCurrency === "IDR" && currency === "USD") {
        value = amount * FALLBACK_IDR_TO_USD;
      } else if (sourceCurrency === "USD" && currency === "IDR") {
        value = amount * FALLBACK_USD_TO_IDR;
      }
    }
  }

  return formatters[currency].format(value);
}
