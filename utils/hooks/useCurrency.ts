"use client";

import { create } from "zustand";
import type { CurrencyCode } from "@/utils/formatPrice";

interface CurrencyStore {
  currency: CurrencyCode;
  /** Viator exchange rates relative to USD base (e.g. { USD: 1, IDR: 15850 }) */
  exchangeRates: Record<string, number> | null;
  setCurrency: (c: CurrencyCode) => void;
  setExchangeRates: (rates: Record<string, number>) => void;
  /** Cycle USD ↔ IDR (legacy convenience) */
  toggle: () => void;
}

export const useCurrency = create<CurrencyStore>()((set, get) => ({
  currency: "IDR",
  exchangeRates: null,
  setCurrency: (currency) => set({ currency }),
  setExchangeRates: (exchangeRates) => set({ exchangeRates }),
  toggle: () => set({ currency: get().currency === "IDR" ? "USD" : "IDR" }),
}));
