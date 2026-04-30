export const SUPPORTED_CURRENCIES = ["USD", "IDR", "AUD", "EUR", "SGD", "GBP", "JPY", "CNY"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  IDR: "Rp",
  AUD: "A$",
  EUR: "€",
  SGD: "S$",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
};

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: "US Dollar",
  IDR: "Indonesian Rupiah",
  AUD: "Australian Dollar",
  EUR: "Euro",
  SGD: "Singapore Dollar",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  CNY: "Chinese Yuan",
};

const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  USD: "en-US",
  IDR: "id-ID",
  AUD: "en-AU",
  EUR: "de-DE",
  SGD: "en-SG",
  GBP: "en-GB",
  JPY: "ja-JP",
  CNY: "zh-CN",
};

// Fallback rates relative to USD (used when Viator rates aren't loaded)
const FALLBACK_USD_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  IDR: 15850,
  AUD: 1.52,
  EUR: 0.92,
  SGD: 1.34,
  GBP: 0.79,
  JPY: 152,
  CNY: 7.2,
};

const isZeroDecimal = (c: CurrencyCode) => c === "IDR" || c === "JPY";

const formatterFor = (c: CurrencyCode): Intl.NumberFormat => {
  const decimals = isZeroDecimal(c) ? 0 : 2;
  return new Intl.NumberFormat(CURRENCY_LOCALES[c], {
    style: "currency",
    currency: c,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatterCache: Partial<Record<CurrencyCode, Intl.NumberFormat>> = {};

function getFormatter(c: CurrencyCode): Intl.NumberFormat {
  if (!formatterCache[c]) formatterCache[c] = formatterFor(c);
  return formatterCache[c]!;
}

function rateFor(c: CurrencyCode, liveRates?: Record<string, number> | null): number {
  if (liveRates && liveRates[c]) return liveRates[c];
  return FALLBACK_USD_RATES[c];
}

/**
 * Format a number as a currency string.
 *
 * @param amount        - The price value
 * @param currency      - Target display currency
 * @param sourceCurrency - Original currency of the amount (if different, will convert)
 * @param liveRates     - Viator exchange rates relative to USD base (e.g. { USD: 1, IDR: 15850 })
 */
export function formatPrice(
  amount: number,
  currency: CurrencyCode = "USD",
  sourceCurrency?: CurrencyCode,
  liveRates?: Record<string, number> | null
): string {
  let value = amount;

  if (sourceCurrency && sourceCurrency !== currency) {
    const sourceToUsd = 1 / rateFor(sourceCurrency, liveRates);
    const usdToTarget = rateFor(currency, liveRates);
    value = amount * sourceToUsd * usdToTarget;
  }

  return getFormatter(currency).format(value);
}

export function isCurrencyCode(v: unknown): v is CurrencyCode {
  return typeof v === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(v);
}
