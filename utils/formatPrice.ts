export type CurrencyCode = "IDR" | "USD";

// Approximate conversion rate — update as needed or fetch from an API
const IDR_TO_USD = 0.000063;

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
 * Amounts are assumed to be in IDR. When displaying as USD, the value is converted.
 *
 * @param amount   - The numeric value (in IDR)
 * @param currency - "IDR" (default) or "USD"
 *
 * @example
 *   formatPrice(150000)         // "Rp150.000"
 *   formatPrice(150000, "USD")  // "$9.45"
 */
export function formatPrice(amount: number, currency: CurrencyCode = "IDR"): string {
  const value = currency === "USD" ? amount * IDR_TO_USD : amount;
  return formatters[currency].format(value);
}
