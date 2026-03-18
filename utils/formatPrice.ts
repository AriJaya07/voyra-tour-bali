export type CurrencyCode = "IDR" | "USD";

// Approximate conversion rate — update as needed or fetch from an API
const IDR_TO_USD = 0.000063;
const USD_TO_IDR = 1 / IDR_TO_USD;

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
 * By default assumes `amount` is already in the target `currency` (no conversion).
 * Pass `sourceCurrency` when the amount is in a different currency and needs converting.
 */
export function formatPrice(
  amount: number,
  currency: CurrencyCode = "IDR",
  sourceCurrency?: CurrencyCode
): string {
  let value = amount;
  if (sourceCurrency && sourceCurrency !== currency) {
    if (sourceCurrency === "IDR" && currency === "USD") {
      value = amount * IDR_TO_USD;
    } else if (sourceCurrency === "USD" && currency === "IDR") {
      value = amount * USD_TO_IDR;
    }
  }
  return formatters[currency].format(value);
}
