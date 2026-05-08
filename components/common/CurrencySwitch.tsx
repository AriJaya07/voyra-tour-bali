"use client";

import { useState, useRef, useEffect } from "react";
import { useCurrency } from "@/utils/hooks/useCurrency";
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_LABELS,
  CURRENCY_SYMBOLS,
  type CurrencyCode,
} from "@/utils/formatPrice";

interface CurrencySwitchProps {
  size?: "sm" | "md";
}

/**
 * Compact currency picker shown next to prices in booking widgets. Updates the
 * global Zustand currency store, so every other price-render site reacts.
 * Shows all SUPPORTED_CURRENCIES (8) — formerly an IDR/USD-only toggle.
 */
export default function CurrencySwitch({ size = "md" }: CurrencySwitchProps) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const isSmall = size === "sm";
  const btnClass = isSmall
    ? "px-2.5 py-1 text-xs font-semibold rounded-lg"
    : "px-3.5 py-1.5 text-sm font-bold rounded-xl";

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select currency"
        className={`${btnClass} inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all cursor-pointer`}
      >
        <span className="font-semibold tabular-nums">{currency}</span>
        <span className="text-gray-400 text-[10px]">▾</span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1 z-50 w-44 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden"
        >
          {SUPPORTED_CURRENCIES.map((c: CurrencyCode) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={c === currency}
              onClick={() => {
                setCurrency(c);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition ${
                c === currency ? "bg-blue-50 font-bold text-[#0071CE]" : "text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-5 inline-block tabular-nums">{CURRENCY_SYMBOLS[c]}</span>
                <span>{c}</span>
              </span>
              <span className="text-[10px] text-gray-400 truncate">{CURRENCY_LABELS[c]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
