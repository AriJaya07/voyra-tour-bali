"use client";

import type React from "react";
import type { ViatorPaymentAccount } from "@/types/bookingFlow";
import { PaymentIcon, CheckmarkIcon, BankIcon, ChatBubbleIcon } from "@/components/assets/Icon/shared";

interface PaymentSelectorProps {
  methods: ViatorPaymentAccount[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  CARD: (
    <PaymentIcon className="w-6 h-6" strokeWidth={1.5} />
  ),
  PAYPAL: <ChatBubbleIcon className="w-6 h-6" />,
  BANK_TRANSFER: <BankIcon className="w-6 h-6" />,
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
          <PaymentIcon className="w-4 h-4 text-[#0071CE]" />
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
                <CheckmarkIcon className="w-5 h-5 text-[#0071CE] shrink-0" strokeWidth={2.5} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
