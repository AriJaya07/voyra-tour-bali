"use client";

import { create } from "zustand";
import type { CurrencyCode } from "@/utils/formatPrice";

interface CurrencyStore {
  currency: CurrencyCode;
  /** Viator exchange rates (e.g. { USD: 1, IDR: 15850 }) */
  exchangeRates: Record<string, number> | null;
  setCurrency: (c: CurrencyCode) => void;
  setExchangeRates: (rates: Record<string, number>) => void;
  toggle: () => void;
}

export const useCurrency = create<CurrencyStore>((set) => ({
  currency: "IDR",
  exchangeRates: null,
  setCurrency: (currency) => set({ currency }),
  setExchangeRates: (exchangeRates) => set({ exchangeRates }),
  toggle: () =>
    set((s) => ({ currency: s.currency === "IDR" ? "USD" : "IDR" })),
}));
