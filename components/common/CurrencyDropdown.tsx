"use client";

import { useState, useRef, useEffect } from "react";
import { useCurrency } from "@/utils/hooks/useCurrency";
import { SUPPORTED_CURRENCIES, CURRENCY_LABELS, CURRENCY_SYMBOLS, type CurrencyCode } from "@/utils/formatPrice";
import { ChevronDownIcon } from "@/components/assets/Icon/NavIcons";

interface Props {
  variant?: "desktop" | "mobile";
}

export default function CurrencyDropdown({ variant = "desktop" }: Props) {
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

  const isMobile = variant === "mobile";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          isMobile
            ? "flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 text-xs font-medium cursor-pointer"
            : "flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 hover:border-[#0071CE] transition text-xs font-medium cursor-pointer"
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select currency"
      >
        {/* <span className="font-bold text-[#0071CE]">{CURRENCY_SYMBOLS[currency]}</span> */}
        <span className="font-semibold text-gray-700 pr-3">{currency}</span>
        <ChevronDownIcon className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute right-0 top-full mt-2 z-50 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden`}
        >
          {SUPPORTED_CURRENCIES.map((c: CurrencyCode) => (
            <button
              key={c}
              role="option"
              aria-selected={c === currency}
              onClick={() => {
                setCurrency(c);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-blue-50 transition ${
                c === currency ? "bg-blue-50 font-bold text-[#0071CE]" : "text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-6 inline-block">{CURRENCY_SYMBOLS[c]}</span>
                <span>{c}</span>
              </span>
              <span className="text-xs text-gray-400 truncate">{CURRENCY_LABELS[c]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
