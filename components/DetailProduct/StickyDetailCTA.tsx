"use client";

import { useEffect, useState } from "react";
import { formatPrice, type CurrencyCode } from "@/utils/formatPrice";
import { useCurrency } from "@/utils/hooks/useCurrency";
import WishlistButton from "@/components/common/WishlistButton";

interface Props {
  price: number;
  sourceCurrency?: CurrencyCode;
  productCode: string;
  source: "viator" | "local" | "tourcms";
  title: string;
  imageUrl?: string;
  href?: string;
  /** CSS selector to scroll to when "Book Now" is clicked. Default: "#booking-widget" */
  scrollTarget?: string;
}

export default function StickyDetailCTA({
  price,
  sourceCurrency = "IDR",
  productCode,
  source,
  title,
  imageUrl,
  href,
  scrollTarget = "#booking-widget",
}: Props) {
  const { currency, exchangeRates } = useCurrency();
  const [showAfterScroll, setShowAfterScroll] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowAfterScroll(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onBook = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.querySelector(scrollTarget);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div
      className={`lg:hidden fixed left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-transform duration-300 ${
        showAfterScroll ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ bottom: "calc(56px + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <WishlistButton
          size="sm"
          item={{ productCode, source, title, imageUrl, price, currency: sourceCurrency, href }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 leading-none">From</p>
          <p className="text-base font-black text-gray-900 leading-tight">
            {price > 0 ? formatPrice(price, currency, sourceCurrency, exchangeRates) : "Check price"}
          </p>
        </div>
        <button
          onClick={onBook}
          className="px-5 py-3 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-xl shadow-sm whitespace-nowrap"
        >
          Check Availability
        </button>
      </div>
    </div>
  );
}
