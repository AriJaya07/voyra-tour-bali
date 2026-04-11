"use client";

import { BOOKING_FLOW_ORDER, BOOKING_STATUS_MAP } from "@/types/booking";
import type { BookingStatus } from "@/types/booking";

interface BookingFlowStepsProps {
  currentStatus: BookingStatus;
  variant?: "light" | "dark";
}

export default function BookingFlowSteps({ currentStatus, variant = "light" }: BookingFlowStepsProps) {
  if (currentStatus === "CANCELLED") {
    return (
      <div className={`text-center py-3 px-4 rounded-xl border ${
        variant === "dark"
          ? "bg-red-500/10 border-red-500/20 text-red-400"
          : "bg-red-50 border-red-200 text-red-700"
      }`}>
        <span className="text-sm font-bold">Booking Cancelled</span>
      </div>
    );
  }

  const currentIndex = BOOKING_FLOW_ORDER.indexOf(currentStatus);

  return (
    <div className="flex items-center justify-between gap-1">
      {BOOKING_FLOW_ORDER.map((step, i) => {
        const config = BOOKING_STATUS_MAP[step];
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;

        const baseCircle = variant === "dark"
          ? isDone
            ? "bg-green-500 text-white border-green-500"
            : isActive
              ? "bg-violet-500 text-white border-violet-500"
              : "bg-slate-800 text-slate-500 border-slate-700"
          : isDone
            ? "bg-green-500 text-white border-green-500"
            : isActive
              ? "bg-[#0071CE] text-white border-[#0071CE]"
              : "bg-gray-100 text-gray-400 border-gray-200";

        const labelColor = variant === "dark"
          ? isActive ? "text-white" : isDone ? "text-green-400" : "text-slate-500"
          : isActive ? "text-gray-900" : isDone ? "text-green-600" : "text-gray-400";

        const lineColor = variant === "dark"
          ? isDone ? "bg-green-500" : "bg-slate-700"
          : isDone ? "bg-green-500" : "bg-gray-200";

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm font-bold shrink-0 transition-all ${baseCircle}`}
              >
                {isDone ? "✓" : config.icon}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider text-center leading-tight ${labelColor}`}>
                {config.label}
              </span>
            </div>
            {i < BOOKING_FLOW_ORDER.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 rounded-full mt-[-18px] ${lineColor}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
