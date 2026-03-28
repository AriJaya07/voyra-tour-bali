"use client";

import { useCallback } from "react";
import { useCurrency } from "@/utils/hooks/useCurrency";
import { formatPrice, type CurrencyCode } from "@/utils/formatPrice";

/**
 * Hook that returns a formatPrice function pre-wired
 * with the current currency and Viator exchange rates.
 *
 * Usage:
 *   const fmt = useFormatPrice()
 *   fmt(450000)                    // formats in current currency
 *   fmt(29.99, "USD")              // converts from USD to current currency
 */
export function useFormatPrice() {
  const { currency, exchangeRates } = useCurrency();

  return useCallback(
    (amount: number, sourceCurrency?: CurrencyCode) =>
      formatPrice(amount, currency, sourceCurrency, exchangeRates),
    [currency, exchangeRates]
  );
}
