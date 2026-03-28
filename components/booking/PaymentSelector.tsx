"use client";

import type React from "react";
import type { ViatorPaymentAccount } from "@/types/bookingFlow";

interface PaymentSelectorProps {
  methods: ViatorPaymentAccount[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  CARD: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  PAYPAL: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
    </svg>
  ),
  BANK_TRANSFER: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
};

export default function PaymentSelector({
  methods,
  selectedId,
  onSelect,
  disabled = false,
}: PaymentSelectorProps) {
  if (!methods.length) return null;

  return (
    <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900">Select Payment Method</h2>
      </div>

      <div className="space-y-3">
        {methods.map((method) => {
          const isSelected = selectedId === method.id;
          const icon = PAYMENT_ICONS[method.type] || PAYMENT_ICONS.CARD;

          return (
            <button
              key={method.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(method.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? "border-[#0071CE] bg-[#0071CE]/5 ring-2 ring-[#0071CE]/20"
                  : "border-gray-200 hover:border-[#0071CE]/40"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {/* Radio indicator */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "border-[#0071CE] bg-[#0071CE]"
                    : "border-gray-300"
                }`}
              >
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>

              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected
                    ? "bg-[#0071CE]/10 text-[#0071CE]"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {icon}
              </div>

              {/* Label */}
              <div className="flex-1">
                <p
                  className={`text-sm font-bold ${
                    isSelected ? "text-[#0071CE]" : "text-gray-900"
                  }`}
                >
                  {method.label || method.type}
                </p>
                {method.currencyCode && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {method.currencyCode}
                  </p>
                )}
              </div>

              {/* Selected check */}
              {isSelected && (
                <svg className="w-5 h-5 text-[#0071CE] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
