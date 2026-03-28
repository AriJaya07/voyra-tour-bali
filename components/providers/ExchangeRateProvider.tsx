"use client";

import { useEffect } from "react";
import { useCurrency } from "@/utils/hooks/useCurrency";
import { useViatorExchangeRates } from "@/utils/hooks/useViator";

/**
 * Fetches Viator exchange rates once on app load
 * and stores them in the global currency store.
 *
 * Add this inside your root layout (alongside other providers).
 * It renders nothing — just syncs rates into Zustand.
 */
export default function ExchangeRateProvider() {
  const { data } = useViatorExchangeRates();
  const setExchangeRates = useCurrency((s) => s.setExchangeRates);

  useEffect(() => {
    if (data?.rates && Object.keys(data.rates).length > 0) {
      setExchangeRates(data.rates);
    }
  }, [data, setExchangeRates]);

  return null;
}
