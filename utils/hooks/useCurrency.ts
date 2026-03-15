"use client";

import { create } from "zustand";
import type { CurrencyCode } from "@/utils/formatPrice";

interface CurrencyStore {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  toggle: () => void;
}

export const useCurrency = create<CurrencyStore>((set) => ({
  currency: "IDR",
  setCurrency: (currency) => set({ currency }),
  toggle: () =>
    set((s) => ({ currency: s.currency === "IDR" ? "USD" : "IDR" })),
}));
