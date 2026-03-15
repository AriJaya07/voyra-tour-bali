"use client";

import { useCurrency } from "@/utils/hooks/useCurrency";

interface CurrencySwitchProps {
  size?: "sm" | "md";
}

export default function CurrencySwitch({ size = "md" }: CurrencySwitchProps) {
  const { currency, setCurrency } = useCurrency();

  const isSmall = size === "sm";
  const btnBase = isSmall
    ? "px-2.5 py-1 text-xs font-semibold rounded-lg"
    : "px-3.5 py-1.5 text-sm font-bold rounded-xl";

  return (
    <div className="inline-flex items-center bg-gray-100 rounded-xl p-0.5 gap-0.5">
      <button
        onClick={() => setCurrency("IDR")}
        className={`${btnBase} transition-all ${
          currency === "IDR"
            ? "bg-white text-blue-600 shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        Rp IDR
      </button>
      <button
        onClick={() => setCurrency("USD")}
        className={`${btnBase} transition-all ${
          currency === "USD"
            ? "bg-white text-green-600 shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        $ USD
      </button>
    </div>
  );
}
