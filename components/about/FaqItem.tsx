"use client";

import { useState } from "react";

interface FaqItemProps {
  question: string;
  answer: string;
}

export default function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`border rounded-2xl transition-all duration-300 ${
        open
          ? "border-[#0071CE]/30 bg-blue-50/30 shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer"
      >
        <span
          className={`text-sm sm:text-base font-semibold pr-4 transition-colors duration-200 ${
            open ? "text-[#0071CE]" : "text-gray-900"
          }`}
        >
          {question}
        </span>
        <span
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            open
              ? "bg-[#0071CE] text-white rotate-180"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-5 text-sm text-gray-600 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}
